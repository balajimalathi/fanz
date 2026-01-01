import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { conversation } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { uploadToR2 } from "@/lib/storage/r2";
import { generateThumbnail } from "@/lib/utils/image-processing-server";

// POST - Upload media files for a conversation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: conversationId } = await params;

    // Verify conversation exists and user has access
    const conv = await db.query.conversation.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, conversationId),
    });

    if (!conv) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const userId = session.user.id;
    if (conv.creatorId !== userId && conv.fanId !== userId) {
      return NextResponse.json(
        { error: "Forbidden: You don't have access to this conversation" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Determine message type and validate
    let messageType: "image" | "video" | "audio";
    let maxSize: number;

    if (file.type.startsWith("image/")) {
      messageType = "image";
      maxSize = 10 * 1024 * 1024; // 10MB for images
    } else if (file.type.startsWith("video/")) {
      messageType = "video";
      maxSize = 5 * 1024 * 1024; // 5MB for videos
    } else if (file.type.startsWith("audio/")) {
      messageType = "audio";
      maxSize = 5 * 1024 * 1024; // 5MB for audio
    } else {
      return NextResponse.json(
        { error: "File must be an image, video, or audio file" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > maxSize) {
      return NextResponse.json(
        { 
          error: `File must be less than ${maxSize / (1024 * 1024)}MB`,
          maxSize,
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split(".").pop() || (messageType === "audio" ? "webm" : messageType === "video" ? "mp4" : "jpg");
    const filename = `${timestamp}-${randomStr}.${extension}`;

    // Generate thumbnail for images and videos
    let thumbnailUrl: string | null = null;
    if (messageType === "image" || messageType === "video") {
      try {
        const thumbnailBuffer = await generateThumbnail(buffer);
        const thumbnailFilename = `${timestamp}-${randomStr}-thumb.jpg`;
        const thumbnailKey = `${userId}/conversations/${conversationId}/media/thumbnails/${thumbnailFilename}`;
        thumbnailUrl = await uploadToR2({
          file: thumbnailBuffer,
          key: thumbnailKey,
          contentType: "image/jpeg",
        });
      } catch (error) {
        console.error("Error generating thumbnail:", error);
        // Continue without thumbnail
      }
    }

    // Upload media file to R2
    const mediaKey = `${userId}/conversations/${conversationId}/media/${messageType === "image" ? "images" : messageType === "video" ? "videos" : "audio"}/${filename}`;
    const mediaUrl = await uploadToR2({
      file: buffer,
      key: mediaKey,
      contentType: file.type,
    });

    return NextResponse.json({
      success: true,
      mediaUrl,
      thumbnailUrl,
      messageType,
    });
  } catch (error) {
    console.error("Error uploading media:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

