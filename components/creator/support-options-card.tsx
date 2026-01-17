"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Info } from "lucide-react"
import { TipModal } from "./tip-modal"
import { MembershipSelectionModal } from "@/components/payments/membership-selection-modal"
import { usePathname } from "next/navigation"
import { useSession } from "@/lib/auth/auth-client"
import { LoginModal } from "./login-modal"

interface SupportOptionsCardProps {
  creatorId: string
  creatorName: string
  memberships: Array<{
    id: string
    title: string
    description: string
    monthlyRecurringFee: number
    currency: string
    coverImageUrl?: string | null
  }>
  currency?: string
}

const PRESET_TIP_AMOUNTS = [3, 5, 10, 25, 50, 100]

export function SupportOptionsCard({
  creatorId,
  creatorName,
  memberships,
  currency = "USD",
}: SupportOptionsCardProps) {
  const [supportType, setSupportType] = useState<"one_time" | "membership">("one_time")
  const [selectedTipAmount, setSelectedTipAmount] = useState<number | null>(null)
  const [customTipAmount, setCustomTipAmount] = useState("")
  const [showTipModal, setShowTipModal] = useState(false)
  const [showMembershipModal, setShowMembershipModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const { data: session } = useSession()
  const pathname = usePathname()
  const isAuthenticated = !!session?.user

  const handleTipAmountSelect = (amount: number) => {
    setSelectedTipAmount(amount)
    setCustomTipAmount("")
  }

  const handleSupportClick = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true)
      return
    }

    if (supportType === "one_time") {
      const amount = selectedTipAmount || parseFloat(customTipAmount) || 0
      if (amount > 0) {
        // We'll handle this in the tip modal
        setShowTipModal(true)
      }
    } else {
      setShowMembershipModal(true)
    }
  }

  const getTipAmount = (): number => {
    if (selectedTipAmount !== null) {
      return selectedTipAmount
    }
    const custom = parseFloat(customTipAmount)
    return isNaN(custom) || custom <= 0 ? 0 : custom
  }

  return (
    <>
      <Card className="bg-gray-50 dark:bg-gray-900/50 rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Support {creatorName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Support Type Selector */}
          <Tabs value={supportType} onValueChange={(v) => setSupportType(v as "one_time" | "membership")}>
            <TabsList className="grid w-full grid-cols-2 bg-gray-200 dark:bg-gray-800">
              <TabsTrigger value="one_time" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
                One time
              </TabsTrigger>
              <TabsTrigger value="membership" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
                Membership
                <Info className="ml-1 h-3 w-3" />
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {supportType === "one_time" ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Choose amount</label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_TIP_AMOUNTS.map((amount) => (
                    <Button
                      key={amount}
                      variant={selectedTipAmount === amount ? "default" : "outline"}
                      onClick={() => handleTipAmountSelect(amount)}
                      className={
                        selectedTipAmount === amount
                          ? "bg-blue-600 hover:bg-blue-700"
                          : ""
                      }
                      size="sm"
                    >
                      ${amount}
                    </Button>
                  ))}
                </div>
                <div className="mt-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Custom amount"
                    value={customTipAmount}
                    onChange={(e) => {
                      setCustomTipAmount(e.target.value)
                      setSelectedTipAmount(null)
                    }}
                    className="w-full"
                  />
                </div>
              </div>
              <Button
                onClick={handleSupportClick}
                disabled={getTipAmount() <= 0}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Support ${getTipAmount() > 0 ? getTipAmount().toFixed(2) : "0.00"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {memberships.length > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Choose a membership tier to support {creatorName}
                  </p>
                  <Button
                    onClick={handleSupportClick}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    View Memberships
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No memberships available yet
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tip Modal */}
      {isAuthenticated && (
        <TipModal
          open={showTipModal}
          onOpenChange={setShowTipModal}
          creatorId={creatorId}
          creatorName={creatorName}
          currency={currency}
          initialAmount={getTipAmount() > 0 ? getTipAmount() : undefined}
        />
      )}

      {/* Membership Modal */}
      {isAuthenticated && memberships.length > 0 && (
        <MembershipSelectionModal
          open={showMembershipModal}
          onOpenChange={setShowMembershipModal}
          creatorId={creatorId}
          memberships={memberships}
          originUrl={pathname || undefined}
        />
      )}

      {/* Login Modal */}
      <LoginModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
      />
    </>
  )
}
