"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { LiveKitRoom } from "@livekit/components-react";
import { LiveStreamView } from "./live-stream-view";
import { PaymentModal } from "@/components/payments/payment-modal";
import { env } from "@/env";
import { PriceDisplay } from "@/components/currency/price-display";
import { toSubunits } from "@/lib/currency/currency-utils";

interface LiveViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  streamId: string;
  creatorId: string;
  streamType: "free" | "follower_only" | "paid";
  price?: number | null;
  currency?: string; // ISO 4217 currency code (defaults to INR for backward compatibility)
}

export function LiveViewerModal({
  open,
  onOpenChange,
  streamId,
  creatorId,
  streamType,
  price,
  currency = "INR",
}: LiveViewerModalProps) {
  const [token, setToken] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSearchParams(new URLSearchParams(window.location.search));
    }
  }, []);

  // Check payment status from URL params after payment callback
  useEffect(() => {
    if (searchParams) {
      const status = searchParams.get("status");
      const transactionId = searchParams.get("transactionId");
      const urlStreamId = searchParams.get("streamId");

      if (status === "success" && urlStreamId === streamId && transactionId) {
        // Payment successful, try to join again
        handleJoin();
        // Clean up URL params
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("status");
        newUrl.searchParams.delete("transactionId");
        newUrl.searchParams.delete("streamId");
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, [searchParams, streamId]);

  const handleJoin = async () => {
    setIsLoading(true);
    setError(null);
    setRequiresPayment(false);

    try {
      const response = await fetch(`/api/live/${streamId}/join`, {
        method: "POST",
      });

      if (response.status === 402) {
        // Payment required
        const data = await response.json();
        setRequiresPayment(true);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to join stream");
      }

      const data = await response.json();
      setToken(data.token);
      setRoomName(data.roomName);
    } catch (err) {
      console.error("Error joining stream:", err);
      setError(err instanceof Error ? err.message : "Failed to join stream");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setToken(null);
    setRoomName(null);
    setError(null);
    setRequiresPayment(false);
    onOpenChange(false);
  };

  // Auto-join when modal opens
  useEffect(() => {
    if (open && !token && !isLoading && !error && !requiresPayment) {
      handleJoin();
    }
  }, [open]);

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    handleJoin();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-6xl w-full h-[90vh] p-0 gap-0">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Live Stream</DialogTitle>
                <DialogDescription>
                  {streamType === "free"
                    ? "Free stream"
                    : streamType === "follower_only"
                      ? "Follower-only stream"
                      : price ? (
                        <>Paid stream - <PriceDisplay amount={toSubunits(price, currency)} originalCurrency={currency} /></>
                      ) : "Paid stream"}
                </DialogDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 relative bg-black">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>Joining stream...</p>
                </div>
              </div>
            )}

            {error && !requiresPayment && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <p className="mb-4">{error}</p>
                  <Button onClick={handleJoin}>Try Again</Button>
                </div>
              </div>
            )}

            {requiresPayment && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white p-8">
                  <p className="mb-4 text-lg">
                    This is a paid stream. Pay{" "}
                    {price && (
                      <PriceDisplay
                        amount={toSubunits(price, currency)}
                        originalCurrency={currency}
                      />
                    )}{" "}
                    to join.
                  </p>
                  <Button
                    onClick={() => setShowPaymentModal(true)}
                    size="lg"
                  >
                    Pay to Join
                  </Button>
                </div>
              </div>
            )}

            {token && roomName && (
              <LiveKitRoom
                serverUrl={env.NEXT_PUBLIC_LIVEKIT_URL}
                token={token}
                connect={true}
                audio={true}
                video={true}
                onDisconnected={handleClose}
              >
                <LiveStreamView isCreator={false} />
              </LiveKitRoom>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {showPaymentModal && price && (
        <PaymentModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          type="live_stream"
          entityId={streamId}
          amount={price}
          title="Join Live Stream"
          currency={currency}
          description={`Pay to access this live stream`}
          originUrl={typeof window !== "undefined" ? window.location.href : ""}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}
