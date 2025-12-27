import { AlertCircle, CheckCircle2, XCircle } from "lucide-react"

interface CheckItem {
  id: string
  label: string
  completed: boolean
  link: string
}

interface OnboardingStatus {
  checks: CheckItem[]
  completedCount: number
  totalCount: number
  isComplete: boolean
}

interface OnboardingChecklistProps {
  status: OnboardingStatus | null
}

export function OnboardingChecklist({ status }: OnboardingChecklistProps) {
  if (!status || status.isComplete) return null

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-1">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Complete your profile to go live
          </h3>
          <p className="text-sm text-muted-foreground">
            You are {status.completedCount}/{status.totalCount} steps away from
            having a perfect profile.
          </p>
        </div>
        <div className="text-2xl font-bold text-primary">
          {Math.round((status.completedCount / status.totalCount) * 100)}%
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {status.checks.map((check) => (
          <div
            key={check.id}
            className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50"
          >
            {check.completed ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            )}
            <span
              className={`text-sm font-medium ${check.completed ? "text-muted-foreground line-through" : ""
                }`}
            >
              {check.label}
            </span>
            {!check.completed && (
              <a
                href={check.link}
                className="ml-auto text-xs text-primary hover:underline"
              >
                Fix
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
