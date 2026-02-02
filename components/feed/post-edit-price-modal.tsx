"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import toast from "react-hot-toast"
import { Loader2 } from "lucide-react"
import { PriceDisplay } from "@/components/currency/price-display"

interface PostEditPriceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId: string
  currentPrice: number | null
  currency?: string
  onSuccess?: (newPrice: number | null) => void
}

export function PostEditPriceModal({
  open,
  onOpenChange,
  postId,
  currentPrice,
  currency = "INR",
  onSuccess,
}: PostEditPriceModalProps) {
  const [priceInput, setPriceInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setPriceInput(currentPrice != null ? (currentPrice / 100).toString() : "")
    }
  }, [open, currentPrice])

  const handleSubmit = async () => {
    const parsed = parseFloat(priceInput)
    if (Number.isNaN(parsed) || parsed < 0) {
      toast.error("Please enter a valid price")
      return
    }
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: parsed }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error((data as { error?: string }).error || "Failed to update price")
      }
      toast.success("Price updated")
      onSuccess?.((data as { post?: { price?: number | null } }).post?.price ?? null)
      onOpenChange(false)
    } catch (error) {
      console.error("Error updating price:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update price")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit price</DialogTitle>
          <DialogDescription>
            Set the price for this exclusive post. Price is in main currency units.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-price">Price ({currency})</Label>
            <Input
              id="edit-price"
              type="number"
              min={0}
              step={0.01}
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="0.00"
            />
            {priceInput && !Number.isNaN(parseFloat(priceInput)) && (
              <p className="text-xs text-muted-foreground">
                Display: <PriceDisplay amount={Math.round(parseFloat(priceInput) * 100)} currency={currency} />
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
