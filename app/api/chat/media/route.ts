import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { uploadToR2 } from "@/lib/storage/r2";
import { z } from "zod";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// POST - Upload media for chat messages
export async function POST(request: NextRequest) {
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const conversationId = formData.get("conversationId") as string | null;
    const messageType = formData.get("messageType") as "image" | "audio" | "video" | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!messageType || !["image", "audio", "video"].includes(messageType)) {
      return NextResponse.json(
        { error: "Invalid message type. Must be image, audio, or video" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 50MB limit" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = {
      image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
      audio: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm"],
      video: ["video/mp4", "video/webm", "video/ogg", "video/quicktime"],
    };

    if (!allowedTypes[messageType].includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type for ${messageType}. Allowed: ${allowedTypes[messageType].join(", ")}` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split(".").pop() || "bin";
    const filename = `${timestamp}-${randomStr}.${extension}`;

    // Upload to R2
    const key = `${session.user.id}/chat/${conversationId || "temp"}/${filename}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const mediaUrl = await uploadToR2({
      file: buffer,
      key,
      contentType: file.type,
    });

    // Generate thumbnail for images/videos if needed
    let thumbnailUrl: string | null = null;
    if (messageType === "image" || messageType === "video") {
      // For now, return the same URL - thumbnail generation can be added later
      thumbnailUrl = mediaUrl;
    }

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

