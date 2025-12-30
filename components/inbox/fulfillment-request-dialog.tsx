"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { OnlineStatusIndicator } from "./online-status-indicator";
import { Loader2 } from "lucide-react";

interface FulfillmentRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  creatorId: string;
  fanId: string;
  onStart: () => void;
}

export function FulfillmentRequestDialog({
  open,
  onOpenChange,
  orderId,
  creatorId,
  fanId,
  onStart,
}: FulfillmentRequestDialogProps) {
  const [onlineStatus, setOnlineStatus] = useState({ creator: false, fan: false });
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!open) return;

    const checkOnlineStatus = async () => {
      try {
        const res = await fetch(`/api/service-orders/${orderId}/online-status`);
        if (res.ok) {
          const status = await res.json();
          setOnlineStatus(status);
          setIsChecking(false);

          // Auto-start if both online
          if (status.bothOnline) {
            onStart();
          }
        }
      } catch (error) {
        console.error("Error checking online status:", error);
        setIsChecking(false);
      }
    };

    checkOnlineStatus();
    const interval = setInterval(checkOnlineStatus, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [open, orderId, onStart]);

  const canStart = onlineStatus.creator && onlineStatus.fan;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Fulfillment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Creator Status:</span>
              <OnlineStatusIndicator userId={creatorId} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Fan Status:</span>
              <OnlineStatusIndicator userId={fanId} />
            </div>
          </div>

          {isChecking ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !canStart ? (
            <div className="text-sm text-muted-foreground text-center py-2">
              Waiting for both parties to be online...
            </div>
          ) : (
            <Button onClick={onStart} className="w-full">
              Start Fulfillment
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

