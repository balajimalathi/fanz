"use client";

import { useState, useEffect } from "react";
import { ChatWindow } from "@/components/chat/chat-window";
import { ConversationList } from "@/components/chat/conversation-list";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useIsMobileOrTablet } from "@/hooks/use-mobile-tablet";
import { Button } from "@/components/ui/button";
import { OnlineStatusIndicator } from "@/components/chat/online-status-indicator";
import { useWebSocketContext } from "@/components/chat/websocket-provider";
import { WebSocketMessage } from "@/lib/websocket/types";

interface Follower {
  id: string;
  followerId: string;
  followerName: string;
  followerEmail: string;
  createdAt: string;
  conversationId?: string;
  isEnabled?: boolean;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  unreadCount?: number;
  serviceOrder?: {
    orderId: string;
    status: string;
    duration: number | null;
    serviceType: string | null;
  };
}

interface InboxPageClientProps {
  creatorId: string;
}

export function InboxPageClient({ creatorId }: InboxPageClientProps) {
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [selectedFollowerId, setSelectedFollowerId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const isMobileOrTablet = useIsMobileOrTablet();
  const { on } = useWebSocketContext();

  useEffect(() => {
    fetchFollowersWithConversations();
  }, [creatorId]);

  // Check online status of selected follower
  useEffect(() => {
    if (!selectedFollowerId) {
      setOtherUserOnline(false);
      return;
    }

    // Initial state fetch (one-time)
    const fetchInitial = async () => {
      try {
        const response = await fetch(`/api/users/${selectedFollowerId}/online-status`);
        if (response.ok) {
          const data = await response.json();
          setOtherUserOnline(data.online || false);
        }
      } catch (error) {
        console.error("Error checking online status:", error);
        setOtherUserOnline(false);
      }
    };

    fetchInitial();

    // Listen to real-time Socket.IO events (only if context is available)
    if (!on) {
      return;
    }

    const unsubscribeOnline = on("presence:online", (message: WebSocketMessage) => {
      if (message.type === "presence:online" && "payload" in message) {
        const payload = message.payload as { userId: string };
        if (payload.userId === selectedFollowerId) {
          setOtherUserOnline(true);
        }
      }
    });

    const unsubscribeOffline = on("presence:offline", (message: WebSocketMessage) => {
      if (message.type === "presence:offline" && "payload" in message) {
        const payload = message.payload as { userId: string };
        if (payload.userId === selectedFollowerId) {
          setOtherUserOnline(false);
        }
      }
    });

    return () => {
      unsubscribeOnline();
      unsubscribeOffline();
    };
  }, [selectedFollowerId, on]);

  const fetchFollowersWithConversations = async () => {
    try {
      setIsLoading(true);
      // Fetch followers
      const followersRes = await fetch(`/api/followers?creatorId=${creatorId}`);
      if (!followersRes.ok) throw new Error("Failed to fetch followers");
      const followersData = await followersRes.json();

      // Fetch conversations for this creator
      const convsRes = await fetch("/api/chat/conversations");
      if (!convsRes.ok) throw new Error("Failed to fetch conversations");
      const convsData = await convsRes.json();
      const conversations = convsData.conversations || [];

      // Fetch service orders for inbox
      const serviceOrdersRes = await fetch("/api/creator/inbox/service-orders");
      const serviceOrdersData = serviceOrdersRes.ok 
        ? await serviceOrdersRes.json() 
        : { serviceOrders: [] };
      const serviceOrders = serviceOrdersData.serviceOrders || [];
      const serviceOrderMap = new Map(
        serviceOrders.map((so: any) => [so.followerId, so])
      );

      // Map conversations and service orders to followers
      const followersWithConvs = followersData.map((follower: any) => {
        const conv = conversations.find(
          (c: any) => c.otherParticipant.id === follower.followerId
        );
        const serviceOrder = serviceOrderMap.get(follower.followerId);
        return {
          ...follower,
          conversationId: conv?.id,
          isEnabled: conv?.isEnabled || false,
          lastMessageAt: conv?.lastMessageAt,
          lastMessagePreview: conv?.lastMessagePreview,
          unreadCount: conv?.unreadCount || 0,
          serviceOrder: serviceOrder || undefined,
        };
      });

      // Sort by last message time or creation time
      followersWithConvs.sort((a: Follower, b: Follower) => {
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
        return bTime - aTime;
      });

      setFollowers(followersWithConvs);
    } catch (error) {
      console.error("Error fetching followers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFollower = async (follower: Follower) => {
    setSelectedFollowerId(follower.followerId);

    if (follower.conversationId) {
      // Conversation exists, open it
      setSelectedConversationId(follower.conversationId);
    } else {
      // Create conversation - creator initiating with fan
      try {
        const response = await fetch("/api/chat/conversations/create-with-fan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fanId: follower.followerId }),
        });

        if (!response.ok) throw new Error("Failed to create conversation");

        const data = await response.json();
        if (data.conversation) {
          setSelectedConversationId(data.conversation.id);
          // Refresh followers list
          fetchFollowersWithConversations();
        }
      } catch (error) {
        console.error("Error creating conversation:", error);
      }
    }
  };

  const handleEnableChat = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}/enable`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to enable chat");

      // Update local state immediately
      setFollowers((prev) =>
        prev.map((f) =>
          f.conversationId === conversationId
            ? { ...f, isEnabled: true }
            : f
        )
      );

      // Refresh followers list
      fetchFollowersWithConversations();
    } catch (error) {
      console.error("Error enabling chat:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedFollower = followers.find((f) => f.followerId === selectedFollowerId);

  // On mobile/tablet: show sidebar OR chat, not both
  const showSidebar = isMobileOrTablet ? !selectedConversationId : true;
  const showChat = isMobileOrTablet ? !!selectedConversationId : true;

  const handleBackToList = () => {
    setSelectedFollowerId(null);
    setSelectedConversationId(null);
  };

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Followers Sidebar */}
      <div
        className={cn(
          "border-r bg-background flex flex-col transition-transform duration-200",
          isMobileOrTablet
            ? showSidebar
              ? "w-full h-screen fixed inset-0 z-10"
              : "hidden"
            : "w-80 h-full"
        )}
      >
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">Inbox</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select a follower to start chatting
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {followers.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <p>No followers yet</p>
            </div>
          ) : (
            followers.map((follower) => (
              <div
                key={follower.followerId}
                onClick={() => handleSelectFollower(follower)}
                className={cn(
                  "p-4 cursor-pointer hover:bg-accent transition-colors border-b",
                  selectedFollowerId === follower.followerId && "bg-accent"
                )}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarFallback>
                      {follower.followerName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <p className="font-medium truncate">{follower.followerName}</p>
                        {follower.serviceOrder && follower.serviceOrder.duration && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                            {follower.serviceOrder.duration}m service
                          </span>
                        )}
                      </div>
                      {follower.lastMessageAt && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(follower.lastMessageAt), {
                            addSuffix: true,
                          })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className="text-sm text-muted-foreground truncate">
                        {follower.lastMessagePreview || "No messages yet"}
                      </p>
                      {follower.unreadCount && follower.unreadCount > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs font-medium rounded-full h-5 w-5 flex items-center justify-center shrink-0">
                          {follower.unreadCount > 9 ? "9+" : follower.unreadCount}
                        </span>
                      )}
                    </div>
                    {follower.conversationId && !follower.isEnabled && (
                      <div className="mt-2">
                        <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-1 rounded">
                          Chat disabled - Enable to start
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div
        className={cn(
          "flex flex-col transition-transform duration-200",
          isMobileOrTablet
            ? showChat
              ? "w-full h-screen fixed inset-0 z-10 bg-background"
              : "hidden"
            : "flex-1 h-full"
        )}
      >
        {selectedConversationId && selectedFollower ? (
          <div className="flex flex-col h-full min-h-0">
            {/* Header with Back Button and Enable Button */}
            <div className="border-b p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {isMobileOrTablet && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBackToList}
                    className="shrink-0"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                )}
                <div className="relative inline-block shrink-0">
                  <Avatar className="shrink-0">
                    <AvatarFallback>
                      {selectedFollower.followerName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <OnlineStatusIndicator userId={selectedFollower.followerId} size="sm" className="bottom-0 right-0" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedFollower.followerName}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {otherUserOnline ? "Online" : selectedFollower.followerEmail}
                  </p>
                </div>
              </div>
              {!selectedFollower.isEnabled && (
                <button
                  onClick={() => handleEnableChat(selectedConversationId)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium shrink-0 ml-2"
                >
                  Enable Chat
                </button>
              )}
            </div>
            <ChatWindow
              conversationId={selectedConversationId}
              otherParticipant={{
                id: selectedFollower.followerId,
                name: selectedFollower.followerName,
                image: null,
              }}
              isEnabled={selectedFollower.isEnabled ?? false}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Select a follower to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}

