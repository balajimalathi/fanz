"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Check, CheckCheck } from "lucide-react";
import Image from "next/image";

interface MessageBubbleProps {
  id: string;
  senderId: string;
  currentUserId: string;
  messageType: "text" | "image" | "audio" | "video";
  content?: string | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  readAt: Date | null;
  createdAt: Date;
  senderName: string;
  senderImage?: string | null;
}

export function MessageBubble({
  senderId,
  currentUserId,
  messageType,
  content,
  mediaUrl,
  thumbnailUrl,
  readAt,
  createdAt,
  senderName,
  senderImage,
}: MessageBubbleProps) {
  const isOwn = senderId === currentUserId;

  return (
    <div className={cn("flex gap-2 mb-4", isOwn && "flex-row-reverse")}>
      {!isOwn && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={senderImage || undefined} alt={senderName} />
          <AvatarFallback>{senderName.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      )}
      <div className={cn("flex flex-col gap-1 max-w-[70%]", isOwn && "items-end")}>
        {!isOwn && (
          <span className="text-xs text-muted-foreground px-2">{senderName}</span>
        )}
        <div
          className={cn(
            "rounded-lg px-4 py-2",
            isOwn
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {messageType === "text" && <p className="break-words">{content}</p>}
          {messageType === "image" && mediaUrl && (
            <div className="relative max-w-sm">
              <Image
                src={mediaUrl}
                alt="Message image"
                width={400}
                height={400}
                className="rounded-lg object-contain"
                unoptimized
              />
            </div>
          )}
          {messageType === "audio" && mediaUrl && (
            <audio controls className="w-full max-w-xs">
              <source src={mediaUrl} />
              Your browser does not support audio playback.
            </audio>
          )}
          {messageType === "video" && mediaUrl && (
            <video
              controls
              className="max-w-sm rounded-lg"
              poster={thumbnailUrl || undefined}
            >
              <source src={mediaUrl} />
              Your browser does not support video playback.
            </video>
          )}
        </div>
        <div className={cn("flex items-center gap-1 px-2 text-xs text-muted-foreground", isOwn && "flex-row-reverse")}>
          <span>{formatDistanceToNow(createdAt, { addSuffix: true })}</span>
          {isOwn && (
            <span>
              {readAt ? (
                <CheckCheck className="h-3 w-3 text-blue-500" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

