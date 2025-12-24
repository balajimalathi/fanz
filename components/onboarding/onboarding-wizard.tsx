"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
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

  const { watch, trigger } = form
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
      form.setValue("categories", current.filter((c) => c !== category))
    } else {
      form.setValue("categories", [...current, category])
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
      alert(error instanceof Error ? error.message : "Failed to complete onboarding")
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
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your country" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 2:
        return (
          <FormField
            control={form.control}
            name="creatorType"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Creator Type</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="grid gap-4 grid-cols-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ai" id="ai" className="sr-only" />
                      <label
                        htmlFor="ai"
                        className={`flex flex-col cursor-pointer ${
                          field.value === "ai"
                            ? "border-primary bg-accent"
                            : "border-border"
                        }`}
                      >
                        <Card
                          className={`cursor-pointer border-2 transition-all ${
                            field.value === "ai"
                              ? "border-primary bg-accent"
                              : "hover:bg-accent"
                          }`}
                        >
                          <CardHeader>
                            <CardTitle className="text-lg">AI Creator</CardTitle>
                            <CardDescription>
                              Create content using AI-powered tools and automation
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="human" id="human" className="sr-only" />
                      <label
                        htmlFor="human"
                        className={`flex flex-col cursor-pointer ${
                          field.value === "human"
                            ? "border-primary bg-accent"
                            : "border-border"
                        }`}
                      >
                        <Card
                          className={`cursor-pointer border-2 transition-all ${
                            field.value === "human"
                              ? "border-primary bg-accent"
                              : "hover:bg-accent"
                          }`}
                        >
                          <CardHeader>
                            <CardTitle className="text-lg">Human Creator</CardTitle>
                            <CardDescription>
                              Create original content yourself
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      </label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 3:
        return (
          <FormField
            control={form.control}
            name="contentType"
            render={({ field }) => (
              <FormItem className="space-y-8">
                <FormLabel>Content Type</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="grid gap-4 grid-cols-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="18+" id="18plus" className="sr-only" />
                      <label
                        htmlFor="18plus"
                        className="flex flex-col cursor-pointer"
                      >
                        <Card
                          className={`cursor-pointer border-2 transition-all ${
                            field.value === "18+"
                              ? "border-primary bg-accent"
                              : "hover:bg-accent"
                          }`}
                        >
                          <CardHeader>
                            <CardTitle className="text-lg">18+ Content</CardTitle>
                            <CardDescription>
                              Content intended for adults only (18 years and older)
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="general" id="general" className="sr-only" />
                      <label
                        htmlFor="general"
                        className="flex flex-col cursor-pointer"
                      >
                        <Card
                          className={`cursor-pointer border-2 transition-all ${
                            field.value === "general"
                              ? "border-primary bg-accent"
                              : "hover:bg-accent"
                          }`}
                        >
                          <CardHeader>
                            <CardTitle className="text-lg">General Content</CardTitle>
                            <CardDescription>
                              Content suitable for all audiences
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      </label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 4:
        return (
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="your-username"
                      {...field}
                    />
                    {usernameChecking && (
                      <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </FormControl>
                <FormDescription>
                  3-30 characters, alphanumeric + hyphens/underscores
                </FormDescription>
                {usernameError && (
                  <p className="text-sm font-medium text-destructive">{usernameError}</p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 5:
        return (
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Name</FormLabel>
                <FormControl>
                  <Input placeholder="Your display name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 6:
        return (
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gender</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non-binary">Non-binary</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 7:
        return (
          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of Birth</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
                    {...field}
                  />
                </FormControl>
                <FormDescription>You must be at least 18 years old</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 8:
        return (
          <FormField
            control={form.control}
            name="categories"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What defines you best? (Select at least one)</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((category) => {
                    const isSelected = watchedCategories?.includes(category)
                    return (
                      <Badge
                        key={category}
                        variant={isSelected ? "default" : "outline"}
                        className="cursor-pointer px-4 py-2 text-sm"
                        onClick={() => {
                          const current = field.value || []
                          if (current.includes(category)) {
                            field.onChange(current.filter((c) => c !== category))
                          } else {
                            field.onChange([...current, category])
                          }
                        }}
                      >
                        {category}
                      </Badge>
                    )
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
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
        <Form {...form}>
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
        </Form>
      </CardContent>
    </Card>
  )
}

