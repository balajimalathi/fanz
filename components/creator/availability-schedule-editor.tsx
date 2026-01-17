"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { AvailabilitySchedule } from "@/lib/services/timezone-service"

type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday"

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
]

interface AvailabilityScheduleEditorProps {
  schedule: AvailabilitySchedule | null
  onChange: (schedule: AvailabilitySchedule | null) => void
  disabled?: boolean
}

export function AvailabilityScheduleEditor({
  schedule,
  onChange,
  disabled = false,
}: AvailabilityScheduleEditorProps) {
  // Auto-detect timezone
  const [timezone, setTimezone] = useState<string>(() => {
    if (schedule?.timezone) {
      return schedule.timezone
    }
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      return "UTC"
    }
  })

  const [enabled, setEnabled] = useState(schedule?.enabled ?? false)
  const [daySchedules, setDaySchedules] = useState<
    Record<string, { enabled: boolean; startTime: string; endTime: string }>
  >(() => {
    if (schedule?.schedule) {
      return schedule.schedule
    }
    // Initialize with all days disabled
    const initial: Record<string, { enabled: boolean; startTime: string; endTime: string }> = {}
    DAYS.forEach((day) => {
      initial[day.key] = {
        enabled: false,
        startTime: "09:00",
        endTime: "17:00",
      }
    })
    return initial
  })

  // Update parent when schedule changes
  useEffect(() => {
    if (enabled) {
      // Ensure timezone is set and daySchedules has all required fields
      if (!timezone || Object.keys(daySchedules).length === 0) {
        return // Don't send incomplete schedule
      }
      
      // Validate that all days have required fields
      const isValid = Object.values(daySchedules).every(
        (day) =>
          typeof day.enabled === "boolean" &&
          typeof day.startTime === "string" &&
          typeof day.endTime === "string"
      )
      
      if (isValid) {
        onChange({
          enabled: true,
          timezone,
          schedule: daySchedules,
        })
      }
    } else {
      onChange(null)
    }
  }, [enabled, timezone, daySchedules, onChange])

  const handleDayToggle = (day: DayOfWeek, dayEnabled: boolean) => {
    setDaySchedules((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: dayEnabled,
      },
    }))
  }

  const handleTimeChange = (
    day: DayOfWeek,
    field: "startTime" | "endTime",
    value: string
  ) => {
    // Validate time format (HH:mm)
    if (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
      return // Invalid format, don't update
    }

    setDaySchedules((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }))
  }

  return (
    <div className="space-y-4">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Enable Availability Schedule</Label>
          <p className="text-sm text-muted-foreground">
            Set specific hours when you're available
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
          disabled={disabled}
        />
      </div>

      {enabled && (
        <>
          {/* Timezone Selector */}
          <div className="space-y-2">
            <Label htmlFor="timezone">Your Timezone</Label>
            <Select
              value={timezone}
              onValueChange={setTimezone}
              disabled={disabled}
            >
              <SelectTrigger id="timezone">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                <SelectItem value="America/New_York">
                  America/New_York (EST)
                </SelectItem>
                <SelectItem value="America/Los_Angeles">
                  America/Los_Angeles (PST)
                </SelectItem>
                <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
                {/* Add more common timezones as needed */}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              All times will be set in this timezone
            </p>
          </div>

          {/* Day Schedules */}
          <div className="space-y-3 border rounded-lg p-4">
            <Label className="text-sm font-medium">Weekly Schedule</Label>
            <div className="space-y-3">
              {DAYS.map((day) => {
                const daySchedule = daySchedules[day.key] || {
                  enabled: false,
                  startTime: "09:00",
                  endTime: "17:00",
                }

                return (
                  <div
                    key={day.key}
                    className="flex items-center gap-4 p-2 rounded-md hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <Switch
                        checked={daySchedule.enabled}
                        onCheckedChange={(checked) =>
                          handleDayToggle(day.key, checked)
                        }
                        disabled={disabled}
                      />
                      <Label className="text-sm font-normal min-w-[80px]">
                        {day.label}
                      </Label>
                    </div>

                    {daySchedule.enabled && (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="time"
                          value={daySchedule.startTime}
                          onChange={(e) =>
                            handleTimeChange(day.key, "startTime", e.target.value)
                          }
                          disabled={disabled}
                          className="w-32"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={daySchedule.endTime}
                          onChange={(e) =>
                            handleTimeChange(day.key, "endTime", e.target.value)
                          }
                          disabled={disabled}
                          className="w-32"
                        />
                      </div>
                    )}

                    {!daySchedule.enabled && (
                      <span className="text-sm text-muted-foreground">
                        Not available
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
