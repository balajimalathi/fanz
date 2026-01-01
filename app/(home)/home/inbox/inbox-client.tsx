"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ChatInterface } from "@/components/livekit/chat-interface";
import { Button } from "@/components/ui/button";
import { Phone, Video } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCallState } from "@/components/livekit/call-state-provider";

interface Follower {
  id: string;
  followerId: string;
  followerName: string;
  followerEmail: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserImage: string | null;
  creatorDisplayName: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  createdAt: string;
  updatedAt: string;
}

interface InboxPageClientProps {
  creatorId: string;
  currentUserId: string;
}

export function InboxPageClient({ creatorId, currentUserId }: InboxPageClientProps) {
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedFollower, setSelectedFollower] = useState<Follower | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [conversationMap, setConversationMap] = useState<Map<string, Conversation>>(new Map());
  const { activeCall, setActiveCall, isCalling } = useCallState();

  useEffect(() => {
    fetchData();
  }, [creatorId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch followers and conversations in parallel
      const [followersRes, conversationsRes] = await Promise.all([
        fetch(`/api/followers?creatorId=${creatorId}`),
        fetch("/api/conversations"),
      ]);

      if (!followersRes.ok) throw new Error("Failed to fetch followers");
      if (!conversationsRes.ok) throw new Error("Failed to fetch conversations");

      const followersData = await followersRes.json();
      const conversationsData = await conversationsRes.json();

      // Sort followers by creation time
      followersData.sort((a: Follower, b: Follower) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      // Create a map of conversations by otherUserId for quick lookup
      const map = new Map<string, Conversation>();
      conversationsData.forEach((conv: Conversation) => {
        map.set(conv.otherUserId, conv);
      });

      setFollowers(followersData);
      setConversations(conversationsData);
      setConversationMap(map);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowerClick = async (follower: Follower) => {
    setSelectedFollower(follower);
    
    // Check if conversation already exists
    const existingConv = conversationMap.get(follower.followerId);
    
    if (existingConv) {
      setSelectedConversationId(existingConv.id);
    } else {
      // Create conversation
      try {
        const response = await fetch("/api/conversations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fanId: follower.followerId,
          }),
        });

        if (!response.ok) throw new Error("Failed to create conversation");

        const newConversation = await response.json();
        setSelectedConversationId(newConversation.id);
        
        // Update conversation map and conversations list
        const updatedMap = new Map(conversationMap);
        const newConv: Conversation = {
          id: newConversation.id,
          otherUserId: follower.followerId,
          otherUserName: follower.followerName,
          otherUserImage: null,
          creatorDisplayName: null,
          lastMessageAt: null,
          lastMessagePreview: null,
          createdAt: newConversation.createdAt,
          updatedAt: newConversation.updatedAt,
        };
        updatedMap.set(follower.followerId, newConv);
        setConversationMap(updatedMap);
        setConversations((prev) => [...prev, newConv]);
      } catch (error) {
        console.error("Error creating conversation:", error);
      }
    }
  };

  const getConversationForFollower = (followerId: string): Conversation | undefined => {
    return conversationMap.get(followerId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedConversation = selectedConversationId
    ? conversations.find((c) => c.id === selectedConversationId) ||
      Array.from(conversationMap.values()).find((c) => c.id === selectedConversationId)
    : null;

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left sidebar - Followers list */}
      <div className="w-1/3 border-r flex flex-col bg-muted/30 min-w-0">
        <div className="p-4 border-b bg-background shrink-0">
          <h1 className="text-xl font-bold">Inbox</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {followers.length} {followers.length === 1 ? "follower" : "followers"}
          </p>
        </div>
        <ScrollArea className="flex-1">
          {followers.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <p>No followers yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {followers.map((follower) => {
                const conv = getConversationForFollower(follower.followerId);
                const isSelected = selectedFollower?.followerId === follower.followerId;

                return (
                  <div
                    key={follower.followerId}
                    className={`p-4 hover:bg-accent transition-colors cursor-pointer ${
                      isSelected ? "bg-accent" : ""
                    }`}
                    onClick={() => handleFollowerClick(follower)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12 shrink-0">
                        <AvatarFallback>
                          {follower.followerName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium truncate">{follower.followerName}</p>
                          {conv?.lastMessageAt && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {formatDistanceToNow(new Date(conv.lastMessageAt), {
                                addSuffix: true,
                              })}
                            </span>
                          )}
                        </div>
                        {conv?.lastMessagePreview ? (
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {conv.lastMessagePreview}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {follower.followerEmail}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right side - Chat window */}
      <div className="flex-1 flex flex-col bg-background min-w-0 overflow-hidden">
        {selectedConversationId && selectedFollower ? (
          <>
            {/* Chat header - Fixed at top */}
            <div className="p-4 border-b flex items-center justify-between bg-background shrink-0">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {selectedFollower.followerName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedFollower.followerName}</p>
                  <p className="text-sm text-muted-foreground">Online</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    if (!selectedConversationId || !selectedConversation) {
                      console.log("[Inbox Client] Cannot initiate call - missing conversation", {
                        selectedConversationId,
                        selectedConversation: !!selectedConversation,
                      });
                      return;
                    }
                    
                    console.log("[Inbox Client] Initiating call", {
                      conversationId: selectedConversationId,
                      callType: "audio",
                    });

                    try {
                      const response = await fetch("/api/calls/initiate", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          conversationId: selectedConversationId,
                          callType: "audio",
                        }),
                      });

                      console.log("[Inbox Client] Call initiate response", {
                        ok: response.ok,
                        status: response.status,
                        statusText: response.statusText,
                      });

                      if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        console.error("[Inbox Client] Failed to initiate call", {
                          status: response.status,
                          error: errorData,
                        });
                        throw new Error(errorData.error || "Failed to initiate call");
                      }

                      const data = await response.json();
                      console.log("[Inbox Client] Call initiated successfully", {
                        callId: data.call.id,
                        roomName: data.roomName,
                        tokenType: typeof data.token,
                        isString: typeof data.token === "string",
                      });
                      
                      // Ensure token is a string
                      const tokenString = typeof data.token === "string" ? data.token : String(data.token);
                      
                      // Set active call for caller (they join immediately)
                      setActiveCall({
                        callId: data.call.id,
                        conversationId: data.call.conversationId,
                        otherParticipantId: selectedConversation.otherUserId,
                        otherParticipantName: selectedConversation.otherUserName,
                        otherParticipantImage: selectedConversation.otherUserImage,
                        callType: "audio",
                        token: tokenString,
                        url: data.url,
                        roomName: data.roomName,
                      });
                    } catch (error) {
                      console.error("[Inbox Client] Error initiating call:", error);
                    }
                  }}
                  disabled={isCalling || !!activeCall}
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    // TODO: Start video call
                    console.log("Video call clicked");
                  }}
                  disabled={isCalling || !!activeCall}
                >
                  <Video className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Chat interface - call view is handled globally by ActiveCallView */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <ChatInterface
                conversationId={selectedConversationId}
                currentUserId={currentUserId}
                otherUserName={selectedFollower.followerName}
                otherUserImage={null}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/30">
            <div className="text-center text-muted-foreground">
              <p className="text-lg mb-2">Select a follower to start chatting</p>
              <p className="text-sm">Choose a conversation from the list to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
