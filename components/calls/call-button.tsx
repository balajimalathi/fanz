"use client";

import { useState } from "react";
import { Phone, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface CallButtonProps {
  receiverId: string;
  conversationId?: string;
  callType: "audio" | "video";
  disabled?: boolean;
}

export function CallButton({
  receiverId,
  conversationId,
  callType,
  disabled = false,
}: CallButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCall = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/calls/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId,
          callType,
          conversationId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to initiate call");
      }

      const data = await response.json();
      // Navigate to call page or show call modal
      router.push(`/calls/${data.call.id}`);
    } catch (error: any) {
      alert(error.message || "Failed to start call");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleCall}
      disabled={disabled || isLoading}
      title={`Start ${callType} call`}
    >
      {callType === "audio" ? (
        <Phone className="h-4 w-4" />
      ) : (
        <Video className="h-4 w-4" />
      )}
    </Button>
  );
}

