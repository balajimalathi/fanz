"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ServiceOrder {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceDescription: string;
  serviceType: "shoutout" | "audio_call" | "video_call" | "chat";
  userId: string;
  userName: string;
  userEmail: string;
  status: "pending" | "active" | "fulfilled" | "cancelled";
  fulfillmentNotes: string | null;
  activatedAt: string | null;
  utilizedAt: string | null;
  customerJoinedAt: string | null;
  creatorJoinedAt: string | null;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export function ServiceOrdersList() {
  const router = useRouter();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/creator/orders");
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load orders";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFulfill = (orderId: string) => {
    router.push(`/home/inbox?orderId=${orderId}`);
  };

  const getStatusBadge = (status: ServiceOrder["status"]) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      active: "default",
      fulfilled: "outline",
      cancelled: "destructive",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getServiceTypeLabel = (type: ServiceOrder["serviceType"]) => {
    const labels: Record<string, string> = {
      shoutout: "Shoutout",
      audio_call: "Audio Call",
      video_call: "Video Call",
      chat: "Chat",
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        <p>{error}</p>
        <Button variant="outline" size="sm" onClick={fetchOrders} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const activeOrders = orders.filter((o) => o.status === "active");
  const fulfilledOrders = orders.filter((o) => o.status === "fulfilled");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Service Orders</h1>
        <p className="text-muted-foreground">
          Manage and fulfill your service orders
        </p>
      </div>

      {/* Active Orders */}
      {activeOrders.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Active Orders</h2>
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{order.serviceName}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {order.userName} • {getServiceTypeLabel(order.serviceType)}
                      </p>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      <p>Amount: Rs. {order.amount.toLocaleString("en-IN")}</p>
                      {order.activatedAt && (
                        <p>
                          Activated {formatDistanceToNow(new Date(order.activatedAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                    <Button onClick={() => handleFulfill(order.id)} size="sm">
                      Fulfill
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pending Orders */}
      {pendingOrders.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Pending Orders</h2>
          <div className="space-y-3">
            {pendingOrders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{order.serviceName}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {order.userName} • {getServiceTypeLabel(order.serviceType)}
                      </p>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <p>Amount: Rs. {order.amount.toLocaleString("en-IN")}</p>
                    <p>
                      Created {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Fulfilled Orders */}
      {fulfilledOrders.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Fulfilled Orders</h2>
          <div className="space-y-3">
            {fulfilledOrders.slice(0, 5).map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{order.serviceName}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {order.userName} • {getServiceTypeLabel(order.serviceType)}
                      </p>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <p>Amount: Rs. {order.amount.toLocaleString("en-IN")}</p>
                    {order.utilizedAt && (
                      <p>
                        Fulfilled {formatDistanceToNow(new Date(order.utilizedAt), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {orders.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No service orders yet</p>
        </div>
      )}
    </div>
  );
}

