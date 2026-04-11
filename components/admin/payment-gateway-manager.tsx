"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { CreditCard, RefreshCw } from "lucide-react";

const GATEWAYS = ["stripe", "razorpay", "paytm", "paypal", "dodo"] as const;

type HealthRow = {
  gatewayName: string;
  status: string;
  failureCount: number;
  circuitOpenUntil: string | null;
};

export function PaymentGatewayManager() {
  const [health, setHealth] = useState<HealthRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<
    Record<
      string,
      { isActive: boolean; mode: string; json: string; webhookSecret: string }
    >
  >({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/payment-gateways");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setHealth(data.health || []);
      const next: typeof forms = {};
      for (const g of GATEWAYS) {
        const row = (data.credentials as { gatewayName: string }[] | undefined)?.find(
          (c) => c.gatewayName === g
        );
        next[g] = {
          isActive: !!(row as { isActive?: boolean })?.isActive,
          mode: (row as { mode?: string })?.mode || "test",
          json: "{}",
          webhookSecret: "",
        };
      }
      setForms(next);
    } catch {
      toast.error("Could not load gateway configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function testGateway(name: string) {
    try {
      const res = await fetch("/api/admin/payment-gateways/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gatewayName: name }),
      });
      const data = await res.json();
      if (data.ok) toast.success(`${name}: OK (${(data.currencies as string[]).join(", ")})`);
      else toast.error(data.error || "Test failed");
    } catch {
      toast.error("Test request failed");
    }
  }

  async function saveGateway(name: string) {
    const f = forms[name];
    if (!f) return;
    let creds: Record<string, unknown> = {};
    try {
      creds = JSON.parse(f.json || "{}") as Record<string, unknown>;
    } catch {
      toast.error("Credentials must be valid JSON");
      return;
    }
    try {
      const res = await fetch("/api/admin/payment-gateways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gatewayName: name,
          isActive: f.isActive,
          mode: f.mode,
          credentials: creds,
          webhookSecret: f.webhookSecret || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${name} saved`);
      await load();
    } catch {
      toast.error("Save failed");
    }
  }

  if (loading) {
    return <p className="text-muted-foreground p-6">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <CreditCard className="h-7 w-7" />
            Payment gateways
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure PSP credentials (stored in DB). Env vars are used when rows are inactive or
            missing keys. Routing order is managed in{" "}
            <code className="text-xs">payment_gateway_config</code> via API or SQL.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Circuit health</CardTitle>
          <CardDescription>Failure counts and open circuits (from DB + Redis).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {health.length === 0 ? (
            <p className="text-muted-foreground">No health rows yet (populated after traffic).</p>
          ) : (
            health.map((h) => (
              <div key={h.gatewayName} className="flex justify-between border-b pb-2">
                <span className="font-medium">{h.gatewayName}</span>
                <span>
                  {h.status} · failures {h.failureCount}
                  {h.circuitOpenUntil ? ` · open until ${h.circuitOpenUntil}` : ""}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {GATEWAYS.map((name) => (
        <Card key={name}>
          <CardHeader>
            <CardTitle className="capitalize">{name}</CardTitle>
            <CardDescription>
              JSON credentials object (e.g. Stripe:{" "}
              <code className="text-xs">{`{"secretKey":"sk_..."}`}</code>, Razorpay:{" "}
              <code className="text-xs">{`{"keyId":"...","keySecret":"..."}`}</code>).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={forms[name]?.isActive ?? false}
                onCheckedChange={(v) =>
                  setForms((prev) => ({ ...prev, [name]: { ...prev[name], isActive: v } }))
                }
              />
              <Label>Active (use DB credentials when on)</Label>
            </div>
            <div className="grid gap-2 max-w-xs">
              <Label>Mode</Label>
              <Input
                value={forms[name]?.mode || "test"}
                onChange={(e) =>
                  setForms((prev) => ({ ...prev, [name]: { ...prev[name], mode: e.target.value } }))
                }
                placeholder="test | live"
              />
            </div>
            <div className="grid gap-2">
              <Label>Webhook secret (optional; shown masked after save)</Label>
              <Input
                type="password"
                value={forms[name]?.webhookSecret || ""}
                onChange={(e) =>
                  setForms((prev) => ({
                    ...prev,
                    [name]: { ...prev[name], webhookSecret: e.target.value },
                  }))
                }
                placeholder="whsec_…"
              />
            </div>
            <div className="grid gap-2">
              <Label>Credentials JSON</Label>
              <textarea
                className="min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono"
                value={forms[name]?.json || "{}"}
                onChange={(e) =>
                  setForms((prev) => ({ ...prev, [name]: { ...prev[name], json: e.target.value } }))
                }
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={() => void saveGateway(name)}>
                Save
              </Button>
              <Button type="button" variant="secondary" onClick={() => void testGateway(name)}>
                Test load
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
