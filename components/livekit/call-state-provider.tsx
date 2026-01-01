"use client";

import {
  ReactNode,
  useEffect,
  useState,
  createContext,
  useContext,
  useCallback,
  useRef,
} from "react";
import { useSession } from "@/lib/auth/auth-client";
import { CallEvent } from "@/lib/utils/redis-pubsub";

export interface IncomingCall {
  callId: string;
  conversationId?: string;
  callerId: string;
  callerName: string;
  callerImage?: string | null;
  callType: "audio" | "video";
}

export interface ActiveCall {
  callId: string;
  conversationId?: string;
  otherParticipantId: string;
  otherParticipantName: string;
  otherParticipantImage?: string | null;
  callType: "audio" | "video";
  token: string;
  url: string;
  roomName: string;
}

interface CallStateContextType {
  incomingCall: IncomingCall | null;
  activeCall: ActiveCall | null;
  isCalling: boolean;
  acceptCall: (callId: string) => Promise<void>;
  rejectCall: (callId: string) => Promise<void>;
  endCall: (callId: string) => Promise<void>;
  setActiveCall: (call: ActiveCall | null) => void;
}

const CallStateContext = createContext<CallStateContextType>({
  incomingCall: null,
  activeCall: null,
  isCalling: false,
  acceptCall: async () => {},
  rejectCall: async () => {},
  endCall: async () => {},
  setActiveCall: () => {},
});

export function useCallState() {
  return useContext(CallStateContext);
}

interface CallStateProviderProps {
  children: ReactNode;
}

