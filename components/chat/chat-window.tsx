"use client";

import { useEffect, useState } from "react";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { useWebSocketContext } from "./websocket-provider";
import { WebSocketMessage, ChatStartMessage, ChatAcceptMessage, ChatRejectMessage, ChatTimeoutMessage } from "@/lib/websocket/types";
import { useSession } from "@/lib/auth/auth-client";
import { ConversationTimer } from "./conversation-timer";

interface ChatWindowProps {
  conversationId: string;
  otherParticipant: {
    id: string;
    name: string;
    image?: string | null;
  };
  isEnabled?: boolean;
}

interface ServiceOrderInfo {
  hasServiceOrder: boolean;
  serviceOrder?: {
    id: string;
    status: string;
    utilizedAt: string | null;
  };
  service?: {
    id: string;
    name: string;
    serviceType: string;
    duration: number | null;
  };
  remainingTime: number | null;
}

export function ChatWindow({ conversationId, otherParticipant, isEnabled = true }: ChatWindowProps) {
  const { data: session } = useSession();
  const { send, on } = useWebSocketContext();
  const [senderInfo, setSenderInfo] = useState<Record<string, { name: string; image?: string | null }>>({});
  const [conversationEnabled, setConversationEnabled] = useState(isEnabled);
  const [serviceOrderInfo, setServiceOrderInfo] = useState<ServiceOrderInfo | null>(null);
  const [acceptanceWindowExpiresAt, setAcceptanceWindowExpiresAt] = useState<number | null>(null);
  const [isAcceptanceWindowActive, setIsAcceptanceWindowActive] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  useEffect(() => {
    if (!session?.user) return;

    // Set current user info
    setSenderInfo((prev) => ({
      ...prev,
      [session.user.id]: {
        name: session.user.name || "You",
        image: session.user.image || null,
      },
    }));

    // Set other participant info
    setSenderInfo((prev) => ({
      ...prev,
      [otherParticipant.id]: {
        name: otherParticipant.name,
        image: otherParticipant.image || null,
      },
    }));
  }, [session, otherParticipant]);

  // Fetch service order info
  useEffect(() => {
    const fetchServiceOrderInfo = async () => {
      try {
        const response = await fetch(`/api/chat/conversations/${conversationId}/service-order`);
        if (response.ok) {
          const data = await response.json();
          setServiceOrderInfo(data);
          
          // Check if session has expired
          if (data.remainingTime !== null && data.remainingTime !== undefined) {
            setIsSessionExpired(data.remainingTime <= 0);
          } else {
            setIsSessionExpired(false);
          }
        }
      } catch (error) {
        console.error("Error fetching service order info:", error);
      }
    };

    fetchServiceOrderInfo();
    const interval = setInterval(fetchServiceOrderInfo, 5000); // Refresh every 5 seconds to check expiration
    return () => clearInterval(interval);
  }, [conversationId]);

  // Check online status of other user (initial state only, real-time updates via Socket.IO)
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const response = await fetch(`/api/users/${otherParticipant.id}/online-status`);
        if (response.ok) {
          const data = await response.json();
          setOtherUserOnline(data.online || false);
        }
      } catch (error) {
        console.error("Error checking online status:", error);
      }
    };

    fetchInitial();
    // Real-time updates are handled by Socket.IO listeners below
  }, [otherParticipant.id]);

  // Listen for WebSocket events
  useEffect(() => {
    if (!on) {
      console.log("[CHAT-WINDOW] on() is not available");
      return;
    }

    console.log(`[CHAT-WINDOW] Setting up listener for conversation ${conversationId}`);
    
    // Listen for new messages
    const unsubscribeMessage = on("message:send", (message: WebSocketMessage) => {
      console.log(`[CHAT-WINDOW] Received message:send event:`, message);
      if (message.type === "message:send" && "payload" in message) {
        console.log(`[CHAT-WINDOW] Message conversationId: ${message.payload.conversationId}, current: ${conversationId}`);
        if (message.payload.conversationId === conversationId) {
          console.log(`[CHAT-WINDOW] Dispatching messageReceived event for conversation ${conversationId}`);
          window.dispatchEvent(new CustomEvent("messageReceived", { detail: message }));
        }
      }
    });

    // Listen for chat:start
    const unsubscribeChatStart = on("chat:start", (message: WebSocketMessage) => {
      if (message.type === "chat:start" && "payload" in message) {
        const payload = (message as ChatStartMessage).payload;
        if (payload.conversationId === conversationId) {
          setAcceptanceWindowExpiresAt(payload.expiresAt);
          setIsAcceptanceWindowActive(true);
        }
      }
    });

    // Listen for chat:accept
    const unsubscribeChatAccept = on("chat:accept", (message: WebSocketMessage) => {
      if (message.type === "chat:accept" && "payload" in message) {
        const payload = (message as ChatAcceptMessage).payload;
        if (payload.conversationId === conversationId) {
          // Check if both accepted - conversation will be enabled
          fetch(`/api/chat/conversations/${conversationId}`)
            .then((res) => res.json())
            .then((data) => {
              if (data.isEnabled) {
                setConversationEnabled(true);
                setIsAcceptanceWindowActive(false);
                setAcceptanceWindowExpiresAt(null);
              }
            });
        }
      }
    });

    // Listen for chat:reject
    const unsubscribeChatReject = on("chat:reject", (message: WebSocketMessage) => {
      if (message.type === "chat:reject" && "payload" in message) {
        const payload = (message as ChatRejectMessage).payload;
        if (payload.conversationId === conversationId) {
          setIsAcceptanceWindowActive(false);
          setAcceptanceWindowExpiresAt(null);
        }
      }
    });

    // Listen for chat:timeout
    const unsubscribeChatTimeout = on("chat:timeout", (message: WebSocketMessage) => {
      if (message.type === "chat:timeout" && "payload" in message) {
        const payload = (message as ChatTimeoutMessage).payload;
        if (payload.conversationId === conversationId) {
          setIsAcceptanceWindowActive(false);
          setAcceptanceWindowExpiresAt(null);
        }
      }
    });

    // Listen for presence changes
    const unsubscribePresence = on("presence:online", (message: WebSocketMessage) => {
      if (message.type === "presence:online" && "payload" in message) {
        const payload = message.payload as { userId: string };
        if (payload.userId === otherParticipant.id) {
          setOtherUserOnline(true);
          window.dispatchEvent(new CustomEvent("presenceChange", {
            detail: { userId: payload.userId, isOnline: true }
          }));
        }
      }
    });

    const unsubscribePresenceOffline = on("presence:offline", (message: WebSocketMessage) => {
      if (message.type === "presence:offline" && "payload" in message) {
        const payload = message.payload as { userId: string };
        if (payload.userId === otherParticipant.id) {
          setOtherUserOnline(false);
          window.dispatchEvent(new CustomEvent("presenceChange", {
            detail: { userId: payload.userId, isOnline: false }
          }));
        }
      }
    });

    // Listen for typing indicators
    const unsubscribeTypingStart = on("typing:start", (message: WebSocketMessage) => {
      if (message.type === "typing:start" && "payload" in message) {
        const payload = message.payload as { conversationId: string; userId: string };
        if (payload.conversationId === conversationId && payload.userId === otherParticipant.id) {
          setIsOtherUserTyping(true);
        }
      }
    });

    const unsubscribeTypingStop = on("typing:stop", (message: WebSocketMessage) => {
      if (message.type === "typing:stop" && "payload" in message) {
        const payload = message.payload as { conversationId: string; userId: string };
        if (payload.conversationId === conversationId && payload.userId === otherParticipant.id) {
          setIsOtherUserTyping(false);
        }
      }
    });

    console.log(`[CHAT-WINDOW] Listener registered for conversation ${conversationId}`);
    
    return () => {
      unsubscribeMessage();
      unsubscribeChatStart();
      unsubscribeChatAccept();
      unsubscribeChatReject();
      unsubscribeChatTimeout();
      unsubscribePresence();
      unsubscribePresenceOffline();
      unsubscribeTypingStart();
      unsubscribeTypingStop();
    };
  }, [on, conversationId, otherParticipant.id]);

  // Auto-prompt when both users are online and service order exists
  useEffect(() => {
    if (!session?.user || !serviceOrderInfo?.hasServiceOrder) return;
    if (!conversationEnabled && otherUserOnline && serviceOrderInfo.serviceOrder?.status === "active") {
      // Check if both users are online
      const checkBothOnline = async () => {
        try {
          const [creatorRes, fanRes] = await Promise.all([
            fetch(`/api/users/${session.user.id}/online-status`),
            fetch(`/api/users/${otherParticipant.id}/online-status`),
          ]);
          
          const creatorData = await creatorRes.json();
          const fanData = await fanRes.json();
          
          if (creatorData.online && fanData.online && !isAcceptanceWindowActive) {
            // Auto-start chat if creator - check role from conversation
            fetch(`/api/chat/conversations/${conversationId}`)
              .then((res) => res.json())
              .then((convData) => {
                if (convData.creatorId === session.user.id && serviceOrderInfo?.serviceOrder?.id) {
                  fetch(`/api/chat/service-order/${serviceOrderInfo.serviceOrder.id}/start`, {
                    method: "POST"
                  })
                    .then((response) => response.json())
                    .then((data) => {
                      if (data.expiresAt) {
                        setAcceptanceWindowExpiresAt(data.expiresAt);
                        setIsAcceptanceWindowActive(true);
                      }
                    })
                    .catch((error) => {
                      console.error("Error auto-starting chat:", error);
                    });
                }
              })
              .catch((error) => {
                console.error("Error fetching conversation:", error);
              });
          }
        } catch (error) {
          console.error("Error checking online status for auto-prompt:", error);
        }
      };

      // Check after a short delay to avoid race conditions
      const timeout = setTimeout(checkBothOnline, 2000);
      return () => clearTimeout(timeout);
    }
  }, [session, otherUserOnline, serviceOrderInfo, conversationEnabled, isAcceptanceWindowActive, otherParticipant.id]);

  // Fetch conversation status and poll for updates
  useEffect(() => {
    if (!conversationId) return;

    const fetchConversationStatus = async () => {
      try {
        const response = await fetch(`/api/chat/conversations/${conversationId}`);
        if (response.ok) {
          const data = await response.json();
          const newEnabled = data.isEnabled || false;
          setConversationEnabled(newEnabled);
          // If just enabled, trigger refresh
          if (newEnabled && !conversationEnabled) {
            window.dispatchEvent(new CustomEvent("conversationEnabled"));
          }
        }
      } catch (error) {
        console.error("Error fetching conversation status:", error);
      }
    };

    fetchConversationStatus();
    
    // Poll for status updates if disabled (every 5 seconds)
    if (!conversationEnabled) {
      const interval = setInterval(() => {
        fetchConversationStatus();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [conversationId, conversationEnabled]);

  const handleMediaUpload = async (file: File, type: "image" | "audio" | "video"): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("conversationId", conversationId);
    formData.append("messageType", type);

    const response = await fetch("/api/chat/media", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload media");
    }

    const data = await response.json();
    return data.mediaUrl;
  };

  const handleMarkAsRead = async (messageId: string) => {
    try {
      await fetch(`/api/chat/messages/${messageId}/read`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  if (!session?.user) {
    return <div>Please log in to chat</div>;
  }

  // Determine user role - check if current user is creator or fan
  const isCurrentUserCreator = conversationId ? 
    (async () => {
      try {
        const response = await fetch(`/api/chat/conversations/${conversationId}`);
        const data = await response.json();
        return data.creatorId === session.user.id;
      } catch {
        return false;
      }
    })() : Promise.resolve(false);
  
  const [userRole, setUserRole] = useState<"creator" | "fan">("fan");
  
  useEffect(() => {
    if (!conversationId || !session?.user) return;
    fetch(`/api/chat/conversations/${conversationId}`)
      .then((res) => res.json())
      .then((data) => {
        setUserRole(data.creatorId === session.user.id ? "creator" : "fan");
      })
      .catch(() => {});
  }, [conversationId, session?.user?.id]);

  const isServicePending = serviceOrderInfo?.hasServiceOrder && 
    serviceOrderInfo.serviceOrder?.status === "active" && 
    !conversationEnabled;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Timer */}
      {(isAcceptanceWindowActive && acceptanceWindowExpiresAt) || (conversationEnabled && serviceOrderInfo && serviceOrderInfo.remainingTime !== null && serviceOrderInfo.remainingTime !== undefined) ? (
        <div className="border-b p-3 flex items-center justify-end shrink-0">
          <div className="flex items-center gap-4">
            {isAcceptanceWindowActive && acceptanceWindowExpiresAt && (
              <ConversationTimer
                type="acceptance"
                expiresAt={acceptanceWindowExpiresAt}
                onExpire={() => {
                  setIsAcceptanceWindowActive(false);
                  setAcceptanceWindowExpiresAt(null);
                }}
              />
            )}
            {conversationEnabled && serviceOrderInfo && serviceOrderInfo.remainingTime !== null && serviceOrderInfo.remainingTime !== undefined && (
              <ConversationTimer
                type="service"
                initialSeconds={serviceOrderInfo.remainingTime}
                onExpire={() => {
                  // Service time expired
                  console.log("Service time expired");
                }}
              />
            )}
          </div>
        </div>
      ) : null}

      {/* Messages */}
      <MessageList
        conversationId={conversationId}
        currentUserId={session.user.id}
        senderInfo={senderInfo}
        isOtherUserTyping={isOtherUserTyping}
        otherUserName={otherParticipant.name}
      />

      {/* Session Expired Message */}
      {isSessionExpired && (
        <div className="border-t p-4 bg-muted/50 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Session expired. The service time has ended.
          </p>
        </div>
      )}

      {/* Input */}
      <MessageInput
        conversationId={conversationId}
        isEnabled={conversationEnabled && !isSessionExpired}
        onMediaUpload={handleMediaUpload}
        serviceOrderId={serviceOrderInfo?.serviceOrder?.id}
        userRole={userRole}
        isServicePending={isServicePending}
        hasServiceOrder={serviceOrderInfo?.hasServiceOrder || false}
        remainingTime={serviceOrderInfo?.remainingTime ?? null}
      />
    </div>
  );
}

