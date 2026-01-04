"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle, XCircle, Search, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

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
  createdAt: string
  updatedAt: string
}

export function CreatorApprovalTable() {
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [processing, setProcessing] = useState<string | null>(null)

  const fetchCreators = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }
      if (search) {
        params.append("search", search)
      }

      const response = await fetch(`/api/admin/creators?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to fetch creators")
      }

      const data = await response.json()
      setCreators(data.creators || [])
    } catch (error) {
      console.error("Error fetching creators:", error)
      toast.error("Failed to load creators")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCreators()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

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
      fetchCreators()
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
      fetchCreators()
    } catch (error) {
      console.error("Error rejecting creator:", error)
      toast.error("Failed to reject creator")
    } finally {
      setProcessing(null)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchCreators()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Creator Management</CardTitle>
        <CardDescription>Approve or reject creator applications</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by username or name..."
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
                variant={statusFilter === "pending" ? "default" : "outline"}
                onClick={() => setStatusFilter("pending")}
              >
                Pending
              </Button>
              <Button
                variant={statusFilter === "approved" ? "default" : "outline"}
                onClick={() => setStatusFilter("approved")}
              >
                Approved
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : creators.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No creators found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Creator</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Created</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {creators.map((creator) => (
                    <tr key={creator.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div>
                          <div className="font-medium">{creator.displayName}</div>
                          {creator.username && (
                            <div className="text-sm text-muted-foreground">
                              @{creator.username}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-sm">{creator.email}</td>
                      <td className="p-3 text-sm">
                        <div className="space-y-1">
                          <div>{creator.creatorType || "-"}</div>
                          {creator.contentType && (
                            <Badge variant="outline" className="text-xs">
                              {creator.contentType}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={creator.onboarded ? "default" : "outline"}
                        >
                          {creator.onboarded ? "Approved" : "Pending"}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(creator.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3">
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

