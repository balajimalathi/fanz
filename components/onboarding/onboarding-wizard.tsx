"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import toast from "react-hot-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { COUNTRIES, parseDateFromInput, isAdult } from "@/lib/onboarding/utils"
import { validateUsernameClient } from "@/lib/onboarding/validation-client"
 
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { CATEGORIES, GenderOption } from "@/types/onboarding"

const onboardingSchema = z.object({
  country: z.string().min(1, "Please select your country"),
  creatorType: z.enum(["ai", "human"], {
    required_error: "Please select a creator type",
  }),
  contentType: z.enum(["18+", "general"], {
    required_error: "Please select a content type",
  }),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, hyphens, and underscores"),
  displayName: z.string().min(1, "Display name is required").max(100, "Display name must be at most 100 characters"),
  gender: z.enum(["male", "female", "non-binary", "prefer-not-to-say", "other"]),
  dateOfBirth: z.string().refine(
    (date) => {
      if (!date) return false
      const dob = parseDateFromInput(date)
      return isAdult(dob)
    },
    { message: "You must be at least 18 years old" }
  ),
  categories: z.array(z.string()).min(1, "Please select at least one category"),
})

type OnboardingFormValues = z.infer<typeof onboardingSchema>

const TOTAL_STEPS = 8

export function OnboardingWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [usernameChecking, setUsernameChecking] = useState(false)

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    mode: "onChange",
    defaultValues: {
      categories: [],
    },
  })

  const { watch, setValue, trigger, formState: { errors } } = form
  const watchedUsername = watch("username")
  const watchedCategories = watch("categories")

  // Check username uniqueness when it changes
  useEffect(() => {
    const checkUsername = async () => {
      if (!watchedUsername || watchedUsername.length < 3) {
        setUsernameError(null)
        return
      }

      // First do client-side validation
      const clientValidation = validateUsernameClient(watchedUsername)
      if (!clientValidation.valid) {
        setUsernameError(clientValidation.error || "Username is invalid")
        form.setError("username", { message: clientValidation.error })
        return
      }

      setUsernameChecking(true)
      try {
        const response = await fetch("/api/onboarding/validate-username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: watchedUsername }),
        })

        const validation = await response.json()
        setUsernameChecking(false)

        if (!validation.valid) {
          setUsernameError(validation.error || "Username is invalid")
          form.setError("username", { message: validation.error })
        } else {
          setUsernameError(null)
          form.clearErrors("username")
        }
      } catch (error) {
        setUsernameChecking(false)
        console.error("Error validating username:", error)
      }
    }

    const timeoutId = setTimeout(checkUsername, 500)
    return () => clearTimeout(timeoutId)
  }, [watchedUsername, form])

  const saveStepProgress = async (step: number, data: Partial<OnboardingFormValues>) => {
    try {
      setIsSaving(true)
      const response = await fetch("/api/onboarding/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, data }),
      })

      if (!response.ok) {
        console.error("Failed to save progress")
      }
    } catch (error) {
      console.error("Error saving progress:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleNext = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep)
    const isValid = await trigger(fieldsToValidate as any)

    if (!isValid) {
      return
    }

    // Save progress
    const currentData = form.getValues()
    await saveStepProgress(currentStep, currentData)

    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleCategoryToggle = (category: string) => {
    const current = watchedCategories || []
    if (current.includes(category)) {
      setValue("categories", current.filter((c) => c !== category))
    } else {
      setValue("categories", [...current, category])
    }
    trigger("categories")
  }

  const handleComplete = async () => {
    const isValid = await trigger()
    if (!isValid) {
      return
    }

    setIsLoading(true)
    try {
      const formData = form.getValues()
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to complete onboarding")
      }

      router.push("/home")
    } catch (error) {
      console.error("Error completing onboarding:", error)
      toast.error(error instanceof Error ? error.message : "Failed to complete onboarding")
    } finally {
      setIsLoading(false)
    }
  }

  const getFieldsForStep = (step: number): (keyof OnboardingFormValues)[] => {
    switch (step) {
      case 1:
        return ["country"]
      case 2:
        return ["creatorType"]
      case 3:
        return ["contentType"]
      case 4:
        return ["username"]
      case 5:
        return ["displayName"]
      case 6:
        return ["gender"]
      case 7:
        return ["dateOfBirth"]
      case 8:
        return ["categories"]
      default:
        return []
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <Label htmlFor="country">Country</Label>
            <Select
              value={form.watch("country")}
              onValueChange={(value) => setValue("country", value)}
            >
              <SelectTrigger id="country">
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.country && (
              <p className="text-sm text-destructive">{errors.country.message}</p>
            )}
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <Label>Creator Type</Label>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer p-4 border rounded-md hover:bg-accent">
                <input
                  type="radio"
                  value="ai"
                  checked={form.watch("creatorType") === "ai"}
                  onChange={() => setValue("creatorType", "ai")}
                  className="w-4 h-4"
                />
                <span>AI Creator</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer p-4 border rounded-md hover:bg-accent">
                <input
                  type="radio"
                  value="human"
                  checked={form.watch("creatorType") === "human"}
                  onChange={() => setValue("creatorType", "human")}
                  className="w-4 h-4"
                />
                <span>Human Creator</span>
              </label>
            </div>
            {errors.creatorType && (
              <p className="text-sm text-destructive">{errors.creatorType.message}</p>
            )}
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <Label>Content Type</Label>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer p-4 border rounded-md hover:bg-accent">
                <input
                  type="radio"
                  value="18+"
                  checked={form.watch("contentType") === "18+"}
                  onChange={() => setValue("contentType", "18+")}
                  className="w-4 h-4"
                />
                <span>18+ Content</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer p-4 border rounded-md hover:bg-accent">
                <input
                  type="radio"
                  value="general"
                  checked={form.watch("contentType") === "general"}
                  onChange={() => setValue("contentType", "general")}
                  className="w-4 h-4"
                />
                <span>General Content</span>
              </label>
            </div>
            {errors.contentType && (
              <p className="text-sm text-destructive">{errors.contentType.message}</p>
            )}
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <Input
                id="username"
                placeholder="your-username"
                value={form.watch("username") || ""}
                onChange={(e) => setValue("username", e.target.value)}
              />
              {usernameChecking && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {usernameError && (
              <p className="text-sm text-destructive">{usernameError}</p>
            )}
            {errors.username && !usernameError && (
              <p className="text-sm text-destructive">{errors.username.message}</p>
            )}
            <p className="text-sm text-muted-foreground">
              3-30 characters, alphanumeric + hyphens/underscores
            </p>
          </div>
        )

      case 5:
        return (
          <div className="space-y-4">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              placeholder="Your display name"
              value={form.watch("displayName") || ""}
              onChange={(e) => setValue("displayName", e.target.value)}
            />
            {errors.displayName && (
              <p className="text-sm text-destructive">{errors.displayName.message}</p>
            )}
          </div>
        )

      case 6:
        return (
          <div className="space-y-4">
            <Label htmlFor="gender">Gender</Label>
            <Select
              value={form.watch("gender")}
              onValueChange={(value) => setValue("gender", value as GenderOption)}
            >
              <SelectTrigger id="gender">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="non-binary">Non-binary</SelectItem>
                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.gender && (
              <p className="text-sm text-destructive">{errors.gender.message}</p>
            )}
          </div>
        )

      case 7:
        return (
          <div className="space-y-4">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
              value={form.watch("dateOfBirth") || ""}
              onChange={(e) => setValue("dateOfBirth", e.target.value)}
            />
            {errors.dateOfBirth && (
              <p className="text-sm text-destructive">{errors.dateOfBirth.message}</p>
            )}
            <p className="text-sm text-muted-foreground">You must be at least 18 years old</p>
          </div>
        )

      case 8:
        return (
          <div className="space-y-4">
            <Label>What defines you best? (Select at least one)</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => {
                const isSelected = watchedCategories?.includes(category)
                return (
                  <Badge
                    key={category}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer px-4 py-2 text-sm"
                    onClick={() => handleCategoryToggle(category)}
                  >
                    {category}
                  </Badge>
                )
              })}
            </div>
            {errors.categories && (
              <p className="text-sm text-destructive">{errors.categories.message}</p>
            )}
          </div>
        )

      default:
        return null
    }
  }

  const stepTitles = [
    "Country",
    "Creator Type",
    "Content Type",
    "Username",
    "Display Name",
    "Gender",
    "Date of Birth",
    "Categories",
  ]

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Complete Your Profile</CardTitle>
        <CardDescription>
          Step {currentStep} of {TOTAL_STEPS}: {stepTitles[currentStep - 1]}
        </CardDescription>
        <div className="w-full bg-muted rounded-full h-2 mt-4">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="min-h-[300px] py-6">{renderStep()}</div>
          <div className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || isLoading}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            {currentStep < TOTAL_STEPS ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={isLoading || isSaving}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleComplete}
                disabled={isLoading || isSaving}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Completing...
                  </>
                ) : (
                  "Complete Onboarding"
                )}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

