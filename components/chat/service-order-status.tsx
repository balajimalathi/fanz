"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface ServiceOrderStatusProps {
  serviceOrderId?: string | null;
  conversationId: string;
  userRole: "creator" | "fan";
  isPending: boolean;
  hasServiceOrder: boolean;
  onAccept?: () => void;
  onStart?: () => void;
  className?: string;
}

export function ServiceOrderStatus({
  serviceOrderId,
  conversationId,
  userRole,
  isPending,
  hasServiceOrder,
  onAccept,
  onStart,
  className,
}: ServiceOrderStatusProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAccept = async () => {
    if (!serviceOrderId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/chat/service-order/${serviceOrderId}/accept`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to accept");
      }

      if (onAccept) {
        onAccept();
      }
    } catch (error) {
      console.error("Error accepting chat:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = async () => {
    if (!serviceOrderId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/chat/service-order/${serviceOrderId}/start`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to start");
      }

      if (onStart) {
        onStart();
      }
    } catch (error) {
      console.error("Error starting chat:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // If conversation is enabled, don't show status
  if (!isPending) {

    return <p>No service order status</p>;
    // return null;
  }

  // If no service order exists
  if (!hasServiceOrder) {
    if (userRole === "fan") {
      return (
        <div className={className}>
          <p className="text-sm text-muted-foreground">
            Purchase a chat service to start conversation
          </p>
        </div>
      );
    } else {
      return (
        <div className={className}>
          <p className="text-sm text-muted-foreground">
            No active service order. Fan must purchase chat service first.
          </p>
        </div>
      );
    }
  }

  // Service order exists but pending
  if (userRole === "fan") {
    return (
      <div className={className}>
        <p className="text-sm text-muted-foreground">
          Pending - Waiting for creator to start conversation
        </p>
      </div>
    );
  }

  // Creator with service order - can start
  return (
    <div className={className}>
      <Button
        onClick={handleStart}
        disabled={isLoading || !serviceOrderId}
        size="sm"
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Starting...
          </>
        ) : (
          "Accept and Start Conversation"
        )}
      </Button>
    </div>
  );
}

