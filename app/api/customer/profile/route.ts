import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { customers, subscriptions, membership } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET - Fetch customer profile with subscriptions
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user record to find email
    const userRecord = await db.query.user.findFirst({
      where: (u, { eq: eqOp }) => eqOp(u.id, session.user.id),
    });

    if (!userRecord) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Find customer record by email
    const customerRecord = await db.query.customers.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.email, userRecord.email),
    });

    if (!customerRecord) {
      // Return empty profile if customer record doesn't exist
      return NextResponse.json({
        customer: {
          name: userRecord.name,
          email: userRecord.email,
        },
        subscriptions: [],
      });
    }

    // Get all subscriptions for this customer
    const allSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.customerId, customerRecord.id));

    // Get membership details for each subscription
    const subscriptionsWithMemberships = await Promise.all(
      allSubscriptions.map(async (sub) => {
        try {
          // planId should match membership.id (planId is stored as string, membership.id is uuid)
          // Try to find membership by converting planId to uuid format
          const membershipRecord = await db.query.membership.findFirst({
            where: (m, { eq: eqOp }) => eqOp(m.id, sub.planId as any),
          });

          return {
            id: sub.id,
            planId: sub.planId,
            status: sub.status,
            currentPeriodStart: sub.currentPeriodStart,
            currentPeriodEnd: sub.currentPeriodEnd,
            createdAt: sub.createdAt,
            membership: membershipRecord
              ? {
                  id: membershipRecord.id,
                  title: membershipRecord.title,
                  description: membershipRecord.description,
                  monthlyRecurringFee: membershipRecord.monthlyRecurringFee,
                  coverImageUrl: membershipRecord.coverImageUrl,
                }
              : null,
          };
        } catch (error) {
          console.error(`Error fetching membership for planId ${sub.planId}:`, error);
          return {
            id: sub.id,
            planId: sub.planId,
            status: sub.status,
            currentPeriodStart: sub.currentPeriodStart,
            currentPeriodEnd: sub.currentPeriodEnd,
            createdAt: sub.createdAt,
            membership: null,
          };
        }
      })
    );

    return NextResponse.json({
      customer: {
        name: customerRecord.name || userRecord.name,
        email: customerRecord.email,
      },
      subscriptions: subscriptionsWithMemberships,
    });
  } catch (error) {
    console.error("Error fetching customer profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

