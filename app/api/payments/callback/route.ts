import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/lib/payments/payment-service";
import { db } from "@/lib/db/client";
import { paymentTransaction } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { GatewayService } from "@/lib/payments/gateway/gateway-service";

/**
 * Builds a redirect URL preserving the original subdomain/origin.
 * If originUrl is absolute (starts with http:// or https://), uses it directly.
 * Otherwise, constructs the URL relative to the request origin.
 */
function buildRedirectUrl(originUrl: string, request: NextRequest): URL {
  // If originUrl is absolute, use it directly to preserve subdomain
  if (originUrl.startsWith('http://') || originUrl.startsWith('https://')) {
    return new URL(originUrl);
  }
  // If relative, try to get origin from request headers
  const origin = request.headers.get('origin') || request.headers.get('referer');
  if (origin) {
    const baseUrl = new URL(origin);
    return new URL(originUrl, baseUrl.origin);
  }
  // Fallback to request.url
  return new URL(originUrl, request.url);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("transactionId");
    const gatewayTransactionId = searchParams.get("gatewayTransactionId");
    const status = searchParams.get("status");

    if (!transactionId && !gatewayTransactionId) {
      return NextResponse.redirect(new URL("/payment-failed", request.url));
    }

    let transaction;

    if (transactionId) {
      transaction = await db.query.paymentTransaction.findFirst({
        where: (pt, { eq: eqOp }) => eqOp(pt.id, transactionId),
      });
    } else if (gatewayTransactionId) {
      transaction = await db.query.paymentTransaction.findFirst({
        where: (pt, { eq: eqOp }) => eqOp(pt.gatewayTransactionId, gatewayTransactionId),
      });
    }

    if (!transaction) {
      return NextResponse.redirect(new URL("/payment-failed", request.url));
    }

    // Extract originUrl and duration from transaction metadata
    const originUrl = transaction.metadata?.originUrl as string | undefined;
    const duration = transaction.metadata?.duration as number | undefined;

    // If status is provided in query params and is success/completed, process immediately
    if (status === "success" || status === "completed") {
      await PaymentService.processPaymentCompletion(transaction.id, "completed");
      
      // Redirect to originUrl with query params if available, otherwise default success page
      if (originUrl) {
        const redirectUrl = buildRedirectUrl(originUrl, request);
        redirectUrl.searchParams.set("status", "success");
        if (transaction.type === "membership") {
          redirectUrl.searchParams.set("membershipId", transaction.entityId);
          if (duration) {
            redirectUrl.searchParams.set("duration", duration.toString());
          }
        } else if (transaction.type === "service") {
          redirectUrl.searchParams.set("serviceId", transaction.entityId);
          redirectUrl.searchParams.set("transactionId", transaction.id);
            } else if (transaction.type === "exclusive_post") {
              redirectUrl.searchParams.set("postId", transaction.entityId);
              redirectUrl.searchParams.set("transactionId", transaction.id);
            } else if (transaction.type === "wallet_credit") {
              // Get plan type from metadata instead of entityId
              const planMetadata = transaction.metadata?.planMetadata as { planType?: string } | undefined;
              if (planMetadata?.planType) {
                redirectUrl.searchParams.set("planType", planMetadata.planType);
              }
              redirectUrl.searchParams.set("transactionId", transaction.id);
            }
            return NextResponse.redirect(redirectUrl);
      }
      return NextResponse.redirect(new URL("/payment-success", request.url));
    }

    // Check payment status with gateway
    if (transaction.gatewayTransactionId) {
      const statusResponse = await GatewayService.checkPaymentStatus(
        transaction.gatewayTransactionId
      );

      if (statusResponse.success) {
        const paymentStatus =
          statusResponse.status === "completed"
            ? "completed"
            : statusResponse.status === "failed"
              ? "failed"
              : "cancelled";

        await PaymentService.processPaymentCompletion(transaction.id, paymentStatus);

        if (paymentStatus === "completed") {
          // Redirect to originUrl with query params if available
          if (originUrl) {
            const redirectUrl = buildRedirectUrl(originUrl, request);
            redirectUrl.searchParams.set("status", "success");
            // Get actual payment type from metadata (since DB enum only stores "membership" or "service")
            const actualType = (transaction.metadata?.type as string) || transaction.type;
            
            if (actualType === "membership") {
              redirectUrl.searchParams.set("membershipId", transaction.entityId);
              if (duration) {
                redirectUrl.searchParams.set("duration", duration.toString());
              }
            } else if (actualType === "service") {
              redirectUrl.searchParams.set("serviceId", transaction.entityId);
              redirectUrl.searchParams.set("transactionId", transaction.id);
            } else if (actualType === "exclusive_post") {
              redirectUrl.searchParams.set("postId", transaction.entityId);
              redirectUrl.searchParams.set("transactionId", transaction.id);
            } else if (actualType === "live_stream") {
              redirectUrl.searchParams.set("streamId", transaction.entityId);
              redirectUrl.searchParams.set("transactionId", transaction.id);
            } else if (actualType === "wallet_credit") {
              // Get plan type from metadata instead of entityId
              const planMetadata = transaction.metadata?.planMetadata as { planType?: string } | undefined;
              if (planMetadata?.planType) {
                redirectUrl.searchParams.set("planType", planMetadata.planType);
              }
              redirectUrl.searchParams.set("transactionId", transaction.id);
            }
            return NextResponse.redirect(redirectUrl);
          }
          return NextResponse.redirect(new URL("/payment-success", request.url));
        } else if (paymentStatus === "failed" || paymentStatus === "cancelled") {
          // Redirect to originUrl with error status if available
          if (originUrl) {
            const redirectUrl = buildRedirectUrl(originUrl, request);
            redirectUrl.searchParams.set("status", "failed");
            return NextResponse.redirect(redirectUrl);
          }
          return NextResponse.redirect(new URL("/payment-failed", request.url));
        }
      }
    }

    // If status is pending, wait a bit and check gateway status again (for async updates)
    if (status === "pending" && transaction.gatewayTransactionId) {
      // Wait a bit for mock gateway to update status
      await new Promise(resolve => setTimeout(resolve, 1500));
      const statusResponse = await GatewayService.checkPaymentStatus(
        transaction.gatewayTransactionId
      );
      
      if (statusResponse.success && statusResponse.status === "completed") {
        await PaymentService.processPaymentCompletion(transaction.id, "completed");
        
        // Redirect to originUrl with query params if available
        if (originUrl) {
          const redirectUrl = buildRedirectUrl(originUrl, request);
          redirectUrl.searchParams.set("status", "success");
          if (transaction.type === "membership") {
            redirectUrl.searchParams.set("membershipId", transaction.entityId);
            if (duration) {
              redirectUrl.searchParams.set("duration", duration.toString());
            }
          } else if (transaction.type === "service") {
            redirectUrl.searchParams.set("serviceId", transaction.entityId);
            redirectUrl.searchParams.set("transactionId", transaction.id);
          } else if (transaction.type === "exclusive_post") {
            redirectUrl.searchParams.set("postId", transaction.entityId);
            redirectUrl.searchParams.set("transactionId", transaction.id);
          } else if (transaction.type === "wallet_credit") {
            // Get plan type from metadata instead of entityId
            const planMetadata = transaction.metadata?.planMetadata as { planType?: string } | undefined;
            if (planMetadata?.planType) {
              redirectUrl.searchParams.set("planType", planMetadata.planType);
            }
            redirectUrl.searchParams.set("transactionId", transaction.id);
          }
          return NextResponse.redirect(redirectUrl);
        }
        return NextResponse.redirect(new URL("/payment-success", request.url));
      }
    }

    // Redirect to originUrl with failed status if available
    if (originUrl) {
      const redirectUrl = buildRedirectUrl(originUrl, request);
      redirectUrl.searchParams.set("status", "failed");
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.redirect(new URL("/payment-failed", request.url));
  } catch (error) {
    console.error("Error processing payment callback:", error);
    return NextResponse.redirect(new URL("/payment-failed", request.url));
  }
}

