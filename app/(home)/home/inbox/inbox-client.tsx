"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { TimedFulfillmentWindow } from "@/components/inbox/timed-fulfillment-window";

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
  activatedAt: string | null;
  utilizedAt: string | null;
  amount: number;
  createdAt: string;
}

interface InboxPageClientProps {
  creatorId: string;
}

export function InboxPageClient({ creatorId }: InboxPageClientProps) {
  const searchParams = useSearchParams();
  const orderIdFromUrl = searchParams.get("orderId");
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(orderIdFromUrl);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [creatorId]);

  useEffect(() => {
    if (orderIdFromUrl) {
      setSelectedOrderId(orderIdFromUrl);
    }
  }, [orderIdFromUrl]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/creator/orders");
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      // Filter to only active orders for fulfillment
      const activeOrders = (data.orders || []).filter(
        (o: ServiceOrder) => o.status === "active"
      );
      setOrders(activeOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setIsLoading(false);
    }
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
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-screen flex">
      {/* Left Panel - Service Orders List */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">Active Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {orders.length} {orders.length === 1 ? "order" : "orders"} ready to fulfill
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {orders.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <p>No active orders to fulfill</p>
            </div>
          ) : (
            <div className="divide-y">
              {orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className={`p-4 hover:bg-accent transition-colors cursor-pointer ${
                    selectedOrderId === order.id ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback>
                        {order.userName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium truncate text-sm">{order.serviceName}</p>
                        <Badge variant="default" className="text-xs">
                          {order.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {order.userName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getServiceTypeLabel(order.serviceType)}
                      </p>
                      {order.activatedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(order.activatedAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Fulfillment Window */}
      <div className="flex-1 flex flex-col">
        {selectedOrderId ? (
          <TimedFulfillmentWindow orderId={selectedOrderId} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Select an order to start fulfillment</p>
          </div>
        )}
      </div>
    </div>
  );
}