export function CallStateProvider({
  children,
}: CallStateProviderProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id || null;
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Debug logging for user ID
  useEffect(() => {
    if (currentUserId) {
      console.log("[CallStateProvider] Current user ID:", currentUserId);
    } else {
      console.log("[CallStateProvider] No user ID available (user not logged in)");
    }
  }, [currentUserId]);

  // Fetch user info helper - get from conversations
  const fetchUserInfo = useCallback(async (userId: string, conversationId?: string) => {
    try {
      // If we have conversationId, try to get user info from conversations
      if (conversationId) {
        const response = await fetch(`/api/conversations`);
        if (response.ok) {
          const conversations = await response.json();
          const conv = conversations.find((c: any) => c.id === conversationId);
          if (conv) {
            // Check if this user is the other user in the conversation
            if (conv.otherUserId === userId) {
              return { name: conv.otherUserName, image: conv.otherUserImage };
            }
          }
        }
      }
      // Fallback - return placeholder
      return { name: "User", image: null };
    } catch (error) {
      console.error("Error fetching user info:", error);
      return { name: "User", image: null };
    }
  }, []);

  // Handle call events from SSE
  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const connectSSE = () => {
      // Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      try {
        const eventSource = new EventSource("/api/calls/stream");
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          console.log("[CallStateProvider] Call events SSE connected", { currentUserId });
        };

        eventSource.addEventListener("connected", (event) => {
          console.log("[CallStateProvider] SSE connected event:", event);
        });

        eventSource.addEventListener("incoming_call", async (event) => {
          try {
            console.log("[CallStateProvider] Received incoming_call event:", event);
            const callEvent: CallEvent = JSON.parse(event.data);
            console.log("[CallStateProvider] Parsed call event:", {
              callId: callEvent.callId,
              receiverId: callEvent.receiverId,
              currentUserId,
              match: callEvent.receiverId === currentUserId,
            });
            
            // Only handle incoming calls for this user
            if (callEvent.receiverId !== currentUserId) {
              console.log("[CallStateProvider] Call event receiverId doesn't match currentUserId, ignoring");
              return;
            }

            console.log("[CallStateProvider] Processing incoming call for current user");
            // Fetch caller information
            const userInfo = await fetchUserInfo(callEvent.callerId, callEvent.conversationId);
            
            const incomingCallData = {
              callId: callEvent.callId,
              conversationId: callEvent.conversationId,
              callerId: callEvent.callerId,
              callerName: userInfo.name,
              callerImage: userInfo.image,
              callType: callEvent.callType,
            };
            
            console.log("[CallStateProvider] Setting incoming call:", incomingCallData);
            setIncomingCall(incomingCallData);
          } catch (error) {
            console.error("[CallStateProvider] Error handling incoming_call event:", error);
          }
        });

        eventSource.addEventListener("call_accepted", async (event) => {
          try {
            const callEvent: CallEvent = JSON.parse(event.data);
            console.log("[CallStateProvider] Received call_accepted event:", callEvent);
            
            // Clear incoming call if it matches (for receiver)
            setIncomingCall((current) => {
              if (current?.callId === callEvent.callId) {
                return null;
              }
              return current;
            });
            setIsCalling(false);
            
            // If we're the caller and don't have activeCall set, we need to ensure it's set
            if (callEvent.callerId === currentUserId && !activeCall) {
              console.log("[CallStateProvider] Caller received call_accepted, ensuring activeCall is set");
              // The caller should already have activeCall set from initiate, but if not, we need to fetch it
              // For now, we'll just log - the caller should have set it on initiate
              // If activeCall is missing, it might have been cleared, so we should restore it
              // But we don't have the token here, so we'll rely on the caller having set it
            }
            
            // If we're the receiver and just accepted, activeCall should already be set by acceptCall
            // But ensure it's still there
            if (callEvent.receiverId === currentUserId) {
              console.log("[CallStateProvider] Receiver - call accepted, activeCall should be set");
            }
          } catch (error) {
            console.error("[CallStateProvider] Error handling call_accepted event:", error);
          }
        });

        eventSource.addEventListener("call_rejected", (event) => {
          try {
            const callEvent: CallEvent = JSON.parse(event.data);
            // Clear incoming call if it matches
            setIncomingCall((current) => {
              if (current?.callId === callEvent.callId) {
                return null;
              }
              return current;
            });
            setIsCalling(false);
          } catch (error) {
            console.error("Error handling call_rejected event:", error);
          }
        });

        eventSource.addEventListener("call_ended", (event) => {
          try {
            const callEvent: CallEvent = JSON.parse(event.data);
            // Clear active call if it matches
            setActiveCall((current) => {
              if (current?.callId === callEvent.callId) {
                return null;
              }
              return current;
            });
            setIsCalling(false);
          } catch (error) {
            console.error("Error handling call_ended event:", error);
          }
        });

        eventSource.addEventListener("error", (error) => {
          console.error("[CallStateProvider] Call events SSE error:", error);
        });

        eventSource.onerror = (error) => {
          console.error("[CallStateProvider] Call events SSE connection error:", error);
          // Don't close immediately - SSE will auto-reconnect
        };
      } catch (error) {
        console.error("Error setting up call events SSE:", error);
      }
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [currentUserId, fetchUserInfo, activeCall]);

  const acceptCall = useCallback(async (callId: string) => {
    try {
      const response = await fetch(`/api/calls/${callId}/accept`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to accept call");
      }

      const data = await response.json();

      // Get caller info from incoming call
      const call = incomingCall;
      if (!call) {
        throw new Error("Call not found");
      }

      // Validate token exists and is a string
      if (!data.token || typeof data.token !== "string") {
        console.error("[Call State] Invalid token in accept call response:", data.token);
        throw new Error("Invalid token received from server");
      }

      const tokenString = data.token;

      // Set active call
      setActiveCall({
        callId: data.call.id,
        conversationId: call.conversationId,
        otherParticipantId: call.callerId,
        otherParticipantName: call.callerName,
        otherParticipantImage: call.callerImage,
        callType: call.callType,
        token: tokenString,
        url: data.url,
        roomName: data.roomName,
      });

      setIncomingCall(null);
    } catch (error) {
      console.error("Error accepting call:", error);
      throw error;
    }
  }, [incomingCall]);

  const rejectCall = useCallback(async (callId: string) => {
    try {
      const response = await fetch(`/api/calls/${callId}/reject`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to reject call");
      }

      setIncomingCall(null);
    } catch (error) {
      console.error("Error rejecting call:", error);
      throw error;
    }
  }, []);

  const endCall = useCallback(async (callId: string) => {
    try {
      console.log("[CallStateProvider] Ending call:", callId);
      const response = await fetch(`/api/calls/${callId}/end`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to end call");
      }

      // Clear active call immediately
      setActiveCall(null);
      setIsCalling(false);
      console.log("[CallStateProvider] Call ended successfully");
    } catch (error) {
      console.error("[CallStateProvider] Error ending call:", error);
      // Clear active call even on error to prevent stuck state
      setActiveCall(null);
      setIsCalling(false);
      throw error;
    }
  }, []);

  return (
    <CallStateContext.Provider
      value={{
        incomingCall,
        activeCall,
        isCalling,
        acceptCall,
        rejectCall,
        endCall,
        setActiveCall,
      }}
    >
      {children}
    </CallStateContext.Provider>
  );
}

