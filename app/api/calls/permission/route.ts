import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { getCallPermission } from "@/lib/utils/call-permissions";
import { z } from "zod";

const checkPermissionSchema = z.object({
  creatorId: z.string(),
});

// GET - Check call permission
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

    const searchParams = request.nextUrl.searchParams;
    const creatorId = searchParams.get("creatorId");

    if (!creatorId) {
      return NextResponse.json(
        { error: "creatorId is required" },
        { status: 400 }
      );
    }

    const permission = await getCallPermission(session.user.id, creatorId);

    return NextResponse.json({
      canCall: permission.canCall,
      cached: permission.cached,
    });
  } catch (error) {
    console.error("Error checking call permission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

