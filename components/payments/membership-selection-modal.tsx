"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { PaymentModal } from "./payment-modal"
import {
  BUNDLE_OPTIONS,
  calculateBundlePrice,
  calculateSavings,
  type BundleDuration,
} from "@/lib/utils/membership-pricing"
import { PriceDisplay } from "@/components/currency/price-display"
import { toSubunits } from "@/lib/currency/currency-utils"

interface MembershipSelectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  creatorId: string
  memberships: Array<{
    id: string
    title: string
    description: string
    monthlyRecurringFee: number
    currency?: string // ISO 4217 currency code
    coverImageUrl?: string | null
  }>
  originUrl?: string
}

export function MembershipSelectionModal({
  open,
  onOpenChange,
  creatorId,
  memberships,
  originUrl,
}: MembershipSelectionModalProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null)
  const [showMembershipDetails, setShowMembershipDetails] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedDuration, setSelectedDuration] = useState<BundleDuration>(1)
  const [isLoading, setIsLoading] = useState(false)

  // Get origin URL from prop or use current pathname
  const currentOriginUrl = originUrl || pathname || "/"

  const selectedMembership = memberships.find((m) => m.id === selectedMembershipId)
  const membershipCurrency = selectedMembership?.currency || "INR"

  // Calculate pricing for selected duration
  const bundlePrice =
    selectedMembership && selectedDuration
      ? calculateBundlePrice(selectedMembership.monthlyRecurringFee, selectedDuration)
      : 0
  const savings =
    selectedMembership && selectedDuration
      ? calculateSavings(selectedMembership.monthlyRecurringFee, selectedDuration)
      : 0
  const bundleOption = BUNDLE_OPTIONS.find((b) => b.duration === selectedDuration)

  const handleSelectMembership = (membershipId: string) => {
    setSelectedMembershipId(membershipId)
    setSelectedDuration(1) // Reset to 1 month
    setShowMembershipDetails(true)
  }

  const handleProceedToPayment = () => {
    if (selectedMembership && selectedDuration) {
      setShowMembershipDetails(false)
      setShowPaymentModal(true)
    }
  }

  const handlePaymentComplete = () => {
    setShowPaymentModal(false)
    onOpenChange(false)
    setSelectedMembershipId(null)
    setShowMembershipDetails(false)
    setSelectedDuration(1)
  }

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedMembershipId(null)
      setShowMembershipDetails(false)
      setShowPaymentModal(false)
      setSelectedDuration(1)
    }
  }, [open])

  return (
    <>
      {/* Membership Selection Dialog */}
      <Dialog open={open && !showMembershipDetails && !showPaymentModal} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose a Membership</DialogTitle>
            <DialogDescription>
              Select a membership plan to unlock all content from this creator
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {memberships.map((membership) => (
              <div
                key={membership.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedMembershipId === membership.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => handleSelectMembership(membership.id)}
              >
                {membership.coverImageUrl && (
                  <img
                    src={membership.coverImageUrl}
                    alt={membership.title}
                    className="w-full h-32 object-cover rounded-md mb-3"
                  />
                )}
                <h3 className="font-semibold text-lg mb-2">{membership.title}</h3>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {membership.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    <PriceDisplay
                      amount={toSubunits(membership.monthlyRecurringFee, membership.currency || "INR")}
                      originalCurrency={membership.currency || "INR"}
                      className="text-2xl font-bold"
                    />
                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                  </span>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelectMembership(membership.id)
                    }}
                  >
                    Select
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Membership Details & Duration Selection Dialog */}
      {selectedMembership && (
        <Dialog open={showMembershipDetails && !showPaymentModal} onOpenChange={(open) => {
          if (!open) {
            setShowMembershipDetails(false)
            setSelectedMembershipId(null)
          }
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedMembership.title}</DialogTitle>
              <DialogDescription>
                {selectedMembership.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {selectedMembership.coverImageUrl && (
                <div className="relative w-full h-48 rounded-lg overflow-hidden">
                  <img
                    src={selectedMembership.coverImageUrl}
                    alt={selectedMembership.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Duration</label>
                  <Select
                    value={selectedDuration.toString()}
                    onValueChange={(value) => setSelectedDuration(parseInt(value) as BundleDuration)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUNDLE_OPTIONS.map((option) => (
                        <SelectItem key={option.duration} value={option.duration.toString()}>
                          {option.label}
                          {option.discountPercent > 0 && (
                            <span className="text-primary ml-2">
                              ({option.discountPercent}% off)
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Monthly Price</span>
                    <span className="font-medium">
                      <PriceDisplay
                        amount={toSubunits(selectedMembership.monthlyRecurringFee, membershipCurrency)}
                        originalCurrency={membershipCurrency}
                      />
                      /month
                    </span>
                  </div>
                  {bundleOption && bundleOption.discountPercent > 0 && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Discount</span>
                        <span className="font-medium text-primary">
                          {bundleOption.discountPercent}% off
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">You Save</span>
                        <span className="font-medium text-green-600">
                          <PriceDisplay
                            amount={toSubunits(savings, membershipCurrency)}
                            originalCurrency={membershipCurrency}
                          />
                        </span>
                      </div>
                    </>
                  )}
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold">Total Amount</span>
                      <span className="text-2xl font-bold">
                        <PriceDisplay
                          amount={toSubunits(bundlePrice, membershipCurrency)}
                          originalCurrency={membershipCurrency}
                          className="text-2xl font-bold"
                        />
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      For {bundleOption?.label.toLowerCase()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowMembershipDetails(false)
                    setSelectedMembershipId(null)
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button onClick={handleProceedToPayment} className="flex-1">
                  Proceed to Payment
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Payment Modal */}
      {selectedMembership && selectedDuration && (
        <PaymentModal
          open={showPaymentModal}
          onOpenChange={(open) => {
            setShowPaymentModal(open)
            if (!open) {
              onOpenChange(false)
            }
          }}
          type="membership"
          entityId={selectedMembership.id}
          amount={bundlePrice}
          duration={selectedDuration}
          originUrl={currentOriginUrl}
          title={`Subscribe to ${selectedMembership.title}`}
          description={`${selectedMembership.description} - ${bundleOption?.label}`}
          onSuccess={handlePaymentComplete}
        />
      )}
    </>
  )
}

