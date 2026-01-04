"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Loader2, CheckCircle } from "lucide-react"
import toast from "react-hot-toast"

interface Dispute {
  id: string
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
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [processing, setProcessing] = useState<string | null>(null)

  const fetchDisputes = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }

      const response = await fetch(`/api/admin/disputes?${params.toString()}`)

      if (!response.ok) {
        throw new Error("Failed to fetch disputes")
      }

      const data = await response.json()
      setDisputes(data.disputes || [])
    } catch (error) {
      console.error("Error fetching disputes:", error)
      toast.error("Failed to load disputes")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDisputes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

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
      fetchDisputes()
    } catch (error) {
      console.error("Error resolving dispute:", error)
      toast.error("Failed to resolve dispute")
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Disputes</CardTitle>
        <CardDescription>Review and resolve transaction disputes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                fetchDisputes()
              }}
              className="flex-1 flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search disputes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button type="submit" variant="outline">
                Search
              </Button>
            </form>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                onClick={() => setStatusFilter("all")}
              >
                All
              </Button>
              <Button
                variant={statusFilter === "open" ? "default" : "outline"}
                onClick={() => setStatusFilter("open")}
              >
                Open
              </Button>
              <Button
                variant={statusFilter === "resolved" ? "default" : "outline"}
                onClick={() => setStatusFilter("resolved")}
              >
                Resolved
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : disputes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No disputes found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Dispute</th>
                    <th className="text-left p-3 font-medium">User</th>
                    <th className="text-left p-3 font-medium">Creator</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Created</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {disputes.map((dispute) => (
                    <tr key={dispute.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div className="max-w-md">
                          <div className="font-medium">{dispute.reason}</div>
                          {dispute.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {dispute.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        <div>{dispute.userName}</div>
                        <div className="text-xs text-muted-foreground">
                          {dispute.userEmail}
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        {dispute.creatorName || "-"}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">{dispute.disputeType}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant={getStatusBadgeVariant(dispute.status)}>
                          {dispute.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(dispute.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end">
                          {dispute.status === "open" && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() =>
                                handleResolve(dispute.id, "Resolved by admin")
                              }
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
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

