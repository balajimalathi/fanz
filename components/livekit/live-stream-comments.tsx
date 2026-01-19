"use client";

import { useState, useEffect, useRef } from "react";
import { useRoomContext, useLocalParticipant } from "@livekit/components-react";
import { DataPacket_Kind, RemoteParticipant } from "livekit-client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Send, Heart } from "lucide-react";
import { useSession } from "@/lib/auth/auth-client";

interface Comment {
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
  participantIdentity: string;
  type?: "comment" | "tip";
  coins?: number;
}

interface LiveStreamCommentsProps {
  streamId: string;
  creatorId: string;
  currentUserId: string;
  showKickButton?: boolean;
  showTipButton?: boolean;
  onTipClick?: () => void;
}

export function LiveStreamComments({
  streamId,
  creatorId,
  currentUserId,
  showKickButton = false,
  showTipButton = false,
  onTipClick,
}: LiveStreamCommentsProps) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [kickingUserId, setKickingUserId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isCreator = currentUserId === creatorId;

  // Auto-scroll to bottom when new comments arrive (only within ScrollArea)
  useEffect(() => {
    // Use setTimeout to ensure DOM is updated
    const timeoutId = setTimeout(() => {
      if (scrollContainerRef.current) {
        // Find the ScrollArea viewport element
        const viewport = scrollContainerRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
        if (viewport) {
          // Only scroll if we're near the bottom (within 100px) to avoid interrupting user scrolling
          const isNearBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 100;
          if (isNearBottom || comments.length <= 1) {
            viewport.scrollTo({
              top: viewport.scrollHeight,
              behavior: "smooth",
            });
          }
        }
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [comments]);

  // Listen for incoming data (comments)
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (
      payload: Uint8Array,
      participant?: RemoteParticipant | undefined,
      kind?: DataPacket_Kind,
      topic?: string | undefined
    ) => {
      try {
        const decoder = new TextDecoder();
        const data = JSON.parse(decoder.decode(payload));

        if (data.type === "comment" && data.userId && data.message) {
          const newComment: Comment = {
            userId: data.userId,
            userName: data.userName || "Anonymous",
            message: data.message,
            timestamp: data.timestamp || Date.now(),
            participantIdentity: participant?.identity || data.userId,
            type: "comment",
          };

          setComments((prev) => [...prev, newComment]);
        } else if (data.type === "tip" && data.userId) {
          const newTip: Comment = {
            userId: data.userId,
            userName: data.userName || "Anonymous",
            message: "",
            timestamp: data.timestamp || Date.now(),
            participantIdentity: participant?.identity || data.userId,
            type: "tip",
            coins: data.coins,
          };

          setComments((prev) => [...prev, newTip]);
        }
      } catch (error) {
        console.error("Error parsing comment data:", error);
      }
    };

    room.on("dataReceived", handleDataReceived);

    return () => {
      room.off("dataReceived", handleDataReceived);
    };
  }, [room]);

  const handleSendComment = async () => {
    if (!commentText.trim() || !localParticipant || isSending) return;

    setIsSending(true);
    try {
      const commentData = {
        type: "comment",
        userId: currentUserId,
        userName: session?.user?.name || session?.user?.email || "User",
        message: commentText.trim(),
        timestamp: Date.now(),
      };

      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(commentData));

      await localParticipant.publishData(data, { reliable: true });

      // Add comment to local state immediately (optimistic update)
      const newComment: Comment = {
        userId: currentUserId,
        userName: session?.user?.name || session?.user?.email || "User",
        message: commentText.trim(),
        timestamp: Date.now(),
        participantIdentity: currentUserId,
        type: "comment",
      };

      setComments((prev) => [...prev, newComment]);
      setCommentText("");
    } catch (error) {
      console.error("Error sending comment:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  };

  const handleKick = async (participantIdentity: string) => {
    if (!isCreator || !showKickButton) return;

    setKickingUserId(participantIdentity);

    try {
      const response = await fetch(`/api/live/${streamId}/kick`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ participantIdentity }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to kick participant");
      }
    } catch (error) {
      console.error("Error kicking participant:", error);
    } finally {
      setKickingUserId(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-full bg-background border-l overflow-hidden">
      {/* Header */}
      <div className="p-2 md:p-4 border-b shrink-0">
        <h3 className="text-xs md:text-sm font-semibold">Comments</h3>
      </div>

      {/* Comments List - Scrollable */}
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="p-2 md:p-4 space-y-2 md:space-y-3" ref={scrollAreaRef}>
            {comments.length === 0 ? (
              <div className="text-center text-muted-foreground text-xs md:text-sm py-4 md:py-8">
                No comments yet. Be the first to comment!
              </div>
            ) : (
              comments.map((comment, index) => (
                <div
                  key={`${comment.userId}-${comment.timestamp}-${index}`}
                  className="flex items-start gap-2 group"
                >
                  {comment.type === "tip" ? (
                    // Tip notification
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1">
                        <span className="text-xs md:text-sm font-medium text-pink-500">
                          {comment.userName}
                        </span>
                        <span className="text-[10px] md:text-xs text-muted-foreground">
                          {formatTime(comment.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs md:text-sm [word-break:break-word] text-pink-400">
                        💝 tipped {comment.coins} coins
                      </p>
                    </div>
                  ) : (
                    // Regular comment
                    <>
                      <Avatar className="h-6 w-6 md:h-8 md:w-8 shrink-0">
                        <AvatarFallback className="text-[10px] md:text-xs">
                          {getInitials(comment.userName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1">
                          <span className="text-xs md:text-sm font-medium">
                            {comment.userId === creatorId ? (
                              <span className="text-primary">{comment.userName} (Creator)</span>
                            ) : (
                              comment.userName
                            )}
                          </span>
                          <span className="text-[10px] md:text-xs text-muted-foreground">
                            {formatTime(comment.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs md:text-sm [word-break:break-word]">{comment.message}</p>
                      </div>
                      {isCreator && showKickButton && comment.userId !== creatorId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={() => handleKick(comment.participantIdentity)}
                          disabled={kickingUserId === comment.participantIdentity}
                          title="Kick user"
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ))
            )}
            <div ref={commentsEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Comment Input and Tip Button - Fixed at bottom */}
      <div className="shrink-0 border-t bg-background">
        {/* Comment Input */}
        <div className="p-2 md:p-4 border-b">
          <div className="flex gap-2">
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a comment..."
              disabled={isSending}
              className="flex-1 text-xs md:text-sm h-8 md:h-10"
              onFocus={(e) => {
                // Prevent page scroll when input is focused
                e.target.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }}
            />
            <Button
              onClick={handleSendComment}
              disabled={!commentText.trim() || isSending}
              size="icon"
              className="h-8 w-8 md:h-10 md:w-10 shrink-0"
            >
              <Send className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
          </div>
        </div>

        {/* Tip Button */}
        {showTipButton && onTipClick && (
          <div className="p-2 md:p-4">
            <Button
              onClick={onTipClick}
              className="w-full bg-pink-600 hover:bg-pink-700 text-xs md:text-base h-9 md:h-12"
            >
              <Heart className="h-3 w-3 md:h-4 md:w-4 mr-2" />
              Send Tip
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
