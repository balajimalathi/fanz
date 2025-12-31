"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { TypingIndicator } from "./typing-indicator";

interface Message {
  id: string;
  senderId: string;
  content: string | null;
  messageType: "text" | "audio" | "image" | "video";
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  createdAt: string;
}

interface ChatInterfaceProps {
  conversationId: string;
  currentUserId: string;
  otherUserName: string;
  otherUserImage?: string | null;
}

export function ChatInterface({
  conversationId,
  currentUserId,
  otherUserName,
  otherUserImage,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUser, setTypingUser] = useState<{ userId: string; userName: string } | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second
  const typingDebounceDelay = 300; // 300ms debounce
  const typingTimeoutDelay = 3000; // 3 seconds timeout

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/conversations/${conversationId}/messages`);
        if (!response.ok) throw new Error("Failed to fetch messages");
        const data = await response.json();
        setMessages(data);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    if (conversationId) {
      fetchMessages();
    }
  }, [conversationId]);

  // Set up SSE connection for real-time updates
  useEffect(() => {
    if (!conversationId) return;

    const connectSSE = () => {
      // Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      try {
        const eventSource = new EventSource(
          `/api/conversations/${conversationId}/messages/stream`
        );
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;
        };

        eventSource.addEventListener("connected", () => {
          setIsConnected(true);
        });

        eventSource.addEventListener("message", (event) => {
          try {
            const newMessage: Message = JSON.parse(event.data);
            // Only add message if it doesn't already exist (prevent duplicates)
            setMessages((prev) => {
              const exists = prev.some((msg) => msg.id === newMessage.id);
              if (exists) {
                return prev;
              }
              return [...prev, newMessage];
            });
          } catch (error) {
            console.error("Error parsing SSE message:", error);
          }
        });

        eventSource.addEventListener("heartbeat", () => {
          // Heartbeat received, connection is alive
        });

        eventSource.addEventListener("typing", (event) => {
          try {
            const typingEvent: { userId: string; userName: string; timestamp: number } = JSON.parse(event.data);
            // Only show typing indicator for other users
            if (typingEvent.userId !== currentUserId) {
              setTypingUser({
                userId: typingEvent.userId,
                userName: typingEvent.userName,
              });
              
              // Clear existing timeout
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }
              
              // Set timeout to clear typing indicator
              typingTimeoutRef.current = setTimeout(() => {
                setTypingUser(null);
              }, typingTimeoutDelay);
            }
          } catch (error) {
            console.error("Error parsing SSE typing event:", error);
          }
        });

        eventSource.addEventListener("error", (error) => {
          console.error("SSE error:", error);
          setIsConnected(false);
          eventSource.close();

          // Attempt reconnection with exponential backoff
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay =
              baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
            reconnectAttemptsRef.current++;

            reconnectTimeoutRef.current = setTimeout(() => {
              connectSSE();
            }, delay);
          } else {
            console.error("Max reconnection attempts reached");
          }
        });

        eventSource.onerror = () => {
          setIsConnected(false);
        };
      } catch (error) {
        console.error("Error setting up SSE connection:", error);
        setIsConnected(false);
      }
    };

    connectSSE();

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current);
        typingDebounceRef.current = null;
      }
      setIsConnected(false);
    };
  }, [conversationId, currentUserId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    // Use requestAnimationFrame and setTimeout to ensure DOM is fully updated
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        // Try multiple methods to find and scroll the viewport
        // Method 1: Try data attribute (Radix ScrollArea)
        let viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
        
        // Method 2: Try finding by role or class
        if (!viewport) {
          viewport = scrollAreaRef.current.querySelector('div[style*="overflow"]') as HTMLElement;
        }
        
        // Method 3: Try finding the first scrollable div
        if (!viewport) {
          const divs = scrollAreaRef.current.querySelectorAll('div');
          for (const div of Array.from(divs)) {
            if (div.scrollHeight > div.clientHeight) {
              viewport = div;
              break;
            }
          }
        }
        
        if (viewport) {
          // Scroll the viewport to bottom
          viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior: "smooth",
          });
        } else {
          // Fallback: use scrollIntoView on anchor element
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      } else {
        // Fallback: use scrollIntoView on anchor element
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    };
    
    // Use requestAnimationFrame to ensure layout is complete, then delay for DOM update
    requestAnimationFrame(() => {
      setTimeout(scrollToBottom, 150);
    });
  }, [messages, typingUser]);

  // Send typing event (debounced)
  const sendTypingEvent = async () => {
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
    }

    typingDebounceRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/conversations/${conversationId}/typing`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
      } catch (error) {
        console.error("Error sending typing event:", error);
      }
    }, typingDebounceDelay);
  };

  // Handle input change with typing detection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (e.target.value.trim()) {
      sendTypingEvent();
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Clear typing indicator when sending message
    setTypingUser(null);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
    }

    const messageContent = inputValue.trim();
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: messageContent,
          messageType: "text",
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const newMessage = await response.json();
      // Message will be added via SSE, but add it optimistically for immediate UI update
      setMessages((prev) => {
        const exists = prev.some((msg) => msg.id === newMessage.id);
        if (exists) {
          return prev;
        }
        return [...prev, newMessage];
      });
    } catch (error) {
      console.error("Error sending message:", error);
      setInputValue(messageContent); // Restore input on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => {
            const isOwn = message.senderId === currentUserId;
            return (
              <div
                key={message.id}
                className={`flex gap-2 ${isOwn ? "justify-end" : "justify-start"}`}
              >
                {!isOwn && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={otherUserImage || undefined} />
                    <AvatarFallback>
                      {otherUserName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    isOwn
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.content && <p className="text-sm">{message.content}</p>}
                  {message.mediaUrl && (
                    <div className="mt-2">
                      {message.messageType === "image" && (
                        <img
                          src={message.mediaUrl}
                          alt=""
                          className="rounded max-w-full h-auto"
                        />
                      )}
                      {message.messageType === "video" && (
                        <video
                          src={message.mediaUrl}
                          controls
                          className="rounded max-w-full h-auto"
                        />
                      )}
                    </div>
                  )}
                  <p
                    className={`text-xs mt-1 ${
                      isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    {formatDistanceToNow(new Date(message.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                {isOwn && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>You</AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })}
          {typingUser && (
            <TypingIndicator userName={typingUser.userName} />
          )}
          {/* Bottom anchor for auto-scroll */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t p-4">
        <form onSubmit={sendMessage} className="flex gap-2">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Type a message..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !inputValue.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

