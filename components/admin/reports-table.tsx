"use client"

import { useMemo, useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle, Ban } from "lucide-react"
import toast from "react-hot-toast"
import { AdminDataTable } from "./table/admin-data-table"

interface Report {
  id: string
  reporterName: string
  reporterEmail: string
  reportedUserId: string | null
  reportedCreatorId: string | null
  reportedUserName: string | null
  reportedCreatorName: string | null
  reportType: string
  reason: string
  description: string | null
  status: string
  createdAt: string
}

export function ReportsTable() {
  const [processing, setProcessing] = useState<string | null>(null)

  const handleResolve = async (reportId: string, resolution: string) => {
    setProcessing(reportId)
    try {
      const response = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "resolved",
          resolution,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to resolve report")
      }

      toast.success("Report resolved")
      window.location.reload()
    } catch (error) {
      console.error("Error resolving report:", error)
      toast.error("Failed to resolve report")
    } finally {
      setProcessing(null)
    }
  }

  const handleDismiss = async (reportId: string) => {
    setProcessing(reportId)
    try {
      const response = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "dismissed",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to dismiss report")
      }

      toast.success("Report dismissed")
      window.location.reload()
    } catch (error) {
      console.error("Error dismissing report:", error)
      toast.error("Failed to dismiss report")
    } finally {
      setProcessing(null)
    }
  }

  const handleSuspend = async (report: Report) => {
    const userId = report.reportedUserId || report.reportedCreatorId
    if (!userId) {
      toast.error("Cannot suspend: No user ID found")
      return
    }

    if (!confirm("Are you sure you want to suspend this user? They will not be able to log in.")) {
      return
    }

    setProcessing(report.id)
    try {
      const response = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: `Suspended due to report: ${report.reason}`,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to suspend user")
      }

      toast.success("User suspended successfully")
      await handleResolve(report.id, "User suspended due to report")
    } catch (error) {
      console.error("Error suspending user:", error)
      toast.error("Failed to suspend user")
    } finally {
      setProcessing(null)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "resolved":
        return "default"
      case "reviewing":
        return "secondary"
      case "pending":
        return "outline"
      case "dismissed":
        return "outline"
      default:
        return "outline"
    }
  }

  const columns: ColumnDef<Report>[] = useMemo(
    () => [
      {
        accessorKey: "reason",
        header: "Report",
        cell: ({ row }) => {
          const report = row.original
          return (
            <div className="max-w-md">
              <div className="font-medium">{report.reason}</div>
              {report.description && (
                <div className="text-sm text-muted-foreground mt-1">
                  {report.description}
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                Reported:{" "}
                {report.reportedUserName ||
                  report.reportedCreatorName ||
                  "N/A"}
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: "reporterName",
        header: "Reporter",
        cell: ({ row }) => {
          const report = row.original
          return (
            <div className="text-sm">
              <div>{report.reporterName}</div>
              <div className="text-xs text-muted-foreground">
                {report.reporterEmail}
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: "reportType",
        header: "Type",
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.reportType}</Badge>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={getStatusBadgeVariant(row.original.status)}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const report = row.original
          return (
            <div className="flex justify-end gap-2">
              {report.status === "pending" && (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleResolve(report.id, "Resolved by admin")}
                    disabled={processing === report.id}
                  >
                    {processing === report.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resolve
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDismiss(report.id)}
                    disabled={processing === report.id}
                  >
                    {processing === report.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-1" />
                        Dismiss
                      </>
                    )}
                  </Button>
                  {(report.reportedUserId || report.reportedCreatorId) && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleSuspend(report)}
                      disabled={processing === report.id}
                    >
                      {processing === report.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Ban className="h-4 w-4 mr-1" />
                          Suspend
                        </>
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>
          )
        },
      },
    ],
    [processing]
  )

  const statusOptions = [
    { label: "Pending", value: "pending" },
    { label: "Reviewing", value: "reviewing" },
    { label: "Resolved", value: "resolved" },
    { label: "Dismissed", value: "dismissed" },
  ]

  const typeOptions = [
    { label: "Creator", value: "creator" },
    { label: "Post", value: "post" },
    { label: "User", value: "user" },
  ]

  return (
    <AdminDataTable<Report>
      columns={columns}
      endpoint="/api/admin/reports"
      searchKey="reason"
      searchPlaceholder="Search reports..."
      stateKey="reports"
      filterConfigs={[
        {
          param: "status",
          column: "status",
          title: "Status",
          options: statusOptions,
        },
        {
          param: "type",
          column: "reportType",
          title: "Type",
          options: typeOptions,
        },
      ]}
      emptyStateText="No reports found"
    />
  )
}
