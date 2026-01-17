import { NextRequest, NextResponse } from "next/server";
import { CreatorPricingService } from "@/lib/services/creator-pricing-service";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { creator } from "@/lib/db/schema";

// GET - Get creator's pricing settings (public endpoint for fans, by username)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    // Resolve username to creatorId
    const creatorRecord = await db.query.creator.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.username, username.toLowerCase()),
      columns: {
        id: true,
      },
    });

    if (!creatorRecord) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404 }
      );
    }

    const pricing = await CreatorPricingService.getOrCreatePricing(
      creatorRecord.id
    );

    return NextResponse.json(pricing);
  } catch (error) {
    console.error("Error fetching creator pricing:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
