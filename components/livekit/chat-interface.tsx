"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Paperclip, Mic, X, Loader2 } from "lucide-react";
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
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
      
      // Add optimistic message immediately
      setMessages((prev) => [...prev, optimisticMessage]);
      
      // Upload and send in background
      (async () => {
        try {
          const { mediaUrl, thumbnailUrl, messageType } = await uploadMedia(file);
          
          // Send the message
          const response = await fetch(`/api/conversations/${conversationId}/messages`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
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
            const filtered = prev.filter((msg) => msg.id !== tempMessageId);
            const exists = filtered.some((msg) => msg.id === newMessage.id);
            if (exists) {
              return filtered;
            }
            return [...filtered, newMessage];
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
          setMessages((prev) => prev.filter((msg) => msg.id !== tempMessageId));
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
          
          // Add optimistic message immediately
          setMessages((prev) => [...prev, optimisticMessage]);
          
          // Upload and send in background
          try {
            const audioFile = new File([blob], "recording.webm", { type: "audio/webm" });
            const { mediaUrl, thumbnailUrl, messageType } = await uploadMedia(audioFile);
            
            // Send the message
            const response = await fetch(`/api/conversations/${conversationId}/messages`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
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
              const filtered = prev.filter((msg) => msg.id !== tempMessageId);
              const exists = filtered.some((msg) => msg.id === newMessage.id);
              if (exists) {
                return filtered;
              }
              return [...filtered, newMessage];
            });
            
            // Cleanup temp URL
            URL.revokeObjectURL(tempUrl);
          } catch (error) {
            console.error("Error sending audio:", error);
            // Remove optimistic message on error
            setMessages((prev) => prev.filter((msg) => msg.id !== tempMessageId));
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
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content || null,
          messageType,
          mediaUrl,
          thumbnailUrl,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const newMessage = await response.json();
      setMessages((prev) => {
        const exists = prev.some((msg) => msg.id === newMessage.id);
        if (exists) {
          return prev;
        }
        return [...prev, newMessage];
      });

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
      setError(error instanceof Error ? error.message : "Failed to send media message");
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
            disabled={isLoading || isRecording}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          {!isRecording && !audioBlob ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={startRecording}
              disabled={isLoading || !!selectedFile}
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
            placeholder="Type a message..."
            disabled={isLoading || isRecording}
          />
          <Button
            type="submit"
            disabled={
              isLoading ||
              isRecording ||
              (!inputValue.trim() && !selectedFile && !audioBlob)
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

