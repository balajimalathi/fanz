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
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth/auth-client";

interface LiveStreamTipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  streamId: string;
  creatorId: string;
  creatorName: string;
  onSuccess?: () => void;
  onTipSent?: (coins: number) => void;
}

const PRESET_COIN_AMOUNTS = [10, 25, 50, 100, 250, 500];

export function LiveStreamTipModal({
  open,
  onOpenChange,
  streamId,
  creatorId,
  creatorName,
  onSuccess,
  onTipSent,
}: LiveStreamTipModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const { data: session } = useSession();

  // Fetch wallet balance
  useEffect(() => {
    if (open) {
      setIsLoadingBalance(true);
      fetch("/api/wallet/balance")
        .then((res) => res.json())
        .then((data) => {
          if (data.balance !== undefined) {
            setWalletBalance(data.balance);
          }
        })
        .catch((err) => {
          console.error("Error fetching wallet balance:", err);
        })
        .finally(() => {
          setIsLoadingBalance(false);
        });
    }
  }, [open]);

  // Reset when modal opens/closes
  useEffect(() => {
    if (open) {
      setSelectedAmount(null);
      setCustomAmount("");
    }
  }, [open]);

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const getFinalAmount = (): number => {
    if (selectedAmount !== null) {
      return selectedAmount;
    }
    const custom = parseInt(customAmount, 10);
    return isNaN(custom) || custom <= 0 ? 0 : custom;
  };

  const handleTip = async () => {
    const coins = getFinalAmount();
    if (coins <= 0) {
      toast.error("Please enter a valid coin amount");
      return;
    }

    if (walletBalance !== null && walletBalance < coins) {
      toast.error(`Insufficient coins. You have ${walletBalance} coins.`);
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/live/${streamId}/tip`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ coins }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send tip");
      }

      toast.success("Tip sent successfully!");
      
      // Notify parent to send tip notification via data channel
      if (onTipSent) {
        onTipSent(coins);
      }
      
      onOpenChange(false);
      setSelectedAmount(null);
      setCustomAmount("");
      
      // Refresh wallet balance
      if (walletBalance !== null) {
        setWalletBalance(walletBalance - coins);
      }
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Tip error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send tip");
    } finally {
      setIsProcessing(false);
    }
  };

  const finalAmount = getFinalAmount();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tip {creatorName}</DialogTitle>
          <DialogDescription>
            Send coins from your wallet to show your appreciation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Wallet Balance */}
          {isLoadingBalance ? (
            <div className="text-sm text-muted-foreground">Loading balance...</div>
          ) : walletBalance !== null ? (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Your Balance:</span>
                <span className="text-lg font-bold">{walletBalance} coins</span>
              </div>
            </div>
          ) : null}

          {/* Preset Amounts */}
          <div className="grid grid-cols-3 gap-2">
            {PRESET_COIN_AMOUNTS.map((amount) => (
              <Button
                key={amount}
                variant={selectedAmount === amount ? "default" : "outline"}
                onClick={() => handleAmountSelect(amount)}
                disabled={walletBalance !== null && walletBalance < amount}
                className={
                  selectedAmount === amount
                    ? "bg-pink-600 hover:bg-pink-700"
                    : ""
                }
              >
                {amount}
              </Button>
            ))}
          </div>

          {/* Custom Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Custom Amount (coins)</label>
            <Input
              type="number"
              min="1"
              step="1"
              placeholder="Enter coin amount"
              value={customAmount}
              onChange={(e) => handleCustomAmountChange(e.target.value)}
              disabled={isProcessing}
            />
          </div>

          {/* Total Display */}
          {finalAmount > 0 && (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <span className="text-sm font-medium">Total Coins</span>
              <span className="text-2xl font-bold">{finalAmount} coins</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTip}
              disabled={
                isProcessing ||
                finalAmount <= 0 ||
                (walletBalance !== null && walletBalance < finalAmount) ||
                isLoadingBalance
              }
              className="flex-1 bg-pink-600 hover:bg-pink-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Send Tip"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
