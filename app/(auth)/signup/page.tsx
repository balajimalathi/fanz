import { redirect } from "next/navigation"

export default function SignupPage() {
  // Redirect signup to login
  redirect("/login")
}

