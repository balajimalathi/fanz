"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff } from "lucide-react";

interface IncomingCallModalProps {
  open: boolean;
  callId: string;
  callerName: string;
  callerImage?: string | null;
  callType: "audio" | "video";
  onAccept: () => void;
  onReject: () => void;
}

const TIMEOUT_SECONDS = 30;

export function IncomingCallModal({
  open,
  callId,
  callerName,
  callerImage,
  callType,
  onAccept,
  onReject,
}: IncomingCallModalProps) {
  const [timeRemaining, setTimeRemaining] = useState(TIMEOUT_SECONDS);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset timer when modal opens
  useEffect(() => {
    if (open) {
      setTimeRemaining(TIMEOUT_SECONDS);
      setIsProcessing(false);
    }
  }, [open, callId]);

  // Countdown timer
  useEffect(() => {
    if (!open || isProcessing) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto-reject on timeout
          handleReject();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open, isProcessing]);

  const handleAccept = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    onAccept();
  };

  const handleReject = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    onReject();
  };

  const formatTime = (seconds: number): string => {
    return `${seconds}s`;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !isProcessing && handleReject()}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={callerImage || undefined} alt={callerName} />
              <AvatarFallback className="text-2xl">
                {callerName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-center space-y-2">
              <DialogTitle className="text-2xl">{callerName}</DialogTitle>
              <DialogDescription>
                {callType === "audio" ? "Incoming audio call" : "Incoming video call"}
              </DialogDescription>
              {timeRemaining > 0 && (
                <p className="text-sm text-muted-foreground">
                  {formatTime(timeRemaining)}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>
        <div className="flex gap-3 justify-center pb-4">
          <Button
            variant="destructive"
            size="lg"
            onClick={handleReject}
            disabled={isProcessing}
            className="h-14 w-14 rounded-full"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
          <Button
            variant="default"
            size="lg"
            onClick={handleAccept}
            disabled={isProcessing}
            className="h-14 w-14 rounded-full"
          >
            <Phone className="h-6 w-6" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

