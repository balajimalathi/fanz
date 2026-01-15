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
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second

  // Debug logging for user ID
  useEffect(() => {
    if (currentUserId) {
      console.info("[CallStateProvider] Current user ID:", currentUserId);
    } else {
      console.info("[CallStateProvider] No user ID available (user not logged in)");
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
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/57097842-b638-4791-82c0-3a4760a3ce5f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'call-state-provider.tsx:119',message:'connectSSE called',data:{hasExistingConnection:!!eventSourceRef.current,hasPendingReconnect:!!reconnectTimeoutRef.current,reconnectAttempts:reconnectAttemptsRef.current,currentUserId},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A,E'})}).catch(()=>{});
      // #endregion
      // Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // Clear any pending reconnection attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      try {
        console.info("[CallStateProvider] Attempting to connect SSE", {
          currentUserId,
          attempt: reconnectAttemptsRef.current + 1,
          maxAttempts: maxReconnectAttempts,
        });

        const eventSource = new EventSource("/api/calls/stream");
        eventSourceRef.current = eventSource;

        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/57097842-b638-4791-82c0-3a4760a3ce5f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'call-state-provider.tsx:139',message:'EventSource created',data:{readyStateBeforeOpen:eventSource.readyState,hasOnOpen:!!eventSource.onopen,hasErrorListeners:false},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A,B,C'})}).catch(()=>{});
        // #endregion

        eventSource.onopen = () => {
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/57097842-b638-4791-82c0-3a4760a3ce5f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'call-state-provider.tsx:142',message:'onopen fired',data:{readyState:eventSource.readyState,currentIsConnected:isConnected,reconnectAttempts:reconnectAttemptsRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'G'})}).catch(()=>{});
          // #endregion
          console.info("[CallStateProvider] Call events SSE HTTP connection opened", {
            currentUserId,
            readyState: eventSource.readyState,
          });
          // Note: Don't reset reconnectAttempts here - onopen only indicates HTTP connection opened,
          // not server-side readiness. Wait for "connected" event or heartbeat to confirm server is ready.
          setIsConnected(true);
        };

        eventSource.addEventListener("connected", (event) => {
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/57097842-b638-4791-82c0-3a4760a3ce5f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'call-state-provider.tsx:151',message:'connected event received from server',data:{readyState:eventSource.readyState,hasEventData:!!event?.data},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'F'})}).catch(()=>{});
          // #endregion
          console.info("[CallStateProvider] SSE connected event received:", event);
          setIsConnected(true);
          reconnectAttemptsRef.current = 0; // Reset attempts on successful connection
        });

        eventSource.addEventListener("heartbeat", () => {
          // Heartbeat received, connection is alive
          setIsConnected(true);
          reconnectAttemptsRef.current = 0; // Reset attempts on successful heartbeat
        });

        eventSource.addEventListener("incoming_call", async (event) => {
          try {
            console.info("[CallStateProvider] Received incoming_call event:", event);
            const callEvent: CallEvent = JSON.parse(event.data);
            console.info("[CallStateProvider] Parsed call event:", {
              callId: callEvent.callId,
              receiverId: callEvent.receiverId,
              currentUserId,
              match: callEvent.receiverId === currentUserId,
            });
            
            // Only handle incoming calls for this user
            if (callEvent.receiverId !== currentUserId) {
              console.info("[CallStateProvider] Call event receiverId doesn't match currentUserId, ignoring");
              return;
            }

            console.info("[CallStateProvider] Processing incoming call for current user");
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
            
            console.info("[CallStateProvider] Setting incoming call:", incomingCallData);
            setIncomingCall(incomingCallData);
          } catch (error) {
            console.error("[CallStateProvider] Error handling incoming_call event:", error);
          }
        });

        eventSource.addEventListener("call_accepted", async (event) => {
          try {
            const callEvent: CallEvent = JSON.parse(event.data);
            console.info("[CallStateProvider] Received call_accepted event:", callEvent);
            
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
              console.info("[CallStateProvider] Caller received call_accepted, ensuring activeCall is set");
              // The caller should already have activeCall set from initiate, but if not, we need to fetch it
              // For now, we'll just log - the caller should have set it on initiate
              // If activeCall is missing, it might have been cleared, so we should restore it
              // But we don't have the token here, so we'll rely on the caller having set it
            }
            
            // If we're the receiver and just accepted, activeCall should already be set by acceptCall
            // But ensure it's still there
            if (callEvent.receiverId === currentUserId) {
              console.info("[CallStateProvider] Receiver - call accepted, activeCall should be set");
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

        // Use a single error handler to avoid duplicate error handling
        // We use addEventListener("error") instead of onerror to be consistent with other event listeners
        // Note: Both addEventListener("error") and onerror fire for the same error events, so we only use one
        eventSource.addEventListener("error", (event) => {
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/57097842-b638-4791-82c0-3a4760a3ce5f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'call-state-provider.tsx:278',message:'error event handler fired',data:{type:event.type,readyState:eventSource.readyState,isConnected,reconnectAttempts:reconnectAttemptsRef.current,hasPendingReconnect:!!reconnectTimeoutRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          console.error("[CallStateProvider] Call events SSE error event:", {
            type: event.type,
            readyState: eventSource.readyState,
            isConnected,
            attempt: reconnectAttemptsRef.current + 1,
            error: event,
          });
          setIsConnected(false);
          
          // EventSource errors can occur at different readyStates:
          // - readyState 0 (CONNECTING): Initial state or connection closed (browser-dependent)
          // - readyState 1 (OPEN): Connection established but then failed
          // - readyState 2 (CLOSED): Connection explicitly closed
          // Based on logs: errors fire twice - first with readyState: 1, then with readyState: 0
          // We should only reconnect when the connection is actually closed (readyState !== OPEN)
          // Use a flag check to prevent duplicate reconnection attempts
          const currentReadyState = eventSource.readyState;
          const isNotOpen = currentReadyState !== EventSource.OPEN; // Not OPEN means closed or connecting
          
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/57097842-b638-4791-82c0-3a4760a3ce5f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'call-state-provider.tsx:292',message:'error handler - checking reconnection conditions',data:{readyState:currentReadyState,eventSourceOPEN:EventSource.OPEN,eventSourceCLOSED:EventSource.CLOSED,isNotOpen,reconnectAttempts:reconnectAttemptsRef.current,hasPendingReconnect:!!reconnectTimeoutRef.current,willReconnect:isNotOpen && reconnectAttemptsRef.current < maxReconnectAttempts && !reconnectTimeoutRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          
          // Only attempt reconnection if connection is not OPEN (closed or failed) 
          // and we haven't already scheduled a reconnection for this error sequence
          // The hasPendingReconnect check prevents duplicate reconnection attempts
          if (isNotOpen && !reconnectTimeoutRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
            console.info("[CallStateProvider] SSE connection closed/failed, attempting reconnection");
            
            // Close the connection explicitly to ensure clean state
            if (eventSourceRef.current === eventSource) {
              try {
                eventSource.close();
              } catch (e) {
                // Connection may already be closed
              }
            }
            
            const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
            reconnectAttemptsRef.current++;
            
            // #region agent log
            fetch('http://127.0.0.1:7245/ingest/57097842-b638-4791-82c0-3a4760a3ce5f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'call-state-provider.tsx:301',message:'scheduling reconnection',data:{attempt:reconnectAttemptsRef.current,delay,maxAttempts:maxReconnectAttempts},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
            console.info("[CallStateProvider] Scheduling reconnection", {
              attempt: reconnectAttemptsRef.current,
              delay,
              maxAttempts: maxReconnectAttempts,
            });

            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectTimeoutRef.current = null;
              connectSSE();
            }, delay);
          } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            console.error("[CallStateProvider] Max reconnection attempts reached", {
              attempts: reconnectAttemptsRef.current,
              maxAttempts: maxReconnectAttempts,
            });
          }
        });
      } catch (error) {
        console.error("[CallStateProvider] Error setting up call events SSE:", {
          error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          currentUserId,
          attempt: reconnectAttemptsRef.current + 1,
        });
        setIsConnected(false);
        
        // Attempt reconnection for setup errors
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
          reconnectAttemptsRef.current++;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connectSSE();
          }, delay);
        }
      }
    };

    connectSSE();

    // Cleanup on unmount or when dependencies change
    return () => {
      console.info("[CallStateProvider] Cleaning up SSE connection", {
        currentUserId,
        isConnected,
        reconnectAttempts: reconnectAttemptsRef.current,
      });

      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Close EventSource connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // Reset connection state
      setIsConnected(false);
      reconnectAttemptsRef.current = 0;
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
      console.info("[CallStateProvider] Ending call:", callId);
      
      // Clear active call immediately for better UX
      setActiveCall(null);
      setIsCalling(false);
      
      const response = await fetch(`/api/calls/${callId}/end`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // If call is already ended, that's fine - just log it
        if (errorData.error?.includes("Current status: ended")) {
          console.info("[CallStateProvider] Call was already ended");
          return;
        }
        console.error("[CallStateProvider] Failed to end call", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        // Don't throw error if call is already ended
        if (!errorData.error?.includes("ended")) {
          throw new Error(errorData.error || "Failed to end call");
        }
      } else {
        console.info("[CallStateProvider] Call ended successfully");
      }
    } catch (error) {
      console.error("[CallStateProvider] Error ending call:", error);
      // Call state already cleared above, no need to clear again
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

