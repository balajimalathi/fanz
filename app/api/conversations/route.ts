import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { getOrCreateConversation, getConversationByServiceOrder } from "@/lib/db/conversations";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const serviceOrderId = searchParams.get("serviceOrderId");

    if (!serviceOrderId) {
      return NextResponse.json(
        { error: "serviceOrderId is required" },
        { status: 400 }
      );
    }

    const conversation = await getConversationByServiceOrder(serviceOrderId);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Verify user is part of this conversation
    if (conversation.creatorId !== session.user.id && conversation.fanId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { serviceOrderId } = body;

    if (!serviceOrderId) {
      return NextResponse.json(
        { error: "serviceOrderId is required" },
        { status: 400 }
      );
    }

    const conversation = await getOrCreateConversation(serviceOrderId);

    // Verify user is part of this conversation
    if (conversation.creatorId !== session.user.id && conversation.fanId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

