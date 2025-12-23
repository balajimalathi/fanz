import { LoginForm } from "@/components/auth/login-form"
import { Icons } from "@/components/ui/icons"
import { siteConfig } from "@/site.config"
import { GalleryVerticalEnd } from "lucide-react"


export default function LoginPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="flex flex-col items-center gap-2">
            <Icons.logo size={4} />
            <span className="text-2xl font-bold">{siteConfig.site_name}</span>
          </div>
        </a>
        <LoginForm />
      </div>
    </div>
  )
}
