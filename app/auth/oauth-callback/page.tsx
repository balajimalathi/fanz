"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

/**
 * OAuth Callback Page
 * 
 * This page handles the OAuth callback after authentication is complete.
 * It redirects users back to their original subdomain if they initiated
 * the OAuth flow from a subdomain.
 */
export default function OAuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for session to be loaded
    if (isPending) return;

    // Get return URL from query params or sessionStorage
    const returnUrl = searchParams.get("returnUrl") ||
      sessionStorage.getItem("oauth_return_url");

    // If user is authenticated and we have a return URL
    if (session?.user && returnUrl) {
      // Validate the return URL
      if (isValidReturnUrl(returnUrl)) {
        // Clear the stored return URL
        sessionStorage.removeItem("oauth_return_url");

        // Check if return URL is cross-origin (e.g. localhost -> skndan.localhost)
        // If so, we need to port the session cookie
        try {
          const targetUrl = new URL(returnUrl);
          if (targetUrl.origin !== window.location.origin) {
            // Use port-session endpoint to transfer cookie
            window.location.href = `/api/auth/port-session?returnUrl=${encodeURIComponent(returnUrl)}`;
          } else {
            // Same origin, direct redirect
            window.location.href = returnUrl;
          }
        } catch {
          // Fallback
          window.location.href = returnUrl;
        }
        return;
      } else {
        setError("Invalid return URL");
      }
    }

    // If authenticated but no return URL, redirect to home
    if (session?.user && !returnUrl) {
      router.push("/home");
      return;
    }

    // If not authenticated, show error
    if (!session?.user && !isPending) {
      setError("Authentication failed. Please try again.");
    }
  }, [session, isPending, searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {error ? "Authentication Error" : "Completing Sign In..."}
          </CardTitle>
          <CardDescription>
            {error || "Please wait while we redirect you."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          {!error && (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Validate that the return URL is from an allowed domain
 * This prevents open redirect vulnerabilities
 */
function isValidReturnUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;

    // Allow localhost and its subdomains
    if (hostname === "localhost" || hostname.endsWith(".localhost")) {
      return true;
    }

    // Allow production domain and its subdomains
    if (hostname === "skndan.cloud" || hostname.endsWith(".skndan.cloud")) {
      return true;
    }

    // Allow tunnel URLs (for development)
    if (hostname.endsWith(".srv.us")) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
