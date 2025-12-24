import { useState, useEffect, useRef } from "react"
import { Edit2, Plus, X, Eye, EyeOff, Save, Trash, Loader2, Upload } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ImageCropper } from "@/components/ui/image-cropper"
import { validateImageFile } from "@/lib/utils/image-processing"
import { cn } from "@/lib/utils"
import { membershipSchema } from "@/lib/validations/membership"
import Image from "next/image"

interface Membership {
  id: string
  title: string
  description: string
  monthlyRecurringFee: number
  visible: boolean
  coverImageUrl?: string | null
  createdAt?: string
  updatedAt?: string
}

// Static monthly recurring fee options (in Rs.)
const MONTHLY_FEE_OPTIONS = [
  { value: 99, label: "Rs. 99/- per month" },
  { value: 199, label: "Rs. 199/- per month" },
  { value: 299, label: "Rs. 299/- per month" },
  { value: 499, label: "Rs. 499/- per month" },
  { value: 999, label: "Rs. 999/- per month" },
  { value: 1499, label: "Rs. 1,499/- per month" },
  { value: 1999, label: "Rs. 1,999/- per month" },
  { value: 2999, label: "Rs. 2,999/- per month" },
  { value: 4999, label: "Rs. 4,999/- per month" },
]


export function MembershipCard() {
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [editingMembershipId, setEditingMembershipId] = useState<string | null>(null)
  const [isAddingMembership, setIsAddingMembership] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  
  // Fetch memberships on mount
  useEffect(() => {
    fetchMemberships()
  }, [])

  const fetchMemberships = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/memberships")
      if (!response.ok) {
        throw new Error("Failed to fetch memberships")
      }
      const data = await response.json()
      setMemberships(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      setError(errorMessage)
      setMessage({ type: "error", text: "Failed to load memberships" })
      setTimeout(() => setMessage(null), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddMembership = () => {
    setIsAddingMembership(true)
    setEditingMembershipId(null)
  }

  const handleSaveMembership = async (membership: Omit<Membership, "id">, croppedImageBlob?: Blob) => {
    try {
      // Validate with Zod
      const validationResult = membershipSchema.safeParse(membership)
      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0]
        setMessage({ type: "error", text: firstError.message })
        setTimeout(() => setMessage(null), 5000)
        return
      }

      if (editingMembershipId) {
        // Update existing membership
        const response = await fetch(`/api/memberships/${editingMembershipId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(validationResult.data),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to update membership")
        }

        const updatedMembership = await response.json()
        setMemberships(memberships.map(m =>
          m.id === editingMembershipId ? updatedMembership : m
        ))
        setEditingMembershipId(null)
        setMessage({ type: "success", text: "Membership updated successfully" })
        setTimeout(() => setMessage(null), 5000)
      } else {
        // Add new membership
        const response = await fetch("/api/memberships", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(validationResult.data),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to create membership")
        }

        const newMembership = await response.json()
        
        // If there's a cropped image, upload it now
        if (croppedImageBlob && newMembership.id) {
          try {
            const formData = new FormData()
            formData.append("file", croppedImageBlob, "cover.jpg")

            const imageResponse = await fetch(`/api/memberships/${newMembership.id}/images`, {
              method: "POST",
              body: formData,
            })

            if (imageResponse.ok) {
              const imageData = await imageResponse.json()
              newMembership.coverImageUrl = imageData.url
            }
          } catch (imageError) {
            console.error("Error uploading cover image:", imageError)
            // Don't fail the membership creation if image upload fails
          }
        }
        
        setMemberships([...memberships, newMembership])
        setIsAddingMembership(false)
        setMessage({ type: "success", text: "Membership created successfully" })
        setTimeout(() => setMessage(null), 5000)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      setMessage({ type: "error", text: errorMessage })
      setTimeout(() => setMessage(null), 5000)
    }
  }

  const handleDeleteMembership = async (id: string) => {
    if (!confirm("Are you sure you want to delete this membership?")) {
      return
    }

    try {
      const response = await fetch(`/api/memberships/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete membership")
      }

      setMemberships(memberships.filter(m => m.id !== id))
      setMessage({ type: "success", text: "Membership deleted successfully" })
      setTimeout(() => setMessage(null), 5000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      setMessage({ type: "error", text: errorMessage })
      setTimeout(() => setMessage(null), 5000)
    }
  }

  const handleToggleMembershipVisibility = async (id: string) => {
    const membership = memberships.find(m => m.id === id)
    if (!membership) return

    try {
      const response = await fetch(`/api/memberships/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          visible: !membership.visible,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update visibility")
      }

      const updatedMembership = await response.json()
      setMemberships(memberships.map(m =>
        m.id === id ? updatedMembership : m
      ))
      setMessage({ type: "success", text: `Membership ${updatedMembership.visible ? "shown" : "hidden"}` })
      setTimeout(() => setMessage(null), 5000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      setMessage({ type: "error", text: errorMessage })
      setTimeout(() => setMessage(null), 5000)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-primary">Membership</h2>
        </div>
        <Button onClick={handleAddMembership} size="sm" disabled={isLoading}>
          <Plus className="h-4 w-4 mr-2" />
          Add Membership
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <div
            className={cn(
              "rounded-md p-3 text-sm",
              message.type === "success"
                ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200 border border-green-200 dark:border-green-800"
                : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200 border border-red-200 dark:border-red-800"
            )}
          >
            {message.text}
          </div>
        )}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p>Loading memberships...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMemberships}
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        ) : (
          <>
            {isAddingMembership && (
              <MembershipForm
                onSave={handleSaveMembership}
                onCancel={() => setIsAddingMembership(false)}
              />
            )}

            {memberships.length === 0 && !isAddingMembership ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No memberships yet. Click "Add Membership" to create your first membership.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {memberships.map((membership) => (
                  <MembershipSection
                    key={membership.id}
                    membership={membership}
                    isEditing={editingMembershipId === membership.id}
                    onEdit={() => setEditingMembershipId(membership.id)}
                    onSave={handleSaveMembership}
                    onCancel={() => setEditingMembershipId(null)}
                    onDelete={handleDeleteMembership}
                    onToggleVisibility={handleToggleMembershipVisibility}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}


interface MembershipCardProps {
  membership: Membership
  isEditing: boolean
  onEdit: () => void
  onSave: (membership: Omit<Membership, "id">) => void
  onCancel: () => void
  onDelete: (id: string) => void
  onToggleVisibility: (id: string) => void
}

function MembershipSection({
  membership,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onToggleVisibility,
}: MembershipCardProps) {
  const [title, setTitle] = useState(membership.title)
  const [description, setDescription] = useState(membership.description)
  const [monthlyRecurringFee, setMonthlyRecurringFee] = useState(membership.monthlyRecurringFee.toString())
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(membership.coverImageUrl || null)
  const [showCropper, setShowCropper] = useState(false)
  const [cropperImage, setCropperImage] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const coverImageInputRef = useRef<HTMLInputElement>(null)

  const handleSave = () => {
    onSave({
      title,
      description,
      monthlyRecurringFee: parseFloat(monthlyRecurringFee) || 0,
      visible: membership.visible,
      coverImageUrl: coverImageUrl || undefined,
    })
  }

  const handleImageSelect = () => {
    coverImageInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validationError = validateImageFile(file)
    if (validationError) {
      alert(validationError)
      return
    }

    setCropperImage(file)
    setShowCropper(true)
  }

  const handleCropComplete = async (blob: Blob) => {
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", blob, "cover.jpg")

      const response = await fetch(`/api/memberships/${membership.id}/images`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to upload image")
      }

      const data = await response.json()
      setCoverImageUrl(data.url)
      setShowCropper(false)
      setCropperImage(null)
    } catch (error) {
      console.error("Error uploading image:", error)
      alert(error instanceof Error ? error.message : "Failed to upload image")
    } finally {
      setIsUploading(false)
    }
  }

  const selectedFeeOption = MONTHLY_FEE_OPTIONS.find(opt => opt.value === membership.monthlyRecurringFee)

  if (isEditing) {
    return (
      <Card className="border-2">
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`membership-title-${membership.id}`}>Title</Label>
            <Input
              id={`membership-title-${membership.id}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., The Superfan Membership"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`membership-description-${membership.id}`}>Description</Label>
            <Textarea
              id={`membership-description-${membership.id}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your membership..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`membership-fee-${membership.id}`}>Monthly Recurring Fee</Label>
            <Select
              value={monthlyRecurringFee}
              onValueChange={setMonthlyRecurringFee}
            >
              <SelectTrigger id={`membership-fee-${membership.id}`}>
                <SelectValue placeholder="Select monthly fee" />
              </SelectTrigger>
              <SelectContent>
                {MONTHLY_FEE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Cover Image (Coming soon)
            </p>
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleVisibility(membership.id)}
              >
                {membership.visible ? (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Visible
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hidden
                  </>
                )}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(membership.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash className="h-4 w-4" />
                Delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onCancel()
                  setTitle(membership.title)
                  setDescription(membership.description)
                  setMonthlyRecurringFee(membership.monthlyRecurringFee.toString())
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={cn(
        "transition-colors",
        !membership.visible && "opacity-60"
      )}>
        <CardContent className="pt-6">
          {coverImageUrl && (
            <div className="relative w-full h-40 rounded-lg overflow-hidden mb-4 border-2 border-border">
              <Image
                src={coverImageUrl}
                alt="Cover"
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{membership.title}</h3>
                {!membership.visible && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    Hidden
                  </span>
                )}
              </div>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
              <p className="text-primary font-medium">
                {selectedFeeOption?.label || `Rs. ${membership.monthlyRecurringFee.toLocaleString("en-IN")}/- per month`}
              </p>
            </div>
          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              aria-label="Edit membership"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleVisibility(membership.id)}
              aria-label="Toggle visibility"
            >
              {membership.visible ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
    <Sheet open={showCropper} onOpenChange={setShowCropper}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Crop Cover Image</SheetTitle>
        </SheetHeader>
        {cropperImage && (
          <div className="mt-4">
            <ImageCropper
              image={cropperImage}
              aspectRatio={2}
              targetWidth={1200}
              targetHeight={600}
              onCropComplete={handleCropComplete}
              onCancel={() => {
                setShowCropper(false)
                setCropperImage(null)
              }}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
    </>
  )
}

interface MembershipFormProps {
  onSave: (membership: Omit<Membership, "id">, croppedImageBlob?: Blob) => void
  onCancel: () => void
}

function MembershipForm({ onSave, onCancel }: MembershipFormProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [monthlyRecurringFee, setMonthlyRecurringFee] = useState("")
  const [visible, setVisible] = useState(true)
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [cropperImage, setCropperImage] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [membershipId, setMembershipId] = useState<string | null>(null)
  const coverImageInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // If there's a cropped image, convert it to blob
    let croppedBlob: Blob | undefined
    if (cropperImage) {
      croppedBlob = cropperImage
    }
    
    onSave({
      title,
      description,
      monthlyRecurringFee: parseFloat(monthlyRecurringFee) || 0,
      visible,
      coverImageUrl: coverImageUrl || undefined,
    }, croppedBlob)
    // Reset form
    setTitle("")
    setDescription("")
    setMonthlyRecurringFee("")
    setVisible(true)
    setCoverImageUrl(null)
    setCropperImage(null)
  }

  const handleImageSelect = () => {
    coverImageInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validationError = validateImageFile(file)
    if (validationError) {
      alert(validationError)
      return
    }

    setCropperImage(file)
    setShowCropper(true)
  }

  const handleCropComplete = async (blob: Blob) => {
    // Store the cropped image - it will be uploaded when membership is created
    const file = new File([blob], "cover.jpg", { type: "image/jpeg" })
    setCropperImage(file)
    setShowCropper(false)
    // Note: The image will need to be uploaded after membership creation
    // This is handled by the parent component's handleSaveMembership
  }

  return (
    <Card className="border-2 border-primary">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-membership-title">Title</Label>
            <Input
              id="new-membership-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., The Superfan Membership"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-membership-description">Description</Label>
            <Textarea
              id="new-membership-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your membership..."
              rows={3}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-membership-fee">Monthly Recurring Fee</Label>
            <Select
              value={monthlyRecurringFee}
              onValueChange={setMonthlyRecurringFee}
              required
            >
              <SelectTrigger id="new-membership-fee">
                <SelectValue placeholder="Select monthly fee" />
              </SelectTrigger>
              <SelectContent>
                {MONTHLY_FEE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="pt-4 border-t space-y-2">
            <Label>Cover Image (1200×600px)</Label>
            <div className="flex items-center gap-4">
              {coverImageUrl ? (
                <div className="relative w-full h-32 rounded-lg overflow-hidden border-2 border-border">
                  <Image
                    src={coverImageUrl}
                    alt="Cover"
                    fill
                    className="object-cover"
                  />
                </div>
              ) : cropperImage ? (
                <div className="w-full h-32 rounded-lg bg-muted border-2 border-primary flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Image ready to upload</p>
                </div>
              ) : (
                <div className="w-full h-32 rounded-lg bg-muted border-2 border-dashed border-border flex items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleImageSelect}
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {coverImageUrl || cropperImage ? "Change" : "Upload"}
                </Button>
                {(coverImageUrl || cropperImage) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCoverImageUrl(null)
                      setCropperImage(null)
                    }}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <input
                ref={coverImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setVisible(!visible)}
              >
                {visible ? (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Visible
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hidden
                  </>
                )}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isUploading}>
                <Save className="h-4 w-4 mr-2" />
                Save Membership
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancel}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
      <Sheet open={showCropper} onOpenChange={setShowCropper}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Crop Cover Image</SheetTitle>
          </SheetHeader>
          {cropperImage && (
            <div className="mt-4">
              <ImageCropper
                image={cropperImage}
                aspectRatio={2}
                targetWidth={1200}
                targetHeight={600}
                onCropComplete={handleCropComplete}
                onCancel={() => {
                  setShowCropper(false)
                  setCropperImage(null)
                }}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  )
}

