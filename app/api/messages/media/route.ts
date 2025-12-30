import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { uploadToR2 } from "@/lib/storage/r2";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const messageType = formData.get("messageType") as string;

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    if (!messageType || !["image", "audio", "video"].includes(messageType)) {
      return NextResponse.json(
        { error: "Valid messageType (image, audio, video) is required" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Generate unique file key
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split(".").pop() || "";
    const key = `messages/${session.user.id}/${timestamp}-${randomId}.${fileExtension}`;

    // Determine content type
    let contentType = file.type;
    if (!contentType) {
      if (messageType === "image") {
        contentType = fileExtension === "png" ? "image/png" : "image/jpeg";
      } else if (messageType === "audio") {
        contentType = "audio/mpeg";
      } else if (messageType === "video") {
        contentType = "video/mp4";
      }
    }

    // Upload to R2
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadToR2({
      file: fileBuffer,
      key,
      contentType: contentType || "application/octet-stream",
    });

    return NextResponse.json({
      url,
      key,
      messageType,
      size: file.size,
    });
  } catch (error) {
    console.error("Error uploading media:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

