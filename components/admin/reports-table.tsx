"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Loader2, CheckCircle, XCircle } from "lucide-react"
import toast from "react-hot-toast"

interface Report {
  id: string
  reporterName: string
  reporterEmail: string
  reportedUserName: string | null
  reportedCreatorName: string | null
  reportType: string
  reason: string
  description: string | null
  status: string
  createdAt: string
}

export function ReportsTable() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [processing, setProcessing] = useState<string | null>(null)

  const fetchReports = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }

      const response = await fetch(`/api/admin/reports?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to fetch reports")
      }

      const data = await response.json()
      setReports(data.reports || [])
    } catch (error) {
      console.error("Error fetching reports:", error)
      toast.error("Failed to load reports")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

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
      fetchReports()
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
      fetchReports()
    } catch (error) {
      console.error("Error dismissing report:", error)
      toast.error("Failed to dismiss report")
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Reports</CardTitle>
        <CardDescription>Review and resolve user reports</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                fetchReports()
              }}
              className="flex-1 flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
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
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No reports found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Report</th>
                    <th className="text-left p-3 font-medium">Reporter</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Created</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
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
                      </td>
                      <td className="p-3 text-sm">
                        <div>{report.reporterName}</div>
                        <div className="text-xs text-muted-foreground">
                          {report.reporterEmail}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">{report.reportType}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant={getStatusBadgeVariant(report.status)}>
                          {report.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          {report.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() =>
                                  handleResolve(report.id, "Resolved by admin")
                                }
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

