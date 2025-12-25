"use client";

import { useState, useEffect } from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface IncomingCallModalProps {
  callId: string;
  callerName: string;
  callerImage?: string | null;
  callType: "audio" | "video";
  isOpen: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallModal({
  callId,
  callerName,
  callerImage,
  callType,
  isOpen,
  onAccept,
  onReject,
}: IncomingCallModalProps) {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const handleAccept = async () => {
    try {
      const response = await fetch(`/api/calls/${callId}/accept`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to accept call");

      onAccept();
    } catch (error) {
      console.error("Error accepting call:", error);
      alert("Failed to accept call");
    }
  };

  const handleReject = async () => {
    try {
      await fetch(`/api/calls/${callId}/reject`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Error rejecting call:", error);
    } finally {
      onReject();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleReject()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Incoming {callType} call</DialogTitle>
          <DialogDescription>
            <div className="flex flex-col items-center gap-4 py-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={callerImage || undefined} alt={callerName} />
                <AvatarFallback>
                  {callerName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="text-lg font-semibold">{callerName}</p>
                <p className="text-sm text-muted-foreground">
                  {callType === "audio" ? "Audio call" : "Video call"}
                </p>
              </div>
              <div className="flex gap-4">
                <Button
                  onClick={handleReject}
                  variant="destructive"
                  size="lg"
                  className="rounded-full h-14 w-14"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
                <Button
                  onClick={handleAccept}
                  size="lg"
                  className="rounded-full h-14 w-14 bg-green-500 hover:bg-green-600"
                >
                  {callType === "audio" ? (
                    <Phone className="h-6 w-6" />
                  ) : (
                    <Video className="h-6 w-6" />
                  )}
                </Button>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

