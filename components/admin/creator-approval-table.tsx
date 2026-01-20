"use client"

import { useMemo, useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2, Ban, Unlock } from "lucide-react"
import toast from "react-hot-toast"
import { AdminDataTable } from "./table/admin-data-table"
import { formatDateLocal } from "@/lib/utils/date-formatting"

interface Creator {
  id: string
  username: string | null
  displayName: string
  email: string
  onboarded: boolean
  creatorType: string | null
  contentType: string | null
  country: string | null
  categories: string[] | null
  banned?: boolean
  createdAt: string
  updatedAt: string
}

export function CreatorApprovalTable() {
  const [processing, setProcessing] = useState<string | null>(null)

  const handleApprove = async (creatorId: string) => {
    setProcessing(creatorId)
    try {
      const response = await fetch(`/api/admin/creators/${creatorId}/approve`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to approve creator")
      }

      toast.success("Creator approved successfully")
      window.location.reload()
    } catch (error) {
      console.error("Error approving creator:", error)
      toast.error("Failed to approve creator")
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (creatorId: string) => {
    setProcessing(creatorId)
    try {
      const response = await fetch(`/api/admin/creators/${creatorId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: "Rejected by admin" }),
      })

      if (!response.ok) {
        throw new Error("Failed to reject creator")
      }

      toast.success("Creator rejected")
      window.location.reload()
    } catch (error) {
      console.error("Error rejecting creator:", error)
      toast.error("Failed to reject creator")
    } finally {
      setProcessing(null)
    }
  }

  const handleSuspend = async (creatorId: string) => {
    if (!confirm("Are you sure you want to suspend this creator? They will not be able to log in.")) {
      return
    }

    setProcessing(creatorId)
    try {
      const response = await fetch(`/api/admin/users/${creatorId}/suspend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "Suspended by admin from creator management",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to suspend creator")
      }

      toast.success("Creator suspended successfully")
      window.location.reload()
    } catch (error) {
      console.error("Error suspending creator:", error)
      toast.error("Failed to suspend creator")
    } finally {
      setProcessing(null)
    }
  }

  const handleUnsuspend = async (creatorId: string) => {
    setProcessing(creatorId)
    try {
      const response = await fetch(`/api/admin/users/${creatorId}/unsuspend`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to unsuspend creator")
      }

      toast.success("Creator unsuspended successfully")
      window.location.reload()
    } catch (error) {
      console.error("Error unsuspending creator:", error)
      toast.error("Failed to unsuspend creator")
    } finally {
      setProcessing(null)
    }
  }

  const columns: ColumnDef<Creator>[] = useMemo(
    () => [
      {
        accessorKey: "displayName",
        header: "Creator",
        cell: ({ row }) => {
          const creator = row.original
          return (
            <div>
              <div className="font-medium">{creator.displayName}</div>
              {creator.username && (
                <div className="text-sm text-muted-foreground">
                  @{creator.username}
                </div>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <div className="text-sm">{row.original.email}</div>
        ),
      },
      {
        accessorKey: "creatorType",
        header: "Type",
        cell: ({ row }) => {
          const creator = row.original
          return (
            <div className="space-y-1">
              <div>{creator.creatorType || "-"}</div>
              {creator.contentType && (
                <Badge variant="outline" className="text-xs">
                  {creator.contentType}
                </Badge>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "onboarded",
        header: "Status",
        cell: ({ row }) => {
          const creator = row.original
          return (
            <div className="flex flex-col gap-1 items-left">
              <Badge variant={creator.onboarded ? "default" : "outline"} className="shrink-0">
                {creator.onboarded ? "Approved" : "Pending"}
              </Badge>
              {creator.banned && (
                <Badge variant="destructive" className="text-xs shrink-0">
                  Suspended
                </Badge>
              )}
            </div>
          )
        },
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
          const creator = row.original
          return (
            <div className="flex justify-end gap-2">
              {!creator.onboarded && (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleApprove(creator.id)}
                    disabled={processing === creator.id}
                  >
                    {processing === creator.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(creator.id)}
                    disabled={processing === creator.id}
                  >
                    {processing === creator.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </>
                    )}
                  </Button>
                </>
              )}
              {creator.banned ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUnsuspend(creator.id)}
                  disabled={processing === creator.id}
                >
                  {processing === creator.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Unlock className="h-4 w-4 mr-1" />
                      Unsuspend
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSuspend(creator.id)}
                  disabled={processing === creator.id}
                >
                  {processing === creator.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Ban className="h-4 w-4 mr-1" />
                      Suspend
                    </>
                  )}
                </Button>
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
    { label: "Approved", value: "approved" },
  ]

  const creatorTypeOptions = [
    { label: "AI", value: "ai" },
    { label: "Human", value: "human" },
  ]

  const contentTypeOptions = [
    { label: "18+", value: "18+" },
    { label: "General", value: "general" },
  ]

  return (
    <AdminDataTable<Creator>
      columns={columns}
      endpoint="/api/admin/creators"
      searchKey="displayName"
      searchPlaceholder="Search by username or name..."
      stateKey="creators"
      filterConfigs={[
        {
          param: "status",
          column: "onboarded", // This won't sync to column filter, but that's OK - it's handled server-side
          title: "Status",
          options: statusOptions,
        },
        {
          param: "creatorType",
          column: "creatorType",
          title: "Creator Type",
          options: creatorTypeOptions,
        },
        {
          param: "contentType",
          column: "contentType",
          title: "Content Type",
          options: contentTypeOptions,
        },
      ]}
      emptyStateText="No creators found"
    />
  )
}
