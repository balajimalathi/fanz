"use client"

import { useMemo } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { AdminDataTable } from "./table/admin-data-table"
import { formatDateLocal } from "@/lib/utils/date-formatting"

interface Transaction {
  id: string
  userId: string
  userName: string
  userEmail: string
  creatorId: string
  creatorName: string
  type: string
  entityId: string
  amount: number
  platformFee: number
  creatorAmount: number
  status: string
  gatewayTransactionId: string | null
  createdAt: string
  updatedAt: string
}

export function TransactionsTable() {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default"
      case "processing":
        return "secondary"
      case "pending":
        return "outline"
      case "failed":
        return "destructive"
      case "cancelled":
        return "outline"
      default:
        return "outline"
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "membership":
        return "Membership"
      case "exclusive_post":
        return "Exclusive Post"
      case "service":
        return "Service"
      case "live_stream":
        return "Live Stream"
      default:
        return type
    }
  }

  const columns: ColumnDef<Transaction>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "Transaction ID",
        cell: ({ row }) => (
          <div className="text-sm font-mono">{row.original.id.slice(0, 8)}...</div>
        ),
      },
      {
        accessorKey: "userName",
        header: "User",
        cell: ({ row }) => {
          const transaction = row.original
          return (
            <div className="text-sm">
              <div>{transaction.userName}</div>
              <div className="text-xs text-muted-foreground">
                {transaction.userEmail}
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: "creatorName",
        header: "Creator",
        cell: ({ row }) => (
          <div className="text-sm">{row.original.creatorName}</div>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <Badge variant="outline">{getTypeLabel(row.original.type)}</Badge>
        ),
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <div className="text-sm font-medium">
            ${row.original.amount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
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
    ],
    []
  )

  const statusOptions = [
    { label: "Pending", value: "pending" },
    { label: "Processing", value: "processing" },
    { label: "Completed", value: "completed" },
    { label: "Failed", value: "failed" },
    { label: "Cancelled", value: "cancelled" },
  ]

  const typeOptions = [
    { label: "Membership", value: "membership" },
    { label: "Exclusive Post", value: "exclusive_post" },
    { label: "Service", value: "service" },
    { label: "Live Stream", value: "live_stream" },
  ]

  return (
    <AdminDataTable<Transaction>
      columns={columns}
      endpoint="/api/admin/transactions"
      searchKey="userName"
      searchPlaceholder="Search by user name or email..."
      stateKey="transactions"
      defaultSort={{ id: "createdAt", desc: true }}
      filterConfigs={[
        {
          param: "status",
          column: "status",
          title: "Status",
          options: statusOptions,
        },
        {
          param: "type",
          column: "type",
          title: "Type",
          options: typeOptions,
        },
      ]}
      emptyStateText="No transactions found"
    />
  )
}
