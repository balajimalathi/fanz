"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Heart } from "lucide-react";
import { LiveKitRoom } from "@livekit/components-react";
import { PaymentModal } from "@/components/payments/payment-modal";
import { LiveViewerContent } from "./live-viewer-content";
import { env } from "@/env";
import { PriceDisplay } from "@/components/currency/price-display";
import { toSubunits } from "@/lib/currency/currency-utils";
import { useSession } from "@/lib/auth/auth-client";

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
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);
  const { data: session } = useSession();

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
      setStartedAt(data.startedAt);
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

  // Track if close was initiated by back button
  const closeInitiatedByButton = useRef(false);

  // Prevent closing on mobile (outside click or ESC)
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
      // On mobile, only allow closing via back button
      if (isMobile && !closeInitiatedByButton.current) {
        return;
      }
      closeInitiatedByButton.current = false;
      handleClose();
    }
  };

  const handleBackButtonClick = () => {
    closeInitiatedByButton.current = true;
    handleClose();
  };

  // Prevent outside click on mobile
  const handleInteractOutside = (e: Event) => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    if (isMobile) {
      e.preventDefault();
    }
  };

  // Prevent ESC key on mobile
  const handleEscapeKeyDown = (e: KeyboardEvent) => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    if (isMobile) {
      e.preventDefault();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent 
          className="w-full max-w-full md:max-w-6xl h-screen md:h-[90vh] p-0 gap-0 rounded-none md:rounded-lg max-h-screen md:max-h-[90vh] top-0 md:top-[50%] left-0 md:left-[50%] translate-x-0 md:translate-x-[-50%] translate-y-0 md:translate-y-[-50%] [&>button]:hidden md:[&>button]:block"
          onInteractOutside={handleInteractOutside}
          onEscapeKeyDown={handleEscapeKeyDown}
        >
          <DialogHeader className="p-3 md:p-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBackButtonClick}
                  className="md:hidden h-8 w-8 shrink-0"
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-base md:text-lg truncate">Live Stream</DialogTitle>
                  <DialogDescription className="text-xs md:text-sm truncate">
                    {streamType === "free"
                      ? "Free stream"
                      : streamType === "follower_only"
                        ? "Follower-only stream"
                        : price ? (
                          <>Paid stream - <PriceDisplay amount={toSubunits(price, currency)} originalCurrency={currency} /></>
                        ) : "Paid stream"}
                  </DialogDescription>
                </div>
              </div> 
            </div>
          </DialogHeader>

          <div className="flex-1 relative bg-black">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white px-4">
                  <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm md:text-base">Joining stream...</p>
                </div>
              </div>
            )}

            {error && !requiresPayment && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white px-4">
                  <p className="mb-4 text-sm md:text-base">{error}</p>
                  <Button onClick={handleJoin} size="sm" className="md:size-default">Try Again</Button>
                </div>
              </div>
            )}

            {requiresPayment && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white p-4 md:p-8">
                  <p className="mb-4 text-sm md:text-lg">
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
                    size="default"
                    className="md:size-lg"
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
                <LiveViewerContent
                  streamId={streamId}
                  creatorId={creatorId}
                  startedAt={startedAt}
                  showTipModal={showTipModal}
                  setShowTipModal={setShowTipModal}
                />
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
