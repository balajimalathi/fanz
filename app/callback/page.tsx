"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Ticket, Loader2 } from "lucide-react";

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(10);

  const status = searchParams.get("status");
  const subscriptionId = searchParams.get("subscription_id");
  const isSuccess = status === "active" || status === "succeeded";

  useEffect(() => {
    if (isSuccess) {
      // Trigger confetti
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      // Redirect countdown
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push("/");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(interval);
        clearInterval(timer);
      };
    }
  }, [isSuccess, router]);

  if (!isSuccess && status) {
    return (
      <Card className="max-w-md w-full text-center shadow-lg border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Payment Failed or Cancelled</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push("/")}>Return Home</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-md w-full text-center shadow-lg border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <CardHeader className="flex flex-col items-center pb-2">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-500" />
        </div>
        <CardTitle className="text-2xl font-bold text-green-700 dark:text-green-500">Payment Successful!</CardTitle>
        <CardDescription className="text-base mt-2">
          Subscription ID: <span className="font-mono text-xs bg-muted px-2 py-1 rounded select-all">{subscriptionId}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-primary/5 p-6 rounded-xl border border-primary/10">
          <Ticket className="w-8 h-8 text-primary mx-auto mb-3" />
          <p className="text-lg font-medium text-foreground">
            Your license key is on its way!
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Please check your email. Use the key to activate your license in the extension.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Redirecting to home in {timeLeft} seconds...
          </p>
          <Button
            className="w-full"
            onClick={() => router.push("/")}
          >
            Redirect Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CallbackPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 p-4">
      <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-primary" />}>
        <CallbackContent />
      </Suspense>
    </div>
  );
}
