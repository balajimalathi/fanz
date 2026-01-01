"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface StartLiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StartLiveModal({ open, onOpenChange }: StartLiveModalProps) {
  const router = useRouter();
  const [streamType, setStreamType] = useState<"free" | "follower_only" | "paid">("free");
  const [price, setPrice] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const requestBody: { streamType: string; price?: number } = {
        streamType,
      };

      if (streamType === "paid") {
        const priceValue = parseFloat(price);
        if (isNaN(priceValue) || priceValue <= 0) {
          setError("Please enter a valid price greater than 0");
          setIsLoading(false);
          return;
        }
        requestBody.price = priceValue;
      }

      const response = await fetch("/api/live/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start live stream");
      }

      // Redirect to live page with stream ID
      router.push(`/home/live?streamId=${data.streamId}`);
      onOpenChange(false);
    } catch (err) {
      console.error("Error starting live stream:", err);
      setError(err instanceof Error ? err.message : "Failed to start live stream");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError(null);
      setStreamType("free");
      setPrice("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start Live Stream</DialogTitle>
          <DialogDescription>
            Choose the type of stream you want to start
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Stream Type Selection */}
          <div className="space-y-3">
            <Label>Stream Type</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="free"
                  name="streamType"
                  value="free"
                  checked={streamType === "free"}
                  onChange={() => setStreamType("free")}
                  className="h-4 w-4"
                  disabled={isLoading}
                />
                <Label htmlFor="free" className="font-normal cursor-pointer">
                  Free - Anyone can join
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="follower_only"
                  name="streamType"
                  value="follower_only"
                  checked={streamType === "follower_only"}
                  onChange={() => setStreamType("follower_only")}
                  className="h-4 w-4"
                  disabled={isLoading}
                />
                <Label htmlFor="follower_only" className="font-normal cursor-pointer">
                  Follower Only - Only followers can join
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="paid"
                  name="streamType"
                  value="paid"
                  checked={streamType === "paid"}
                  onChange={() => setStreamType("paid")}
                  className="h-4 w-4"
                  disabled={isLoading}
                />
                <Label htmlFor="paid" className="font-normal cursor-pointer">
                  Paid - Users must pay to join
                </Label>
              </div>
            </div>
          </div>

          {/* Price Input (only for paid) */}
          {streamType === "paid" && (
            <div className="space-y-2">
              <Label htmlFor="price">Price (₹)</Label>
              <Input
                id="price"
                type="number"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min="0"
                step="0.01"
                disabled={isLoading}
              />
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleStart} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              "Start Live"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
