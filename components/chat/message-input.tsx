"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Image as ImageIcon, Video, Mic, ArrowUpIcon, Plus, SendHorizonal, Loader2 } from "lucide-react";
import {
  InputGroup,
  InputGroupTextarea,
  InputGroupButton,
  InputGroupAddon,
  InputGroupText,
} from "@/components/ui/input-group";
import { useWebSocketContext } from "./websocket-provider";
import { ServiceOrderStatus } from "./service-order-status";

import { ConversationTimer } from "./conversation-timer";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../ui/dropdown-menu";
import { Separator } from "../ui/separator";

interface MessageInputProps {
  conversationId: string;
  isEnabled?: boolean;
  onMediaUpload?: (file: File, type: "image" | "audio" | "video") => Promise<string>;
  serviceOrderId?: string | null;
  userRole?: "creator" | "fan";
  isServicePending?: boolean;
  hasServiceOrder?: boolean;
  remainingTime?: number | null;
}

export function MessageInput({
  conversationId,
  isEnabled = true,
  onMediaUpload,
  serviceOrderId,
  userRole,
  isServicePending = false,
  hasServiceOrder = false,
  remainingTime = null,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { send, on } = useWebSocketContext();

  // Handle typing indicators
  const handleTypingStart = useCallback(() => {
    if (!isEnabled || isTyping) return;

    setIsTyping(true);
    send({
      type: "typing:start",
      timestamp: Date.now(),
      payload: {
        conversationId,
        userId: "", // Will be set by server
      },
    });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 3000);
  }, [conversationId, isEnabled, isTyping, send]);

  const handleTypingStop = useCallback(() => {
    setIsTyping((prev) => {
      if (!prev) return prev;
      
      send({
        type: "typing:stop",
        timestamp: Date.now(),
        payload: {
          conversationId,
          userId: "", // Will be set by server
        },
      });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      
      return false;
    });
  }, [conversationId, send]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    if (e.target.value.trim()) {
      handleTypingStart();
    } else {
      handleTypingStop();
    }
  };

  const handleSend = async () => {
    if (!isEnabled) {
      alert("This chat is not enabled yet. Please wait for the creator to enable it.");
      return;
    }
    if (!message.trim() && !isSending) return;

    handleTypingStop();
    const messageContent = message.trim();
    setMessage("");
    setIsSending(true);

    try {
      send({
        type: "message:send",
        timestamp: Date.now(),
        payload: {
          conversationId,
          messageType: "text",
          content: messageContent,
        },
      });
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping) {
        handleTypingStop();
      }
    };
  }, [isTyping, handleTypingStop]);

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement> | { target: { files: File[] | null } },
    explicitType?: "image" | "audio" | "video"
  ) => {
    const files = "files" in e.target && e.target.files ? e.target.files : (e.target as { files: File[] | null }).files;
    const file = files?.[0];
    if (!file || !onMediaUpload) return;

    let type: "image" | "audio" | "video";
    if (explicitType) {
      type = explicitType;
    } else if (file.type.startsWith("image/")) {
      type = "image";
    } else if (file.type.startsWith("audio/")) {
      type = "audio";
    } else if (file.type.startsWith("video/")) {
      type = "video";
    } else {
      return;
    }

    try {
      setIsSending(true);
      const mediaUrl = await onMediaUpload(file, type);

      send({
        type: "message:send",
        timestamp: Date.now(),
        payload: {
          conversationId,
          messageType: type,
          mediaUrl,
        },
      });
    } catch (error) {
      console.error("Error uploading media:", error);
    } finally {
      setIsSending(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="border-t bg-background shrink-0 mb-16 md:mb-0">
      <div className="p-3 sm:p-4 space-y-2">
        {/* Service order status */}
        {isServicePending && userRole && (
          <ServiceOrderStatus
            serviceOrderId={serviceOrderId || undefined}
            conversationId={conversationId}
            userRole={userRole ?? "creator"}
            isPending={isServicePending}
            hasServiceOrder={hasServiceOrder}
          />
        )}
        {/* Upload status indicator */}
        {isSending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Uploading...</span>
          </div>
        )}
        <InputGroup>
          <InputGroupTextarea value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              isEnabled 
                ? "Type a message..." 
                : remainingTime !== null && remainingTime <= 0
                  ? "Session expired"
                  : "Chat is disabled"
            }
            className="focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
            disabled={isSending || !isEnabled}
          />
          <InputGroupAddon align="block-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <InputGroupButton
                  variant="outline"
                  className="rounded-full"
                  disabled={isSending || !isEnabled}
                  size="icon-xs"
                >
                  <Plus />
                </InputGroupButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="[--radius:0.95rem]"
              >
                <DropdownMenuItem onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "video/*";
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file && onMediaUpload) {
                      handleFileSelect({ target: { files: [file] } } as any, "video");
                    }
                  };
                  input.click();
                }}
                  disabled={isSending || !isEnabled}>Video</DropdownMenuItem>
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}
                  disabled={isSending || !isEnabled}>Image</DropdownMenuItem>
                {/* <DropdownMenuItem>Manual</DropdownMenuItem> */}
              </DropdownMenuContent>
            </DropdownMenu>
            <InputGroupText className="ml-auto">
              <ConversationTimer
                type="service"
                initialSeconds={90}
                onExpire={() => {
                  console.log("Service time expired");
                }}
              />
            </InputGroupText>
            <Separator orientation="vertical" className="!h-4" />
            <InputGroupButton
              variant="default"
              className="rounded-full"
              size="icon-sm"
              onClick={handleSend}
              disabled={isSending || !message.trim() || !isEnabled}
              type="button"
            >
              <SendHorizonal className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </InputGroupButton>

          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}

