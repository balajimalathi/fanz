import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { CreatorPricingService } from "@/lib/services/creator-pricing-service";
import { z } from "zod";

const pricingSchema = z.object({
  dmTextPrice: z.number().int().min(0).optional(),
  dmImagePrice: z.number().int().min(0).optional(),
  dmVideoPrice: z.number().int().min(0).optional(),
  audioCallPricePerMinute: z.number().int().min(0).optional(),
  videoCallPricePerMinute: z.number().int().min(0).optional(),
  liveStreamEntryPrice: z.number().int().min(0).optional(),
});

// GET - Get current pricing settings
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has creator role
    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Forbidden: Creator role required" },
        { status: 403 }
      );
    }

    const pricing = await CreatorPricingService.getOrCreatePricing(
      session.user.id
    );

    return NextResponse.json(pricing);
  } catch (error) {
    console.error("Error fetching pricing:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create/update pricing settings
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has creator role
    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Forbidden: Creator role required" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input
    const validationResult = pricingSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const updatedPricing = await CreatorPricingService.updatePricing(
      session.user.id,
      validationResult.data
    );

    return NextResponse.json(updatedPricing);
  } catch (error) {
    console.error("Error updating pricing:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
