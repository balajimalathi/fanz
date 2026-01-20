"use client"

import { useMemo, useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, Ban } from "lucide-react"
import toast from "react-hot-toast"
import { AdminDataTable } from "./table/admin-data-table"
import { formatDateLocal } from "@/lib/utils/date-formatting"

interface Dispute {
  id: string
  userId: string
  creatorId: string | null
  userName: string
  userEmail: string
  creatorName: string | null
  disputeType: string
  reason: string
  description: string | null
  status: string
  createdAt: string
}

export function DisputesTable() {
  const [processing, setProcessing] = useState<string | null>(null)

  const handleResolve = async (disputeId: string, resolution: string) => {
    setProcessing(disputeId)
    try {
      const response = await fetch(`/api/admin/disputes/${disputeId}`, {
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
        throw new Error("Failed to resolve dispute")
      }

      toast.success("Dispute resolved")
      window.location.reload()
    } catch (error) {
      console.error("Error resolving dispute:", error)
      toast.error("Failed to resolve dispute")
    } finally {
      setProcessing(null)
    }
  }

  const handleSuspendCreator = async (dispute: Dispute) => {
    if (!dispute.creatorId) {
      toast.error("Cannot suspend: No creator ID found")
      return
    }

    if (!confirm("Are you sure you want to suspend this creator? They will not be able to log in.")) {
      return
    }

    setProcessing(dispute.id)
    try {
      const response = await fetch(`/api/admin/users/${dispute.creatorId}/suspend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: `Suspended due to dispute: ${dispute.reason}`,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to suspend creator")
      }

      toast.success("Creator suspended successfully")
      await handleResolve(dispute.id, "Creator suspended due to dispute")
    } catch (error) {
      console.error("Error suspending creator:", error)
      toast.error("Failed to suspend creator")
    } finally {
      setProcessing(null)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "resolved":
        return "default"
      case "investigating":
        return "secondary"
      case "open":
        return "outline"
      case "closed":
        return "outline"
      default:
        return "outline"
    }
  }

  const columns: ColumnDef<Dispute>[] = useMemo(
    () => [
      {
        accessorKey: "reason",
        header: "Dispute",
        cell: ({ row }) => {
          const dispute = row.original
          return (
            <div className="max-w-md">
              <div className="font-medium">{dispute.reason}</div>
              {dispute.description && (
                <div className="text-sm text-muted-foreground mt-1">
                  {dispute.description}
                </div>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "userName",
        header: "User",
        cell: ({ row }) => {
          const dispute = row.original
          return (
            <div className="text-sm">
              <div>{dispute.userName}</div>
              <div className="text-xs text-muted-foreground">
                {dispute.userEmail}
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: "creatorName",
        header: "Creator",
        cell: ({ row }) => (
          <div className="text-sm">{row.original.creatorName || "-"}</div>
        ),
      },
      {
        accessorKey: "disputeType",
        header: "Type",
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.disputeType}</Badge>
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
            {formatDateLocal(row.original.createdAt)}
          </div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const dispute = row.original
          return (
            <div className="flex justify-end gap-2">
              {dispute.status === "open" && (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleResolve(dispute.id, "Resolved by admin")}
                    disabled={processing === dispute.id}
                  >
                    {processing === dispute.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resolve
                      </>
                    )}
                  </Button>
                  {dispute.creatorId && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleSuspendCreator(dispute)}
                      disabled={processing === dispute.id}
                    >
                      {processing === dispute.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Ban className="h-4 w-4 mr-1" />
                          Suspend Creator
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
    { label: "Open", value: "open" },
    { label: "Investigating", value: "investigating" },
    { label: "Resolved", value: "resolved" },
    { label: "Closed", value: "closed" },
  ]

  const typeOptions = [
    { label: "Transaction", value: "transaction" },
    { label: "Payout", value: "payout" },
    { label: "Refund", value: "refund" },
    { label: "Service", value: "service" },
    { label: "Other", value: "other" },
  ]

  return (
    <AdminDataTable<Dispute>
      columns={columns}
      endpoint="/api/admin/disputes"
      searchKey="reason"
      searchPlaceholder="Search disputes..."
      stateKey="disputes"
      filterConfigs={[
        {
          param: "status",
          column: "status",
          title: "Status",
          options: statusOptions,
        },
        {
          param: "type",
          column: "disputeType",
          title: "Type",
          options: typeOptions,
        },
      ]}
      emptyStateText="No disputes found"
    />
  )
}
