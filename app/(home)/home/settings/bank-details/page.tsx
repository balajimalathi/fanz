"use client"

import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { SubHeading } from "@/components/ui/sub-heading"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Edit, Save, X, Loader2, CheckCircle2 } from "lucide-react"
import toast from "react-hot-toast"

interface BankDetails {
  pan?: string
  accountNumber?: string
  ifscCode?: string
  bankName?: string
  accountHolderName?: string
  branchName?: string
  accountType?: "savings" | "current"
  verified?: boolean
}

const maskAccountNumber = (accountNumber?: string) => {
  if (!accountNumber || accountNumber.length < 4) return accountNumber
  return "****" + accountNumber.slice(-4)
}

export default function BankDetailsPage() {
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<BankDetails>({
    pan: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    accountHolderName: "",
    branchName: "",
    accountType: "savings",
  })

  useEffect(() => {
    fetchBankDetails()
  }, [])

  const fetchBankDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/creator/bank-details")
      if (!response.ok) {
        throw new Error("Failed to fetch bank details")
      }
      const data = await response.json()
      const details = data.bankDetails || null
      setBankDetails(details)
      if (details) {
        setFormData({
          pan: details.pan || "",
          accountNumber: details.accountNumber || "",
          ifscCode: details.ifscCode || "",
          bankName: details.bankName || "",
          accountHolderName: details.accountHolderName || "",
          branchName: details.branchName || "",
          accountType: details.accountType || "savings",
        })
      }
    } catch (error) {
      console.error("Error fetching bank details:", error)
      toast.error("Failed to load bank details")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    // Validation
    if (
      !formData.pan ||
      !formData.accountNumber ||
      !formData.ifscCode ||
      !formData.bankName ||
      !formData.accountHolderName
    ) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      setSaving(true)
      const response = await fetch("/api/creator/bank-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save bank details")
      }

      toast.success("Bank details saved successfully")
      setIsEditing(false)
      await fetchBankDetails()
    } catch (error) {
      console.error("Error saving bank details:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to save bank details"
      )
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (bankDetails) {
      setFormData({
        pan: bankDetails.pan || "",
        accountNumber: bankDetails.accountNumber || "",
        ifscCode: bankDetails.ifscCode || "",
        bankName: bankDetails.bankName || "",
        accountHolderName: bankDetails.accountHolderName || "",
        branchName: bankDetails.branchName || "",
        accountType: bankDetails.accountType || "savings",
      })
    }
    setIsEditing(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SubHeading
        title="Bank Details"
        description="Manage your bank account information for payouts"
      />
      <Separator />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bank Account Information</CardTitle>
              <CardDescription>
                Your bank details for receiving payouts
              </CardDescription>
            </div>
            {bankDetails && (
              <Badge
                variant={bankDetails.verified ? "default" : "outline"}
                className="flex items-center gap-1"
              >
                {bankDetails.verified ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </>
                ) : (
                  "Unverified"
                )}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!bankDetails && !isEditing ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                No bank details added yet. Click the button below to add your
                bank account information.
              </p>
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Add Bank Details
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pan">
                    PAN <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="pan"
                    value={formData.pan}
                    onChange={(e) =>
                      setFormData({ ...formData, pan: e.target.value.toUpperCase() })
                    }
                    disabled={!isEditing}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber">
                    Account Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="accountNumber"
                    type={isEditing ? "text" : "password"}
                    value={
                      isEditing
                        ? formData.accountNumber
                        : maskAccountNumber(formData.accountNumber)
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        accountNumber: e.target.value,
                      })
                    }
                    disabled={!isEditing}
                    placeholder="Enter account number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ifscCode">
                    IFSC Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ifscCode"
                    value={formData.ifscCode?.toUpperCase()}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ifscCode: e.target.value.toUpperCase(),
                      })
                    }
                    disabled={!isEditing}
                    placeholder="ABCD0123456"
                    maxLength={11}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankName">
                    Bank Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) =>
                      setFormData({ ...formData, bankName: e.target.value })
                    }
                    disabled={!isEditing}
                    placeholder="Enter bank name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountHolderName">
                    Account Holder Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="accountHolderName"
                    value={formData.accountHolderName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        accountHolderName: e.target.value,
                      })
                    }
                    disabled={!isEditing}
                    placeholder="Enter account holder name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branchName">Branch Name</Label>
                  <Input
                    id="branchName"
                    value={formData.branchName}
                    onChange={(e) =>
                      setFormData({ ...formData, branchName: e.target.value })
                    }
                    disabled={!isEditing}
                    placeholder="Enter branch name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountType">Account Type</Label>
                  <Select
                    value={formData.accountType}
                    onValueChange={(value: "savings" | "current") =>
                      setFormData({ ...formData, accountType: value })
                    }
                    disabled={!isEditing}
                  >
                    <SelectTrigger id="accountType">
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="savings">Savings</SelectItem>
                      <SelectItem value="current">Current</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end gap-2">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

