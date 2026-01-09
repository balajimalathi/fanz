import { requireAdmin } from "@/lib/utils/admin-auth"
import { redirect } from "next/navigation"
import { ContentModerationTable } from "@/components/admin/content-moderation-table"

export default async function AdminContentPage() {
  const adminUser = await requireAdmin()

  if (!adminUser) {
    redirect("/home")
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Content Moderation</h1>
        <p className="text-muted-foreground">
          Review and moderate posts and comments
        </p>
      </div>

      <ContentModerationTable />
    </div>
  )
}

