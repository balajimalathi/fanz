import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth/auth"
import { requireAdmin } from "@/lib/utils/admin-auth"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const adminUser = await requireAdmin()

  if (!adminUser) {
    redirect("/home")
  }

  return <>{children}</>
}

