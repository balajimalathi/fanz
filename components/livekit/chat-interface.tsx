"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Paperclip, Mic, X, Loader2, Coins, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { TypingIndicator } from "./typing-indicator";
import { AudioMessagePlayer } from "./audio-message-player";

interface Message {
  id: string;
  senderId: string;
  content: string | null;
  messageType: "text" | "audio" | "image" | "video";
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  createdAt: string;
  coinsPending?: number | null;
  coinsDeducted?: boolean;
}

interface ChatInterfaceProps {
  conversationId: string;
  currentUserId: string;
  otherUserId?: string; // Other user's ID (creator if fan, fan if creator)
  otherUserName: string;
  otherUserImage?: string | null;
  isFan?: boolean; // Whether current user is a fan (default: try to infer)
}

export function ChatInterface({
  conversationId,
  currentUserId,
  otherUserId,
  otherUserName,
  otherUserImage,
  isFan: isFanProp,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUser, setTypingUser] = useState<{ userId: string; userName: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [creatorOnline, setCreatorOnline] = useState<boolean | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [dmPricing, setDmPricing] = useState<{ text: number; image: number; video: number } | null>(null);
  const [isFan, setIsFan] = useState<boolean | null>(isFanProp ?? null);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [creatorUsername, setCreatorUsername] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesMapRef = useRef<Map<string, number>>(new Map()); // Map<messageId, index> for O(1) lookups
  const scrollPositionRef = useRef<number>(0);
  const isUserScrolledUpRef = useRef<boolean>(false);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second
  const typingDebounceDelay = 300; // 300ms debounce
  const typingTimeoutDelay = 3000; // 3 seconds timeout
  const SCROLL_THRESHOLD = 100; // pixels from bottom to consider "at bottom"

  // Normalize message createdAt to ISO string format
  const normalizeMessage = (message: any): Message => {
    let normalizedCreatedAt: string;
    const createdAt = message.createdAt;
    if (createdAt && typeof createdAt === 'object' && createdAt.constructor === Date) {
      normalizedCreatedAt = createdAt.toISOString();
    } else if (typeof createdAt === 'string') {
      normalizedCreatedAt = createdAt;
    } else {
      normalizedCreatedAt = new Date().toISOString();
    }
    return {
      ...message,
      createdAt: normalizedCreatedAt,
    };
  };

  // Binary search to find insertion index for a message (oldest first)
  const findInsertionIndex = (messages: Message[], newMessage: Message): number => {
    const newTime = new Date(newMessage.createdAt).getTime();
    let left = 0;
    let right = messages.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const midTime = new Date(messages[mid].createdAt).getTime();
      
      if (midTime < newTime) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    return left;
  };

  // Smart message insertion: append if newer than last, binary search if older
  const insertMessageSorted = (
    messages: Message[], 
    newMessage: Message, 
    messagesMap: Map<string, number>
  ): Message[] => {
    // Check for duplicate using Map (O(1))
    const existingIndex = messagesMap.get(newMessage.id);
    if (existingIndex !== undefined && existingIndex < messages.length) {
      // Message exists, update in-place if timestamp hasn't changed significantly
      const existing = messages[existingIndex];
      const existingTime = new Date(existing.createdAt).getTime();
      const newTime = new Date(newMessage.createdAt).getTime();
      
      // If timestamps are very close (within 1 second), just update in-place
      if (Math.abs(existingTime - newTime) < 1000) {
        const updated = [...messages];
        updated[existingIndex] = newMessage;
        return updated;
      }
      
      // Timestamp changed significantly, need to re-insert
      const filtered = messages.filter((_, idx) => idx !== existingIndex);
      // Rebuild map for filtered array
      messagesMap.clear();
      filtered.forEach((msg, idx) => messagesMap.set(msg.id, idx));
      // Continue with insertion logic below
      const insertIndex = findInsertionIndex(filtered, newMessage);
      const result = [...filtered];
      result.splice(insertIndex, 0, newMessage);
      // Rebuild map for new array
      messagesMap.clear();
      result.forEach((msg, idx) => messagesMap.set(msg.id, idx));
      return result;
    }

    // New message - optimize common case: append if newer than last message
    if (messages.length === 0) {
      messagesMap.set(newMessage.id, 0);
      return [newMessage];
    }

    const lastMessage = messages[messages.length - 1];
    const lastTime = new Date(lastMessage.createdAt).getTime();
    const newTime = new Date(newMessage.createdAt).getTime();

    if (newTime >= lastTime) {
      // Append (O(1) - most common case)
      messagesMap.set(newMessage.id, messages.length);
      return [...messages, newMessage];
    }

    // Out of order - use binary search insertion (O(log n))
    const insertIndex = findInsertionIndex(messages, newMessage);
    const result = [...messages];
    result.splice(insertIndex, 0, newMessage);
    // Rebuild map (needed because indices shifted)
    messagesMap.clear();
    result.forEach((msg, idx) => messagesMap.set(msg.id, idx));
    return result;
  };

  // Update messages and map atomically
  const addOrUpdateMessage = (
    prev: Message[], 
    newMessage: Message, 
    messagesMap: Map<string, number>
  ): Message[] => {
    return insertMessageSorted(prev, newMessage, messagesMap);
  };


  // Fetch conversation info to determine creator and fan
  useEffect(() => {
    const fetchConversationInfo = async () => {
      try {
        const response = await fetch(`/api/conversations/${conversationId}`);
        if (response.ok) {
          const conv = await response.json();
          const userIsFan = conv.fanId === currentUserId;
          setIsFan(userIsFan);
          setCreatorId(userIsFan ? conv.creatorId : null);
          setCreatorUsername(userIsFan ? conv.creatorUsername : null);
        }
      } catch (error) {
        console.error("Error fetching conversation info:", error);
      }
    };
    fetchConversationInfo();
  }, [conversationId, currentUserId]);

  // Stream creator online status via SSE (if fan)
  useEffect(() => {
    if (!isFan || !creatorUsername) return;

    // Connect to SSE stream for real-time status updates
    const eventSource = new EventSource(`/api/creator/${creatorUsername}/online-status/stream`);

    eventSource.onopen = () => {
      console.log("Creator status stream connected");
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "status") {
          setCreatorOnline(data.isOnline);
        }
      } catch (error) {
        console.error("Error parsing creator status SSE message:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("Creator status SSE stream error:", error);
      // EventSource will automatically reconnect
    };

    return () => {
      eventSource.close();
    };
  }, [isFan, creatorUsername]);

  // Fetch balance (if fan)
  useEffect(() => {
    if (!isFan) return;

    const fetchBalance = async () => {
      try {
        const response = await fetch("/api/wallet/balance");
        if (response.ok) {
          const data = await response.json();
          setBalance(data.balance);
        }
      } catch (error) {
        console.error("Error fetching balance:", error);
      }
    };

    fetchBalance();
  }, [isFan]);

  // Fetch DM pricing (if fan) - get creator's pricing
  useEffect(() => {
    if (!isFan || !creatorUsername) return;

    const fetchPricing = async () => {
      try {
        const response = await fetch(`/api/creator/${creatorUsername}/pricing`);
        if (response.ok) {
          const data = await response.json();
          setDmPricing({
            text: data.dmTextPrice || 0,
            image: data.dmImagePrice || 0,
            video: data.dmVideoPrice || 0,
          });
        } else {
          // If we can't fetch, set defaults to 0
          setDmPricing({ text: 0, image: 0, video: 0 });
        }
      } catch (error) {
        console.error("Error fetching pricing:", error);
        setDmPricing({ text: 0, image: 0, video: 0 });
      }
    };

    fetchPricing();
  }, [isFan, creatorUsername]);

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        console.log("[ChatInterface] Fetching initial messages for conversation:", conversationId);
        const response = await fetch(`/api/conversations/${conversationId}/messages`);
        if (!response.ok) throw new Error("Failed to fetch messages");
        const data = await response.json();
        // Normalize all messages first (ensure createdAt is ISO string)
        const normalized = data.map((msg: any) => normalizeMessage(msg));
        // Messages from API are already sorted, but ensure they are
        const sortedMessages = [...normalized].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        // Rebuild messages map
        messagesMapRef.current.clear();
        sortedMessages.forEach((msg, idx) => messagesMapRef.current.set(msg.id, idx));
        console.log("[ChatInterface] Fetched", sortedMessages.length, "messages");
        setMessages(sortedMessages);
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
            const rawMessage: any = JSON.parse(event.data);
            // Normalize the message before processing
            const newMessage = normalizeMessage(rawMessage);
            console.log("[ChatInterface] Received message via SSE:", newMessage);
            
            // If fan and this is a creator message, refresh balance (coins may have been deducted)
            if (isFan && newMessage.senderId !== currentUserId) {
              // Creator replied - refresh balance
              fetch("/api/wallet/balance")
                .then((res) => res.json())
                .then((data) => {
                  if (data.balance !== undefined) {
                    setBalance(data.balance);
                  }
                })
                .catch((err) => console.error("Error refreshing balance:", err));
            }
            
            // Update or add message using smart insertion
            setMessages((prev) => {
              const updated = addOrUpdateMessage(prev, newMessage, messagesMapRef.current);
              console.log("[ChatInterface] Message processed, total messages:", updated.length);
              return updated;
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
            console.log("[ChatInterface] Received typing event via SSE:", typingEvent);
            // Only show typing indicator for other users
            if (typingEvent.userId !== currentUserId) {
              console.log("[ChatInterface] Setting typing indicator for:", typingEvent.userName);
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
                console.log("[ChatInterface] Clearing typing indicator");
                setTypingUser(null);
              }, typingTimeoutDelay);
            } else {
              console.log("[ChatInterface] Ignoring typing event from self");
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

  // Get scroll viewport element
  const getScrollViewport = (): HTMLElement | null => {
    if (!scrollAreaRef.current) return null;
    
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
    
    return viewport;
  };

  // Check if user is near bottom of scroll
  const isNearBottom = (): boolean => {
    const viewport = getScrollViewport();
    if (!viewport) return true; // Default to true if can't determine
    
    const { scrollTop, scrollHeight, clientHeight } = viewport;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom <= SCROLL_THRESHOLD;
  };

  // Scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const viewport = getScrollViewport();
    if (viewport) {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior,
      });
      scrollPositionRef.current = viewport.scrollHeight;
      isUserScrolledUpRef.current = false;
    } else {
      // Fallback: use scrollIntoView on anchor element
      messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    }
  };

  // Track scroll position to detect user scrolling
  useEffect(() => {
    // Wait for viewport to be available
    const timeoutId = setTimeout(() => {
      const viewport = getScrollViewport();
      if (!viewport) return;

      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = viewport;
        scrollPositionRef.current = scrollTop;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        isUserScrolledUpRef.current = distanceFromBottom > SCROLL_THRESHOLD;
      };

      viewport.addEventListener("scroll", handleScroll, { passive: true });
      
      // Initial check
      handleScroll();
    }, 100);

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      const viewport = getScrollViewport();
      if (viewport) {
        // Note: We can't remove the specific handler, but that's okay since
        // the viewport will be cleaned up when component unmounts
      }
    };
  }, [messages.length]); // Re-attach when message count changes (viewport might change)

  // Smart auto-scroll: only scroll if user is at bottom or on initial load
  useEffect(() => {
    // Always scroll on initial load
    if (messages.length > 0 && scrollPositionRef.current === 0) {
      requestAnimationFrame(() => {
        setTimeout(() => scrollToBottom("auto"), 100);
      });
      return;
    }

    // For new messages, only auto-scroll if user is near bottom
    if (isNearBottom() && !isUserScrolledUpRef.current) {
      requestAnimationFrame(() => {
        setTimeout(() => scrollToBottom("smooth"), 150);
      });
    }
  }, [messages.length, typingUser]); // Only trigger on message count change or typing

  // Timer effect for recording
  useEffect(() => {
    if (isRecording) {
      // Clear any existing timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      // Start new timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      // Clear timer when not recording
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };
  }, [isRecording]);

  // Send typing event (debounced)
  const sendTypingEvent = async () => {
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
    }

    typingDebounceRef.current = setTimeout(async () => {
      try {
        console.log("[ChatInterface] Sending typing event");
        const response = await fetch(`/api/conversations/${conversationId}/typing`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          console.error("[ChatInterface] Failed to send typing event:", response.status, response.statusText);
        } else {
          console.log("[ChatInterface] Typing event sent successfully");
        }
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

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    
    if (!isImage && !isVideo) {
      setError("Please select an image or video file");
      return;
    }

    // Validate file size
    const maxSize = isVideo ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB for videos, 10MB for images
    if (file.size > maxSize) {
      setError(`File must be less than ${maxSize / (1024 * 1024)}MB`);
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Create preview
    let previewUrl: string;
    if (isImage) {
      const reader = new FileReader();
      previewUrl = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
      setFilePreview(previewUrl);
    } else {
      // For videos, create object URL for preview
      previewUrl = URL.createObjectURL(file);
      setFilePreview(previewUrl);
    }

    // For images, immediately show optimistic message and upload in background
    if (isImage && previewUrl) {
      const tempMessageId = `temp-${Date.now()}`;
      const optimisticMessage: Message = {
        id: tempMessageId,
        senderId: currentUserId,
        content: null,
        messageType: "image",
        mediaUrl: previewUrl,
        thumbnailUrl: null,
        createdAt: new Date().toISOString(),
      };
      
      // Add optimistic message immediately using smart insertion
      setMessages((prev) => addOrUpdateMessage(prev, optimisticMessage, messagesMapRef.current));
      
      // Upload and send in background
      (async () => {
        try {
          const { mediaUrl, thumbnailUrl, messageType } = await uploadMedia(file);
          
          // Get browser timezone
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
          
          // Send the message
          const response = await fetch(`/api/conversations/${conversationId}/messages`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-timezone": timezone,
            },
            body: JSON.stringify({
              content: null,
              messageType,
              mediaUrl,
              thumbnailUrl,
            }),
          });

          if (!response.ok) throw new Error("Failed to send message");

          const newMessage = await response.json();
          
          // Replace optimistic message with real message
          setMessages((prev) => {
            // Remove optimistic message from map
            const optimisticIndex = messagesMapRef.current.get(tempMessageId);
            if (optimisticIndex !== undefined) {
              messagesMapRef.current.delete(tempMessageId);
            }
            const filtered = prev.filter((msg) => msg.id !== tempMessageId);
            // Rebuild map for filtered array
            messagesMapRef.current.clear();
            filtered.forEach((msg, idx) => messagesMapRef.current.set(msg.id, idx));
            // Add real message using smart insertion
            return addOrUpdateMessage(filtered, normalizeMessage(newMessage), messagesMapRef.current);
          });
          
          // Clear file selection
          setSelectedFile(null);
          setFilePreview(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        } catch (error) {
          console.error("Error uploading image:", error);
          // Remove optimistic message on error
          setMessages((prev) => {
            const filtered = prev.filter((msg) => msg.id !== tempMessageId);
            // Rebuild map
            messagesMapRef.current.clear();
            filtered.forEach((msg, idx) => messagesMapRef.current.set(msg.id, idx));
            return filtered;
          });
          setError(error instanceof Error ? error.message : "Failed to upload image");
          // Keep the file selected so user can retry
        }
      })();
    }
  };

  // Handle file removal
  const handleRemoveFile = () => {
    if (filePreview && selectedFile?.type.startsWith("video/")) {
      URL.revokeObjectURL(filePreview);
    }
    setSelectedFile(null);
    setFilePreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Start audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      recordingChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordingChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        
        // Auto-send the recording
        if (blob.size > 0) {
          // Create temporary URL for optimistic message
          const tempUrl = URL.createObjectURL(blob);
          
          // Create optimistic message
          const tempMessageId = `temp-${Date.now()}`;
          const optimisticMessage: Message = {
            id: tempMessageId,
            senderId: currentUserId,
            content: null,
            messageType: "audio",
            mediaUrl: tempUrl,
            thumbnailUrl: null,
            createdAt: new Date().toISOString(),
          };
          
          // Add optimistic message immediately using smart insertion
          setMessages((prev) => addOrUpdateMessage(prev, optimisticMessage, messagesMapRef.current));
          
          // Upload and send in background
          try {
            const audioFile = new File([blob], "recording.webm", { type: "audio/webm" });
            const { mediaUrl, thumbnailUrl, messageType } = await uploadMedia(audioFile);
            
            // Get browser timezone
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
            
            // Send the message
            const response = await fetch(`/api/conversations/${conversationId}/messages`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-user-timezone": timezone,
              },
              body: JSON.stringify({
                content: null,
                messageType,
                mediaUrl,
                thumbnailUrl,
              }),
            });

            if (!response.ok) throw new Error("Failed to send message");

            const newMessage = await response.json();
            
            // Replace optimistic message with real message
            setMessages((prev) => {
              // Remove optimistic message from map
              const optimisticIndex = messagesMapRef.current.get(tempMessageId);
              if (optimisticIndex !== undefined) {
                messagesMapRef.current.delete(tempMessageId);
              }
              const filtered = prev.filter((msg) => msg.id !== tempMessageId);
              // Rebuild map for filtered array
              messagesMapRef.current.clear();
              filtered.forEach((msg, idx) => messagesMapRef.current.set(msg.id, idx));
              // Add real message using smart insertion
              return addOrUpdateMessage(filtered, normalizeMessage(newMessage), messagesMapRef.current);
            });
            
            // Cleanup temp URL
            URL.revokeObjectURL(tempUrl);
          } catch (error) {
            console.error("Error sending audio:", error);
            // Remove optimistic message on error
            setMessages((prev) => {
              const filtered = prev.filter((msg) => msg.id !== tempMessageId);
              // Rebuild map
              messagesMapRef.current.clear();
              filtered.forEach((msg, idx) => messagesMapRef.current.set(msg.id, idx));
              return filtered;
            });
            URL.revokeObjectURL(tempUrl);
            setError(error instanceof Error ? error.message : "Failed to send audio");
          }
        }
        
        // Clear recording state
        setAudioBlob(null);
        setRecordingTime(0);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      console.error("Error starting recording:", error);
      setError("Failed to start recording. Please check microphone permissions.");
    }
  };

  // Stop audio recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      setIsRecording(false);
      // Stop will trigger onstop handler which auto-sends
      mediaRecorderRef.current.stop();
    }
  };

  // Cancel audio recording
  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    setAudioBlob(null);
    setRecordingTime(0);
  };

  // Format recording time
  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Upload media file
  const uploadMedia = async (file: File): Promise<{ mediaUrl: string; thumbnailUrl: string | null; messageType: "image" | "video" | "audio" }> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`/api/conversations/${conversationId}/media`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Upload failed" }));
      throw new Error(errorData.error || "Failed to upload media");
    }

    return await response.json();
  };

  // Send media message
  const sendMediaMessage = async (mediaUrl: string, thumbnailUrl: string | null, messageType: "image" | "video" | "audio", content?: string) => {
    // If fan, check creator online status
    if (isFan) {
      if (creatorOnline === false) {
        setError("Creator is offline. DM features are disabled.");
        setTimeout(() => setError(null), 5000);
        return;
      }
      if (creatorOnline === null) {
        // Still loading, wait
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get browser timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-timezone": timezone,
        },
        body: JSON.stringify({
          content: content || null,
          messageType,
          mediaUrl,
          thumbnailUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || "Failed to send message";
        throw new Error(errorMessage);
      }

      const newMessage = await response.json();
      setMessages((prev) => addOrUpdateMessage(prev, normalizeMessage(newMessage), messagesMapRef.current));

      // Update balance if fan (coins will be deducted when creator replies)
      if (isFan && dmPricing && balance !== null) {
        const price = messageType === "image" ? dmPricing.image : messageType === "video" ? dmPricing.video : 0;
        if (price > 0) {
          // Balance will be updated when creator replies
        }
      }

      // Clear media state
      if (selectedFile) {
        handleRemoveFile();
      }
      if (audioBlob) {
        setAudioBlob(null);
        setRecordingTime(0);
      }
    } catch (error) {
      console.error("Error sending media message:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to send media message";
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  // Handle send with media
  const handleSendWithMedia = async () => {
    if (selectedFile) {
      try {
        setUploadProgress(0);
        const { mediaUrl, thumbnailUrl, messageType } = await uploadMedia(selectedFile);
        await sendMediaMessage(mediaUrl, thumbnailUrl, messageType, inputValue.trim() || undefined);
        setInputValue("");
      } catch (error) {
        console.error("Error uploading media:", error);
        setError(error instanceof Error ? error.message : "Failed to upload file");
      }
    } else if (audioBlob) {
      try {
        setUploadProgress(0);
        // Convert blob to file
        const audioFile = new File([audioBlob], "recording.webm", { type: "audio/webm" });
        const { mediaUrl, thumbnailUrl, messageType } = await uploadMedia(audioFile);
        await sendMediaMessage(mediaUrl, thumbnailUrl, messageType, inputValue.trim() || undefined);
        setInputValue("");
      } catch (error) {
        console.error("Error uploading audio:", error);
        setError(error instanceof Error ? error.message : "Failed to upload audio");
      }
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If there's media to send, use media send handler
    if (selectedFile || audioBlob) {
      await handleSendWithMedia();
      return;
    }

    if (!inputValue.trim()) return;

    // If fan, check creator online status
    if (isFan) {
      if (creatorOnline === false) {
        setError("Creator is offline. DM features are disabled.");
        setTimeout(() => setError(null), 5000);
        return;
      }
      if (creatorOnline === null) {
        // Still loading, wait
        return;
      }
    }

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
    setError(null);

    try {
      // Get browser timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-timezone": timezone,
        },
        body: JSON.stringify({
          content: messageContent,
          messageType: "text",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || "Failed to send message";
        throw new Error(errorMessage);
      }

      const newMessage = await response.json();
      console.log("[ChatInterface] Message sent successfully:", newMessage);
      
      // Update balance if fan (coins will be deducted when creator replies)
      if (isFan && dmPricing && balance !== null) {
        // Preview: show pending coins (not deducted yet)
        const price = dmPricing.text;
        if (price > 0) {
          // Balance will be updated when creator replies
        }
      }
      
      // Message will be added via SSE, but add it optimistically for immediate UI update
      setMessages((prev) => addOrUpdateMessage(prev, normalizeMessage(newMessage), messagesMapRef.current));
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to send message";
      setError(errorMessage);
      setInputValue(messageContent); // Restore input on error
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (filePreview && selectedFile?.type.startsWith("video/")) {
        URL.revokeObjectURL(filePreview);
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [filePreview, selectedFile, isRecording]);

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
                      {message.messageType === "audio" && (
                        <AudioMessagePlayer
                          audioUrl={message.mediaUrl}
                          className={isOwn ? "text-primary-foreground" : ""}
                        />
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <p
                      className={`text-xs ${
                        isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}
                    >
                      {formatDistanceToNow(new Date(message.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                    {isOwn && isFan && message.coinsPending && !message.coinsDeducted && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Coins className="h-3 w-3" />
                        {message.coinsPending} coins pending
                      </span>
                    )}
                  </div>
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
        {/* Creator offline message (for fans) */}
        {isFan && creatorOnline === false && (
          <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800 rounded-md text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>Creator is offline. DM features are disabled.</span>
          </div>
        )}

        {/* Coin cost preview (for fans when creator is online) */}
        {isFan && creatorOnline === true && dmPricing && (
          <div className="mb-2 text-xs text-muted-foreground flex items-center gap-1">
            <Coins className="h-3 w-3" />
            <span>
              Text: {dmPricing.text} coins | Image: {dmPricing.image} coins | Video: {dmPricing.video} coins
              {balance !== null && ` | Balance: ${balance} coins`}
            </span>
          </div>
        )}

        {/* Pending charge notice */}
        {isFan && (
          <div className="mb-2 text-xs text-muted-foreground italic">
            Coins will be deducted when creator responds
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-2 p-2 bg-destructive/10 text-destructive text-sm rounded">
            {error}
          </div>
        )}

        {/* File preview - only show for videos or if image upload failed */}
        {filePreview && selectedFile && !selectedFile.type.startsWith("image/") && (
          <div className="mb-2 relative">
            <div className="relative inline-block">
              <video
                src={filePreview}
                className="max-w-[200px] max-h-[200px] rounded"
                controls={false}
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6"
                onClick={handleRemoveFile}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}


        {/* Recording indicator */}
        {isRecording && (
          <div className="mb-2 p-2 bg-destructive/10 rounded flex items-center gap-2">
            <div className="h-2 w-2 bg-destructive rounded-full animate-pulse" />
            <span className="text-sm">Recording... {formatRecordingTime(recordingTime)}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={stopRecording}
              className="ml-auto"
            >
              Stop
            </Button>
          </div>
        )}

        {/* Upload progress */}
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="mb-2">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isRecording || (isFan && creatorOnline === false) || creatorOnline === null}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          {!isRecording && !audioBlob ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={startRecording}
              disabled={isLoading || !!selectedFile || (isFan && creatorOnline === false) || creatorOnline === null}
            >
              <Mic className="h-4 w-4" />
            </Button>
          ) : isRecording ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={cancelRecording}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
          <Input
            value={inputValue}
            onChange={handleInputChange}
            placeholder={
              isFan && creatorOnline === false
                ? "Creator is offline..."
                : "Type a message..."
            }
            disabled={
              isLoading ||
              isRecording ||
              (isFan && creatorOnline === false) || creatorOnline === null // Disable if creator is offline
            }
          />
          <Button
            type="submit"
            disabled={
              isLoading ||
              isRecording ||
              (!inputValue.trim() && !selectedFile && !audioBlob) ||
              (isFan && creatorOnline === false) || creatorOnline === null // Disable if creator is offline
            }
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

