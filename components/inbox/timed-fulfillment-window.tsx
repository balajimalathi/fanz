"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFulfillmentTimer } from "@/hooks/use-fulfillment-timer";
import { OnlineStatusIndicator } from "./online-status-indicator";
import { FulfillmentChat } from "./fulfillment-chat";
import { FulfillmentCallControls } from "./fulfillment-call-controls";
import { FulfillmentRequestDialog } from "./fulfillment-request-dialog";
import { Phone, Video, CheckCircle2, AlertCircle } from "lucide-react";

interface ServiceOrder {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceType: "shoutout" | "audio_call" | "video_call" | "chat";
  userId: string;
  userName: string;
  creatorId: string;
  status: "pending" | "active" | "fulfilled" | "cancelled";
  activatedAt: string | null;
  utilizedAt: string | null;
}

interface TimedFulfillmentWindowProps {
  orderId: string;
}

export function TimedFulfillmentWindow({ orderId }: TimedFulfillmentWindowProps) {
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fulfillmentStarted, setFulfillmentStarted] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState({ creator: false, fan: false });

  useEffect(() => {
    fetchOrder();
    checkOnlineStatus();
    const interval = setInterval(checkOnlineStatus, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/creator/orders`);
      if (res.ok) {
        const data = await res.json();
        const foundOrder = data.orders?.find((o: ServiceOrder) => o.id === orderId);
        if (foundOrder) {
          setOrder(foundOrder);
          setFulfillmentStarted(!!foundOrder.utilizedAt);
        }
      }
    } catch (error) {
      console.error("Error fetching order:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkOnlineStatus = async () => {
    try {
      const res = await fetch(`/api/service-orders/${orderId}/online-status`);
      if (res.ok) {
        const status = await res.json();
        setOnlineStatus(status);
      }
    } catch (error) {
      console.error("Error checking online status:", error);
    }
  };

  const handleStartFulfillment = async () => {
    try {
      const res = await fetch(`/api/service-orders/${orderId}/start-fulfillment`, {
        method: "POST",
      });

      if (!res.ok) {
        const error = await res.json();
        if (error.error?.includes("online")) {
          setShowRequestDialog(true);
          return;
        }
        throw new Error(error.error || "Failed to start fulfillment");
      }

      setFulfillmentStarted(true);
      setShowRequestDialog(false);
      fetchOrder();
    } catch (error) {
      console.error("Error starting fulfillment:", error);
    }
  };

  const handleCompleteFulfillment = async () => {
    try {
      const res = await fetch(`/api/service-orders/${orderId}/complete-fulfillment`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to complete fulfillment");

      fetchOrder();
    } catch (error) {
      console.error("Error completing fulfillment:", error);
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (!order) {
    return <div className="p-4">Order not found</div>;
  }

  // Get service duration (default 30 minutes)
  const durationMinutes = 30; // TODO: Fetch from service record

  const timer = useFulfillmentTimer({
    activatedAt: order.activatedAt || new Date().toISOString(),
    durationMinutes,
    onExpire: () => {
      if (fulfillmentStarted) {
        handleCompleteFulfillment();
      }
    },
  });

  const canStartFulfillment = onlineStatus.creator && onlineStatus.fan;
  const isChatService = order.serviceType === "chat";
  const isCallService = order.serviceType === "audio_call" || order.serviceType === "video_call";

  return (
    <div className="h-full flex flex-col">
      <FulfillmentRequestDialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
        orderId={orderId}
        creatorId={order.creatorId}
        fanId={order.userId}
        onStart={handleStartFulfillment}
      />

      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{order.serviceName}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Customer: {order.userName}
              </p>
            </div>
            <Badge variant={order.status === "active" ? "default" : "secondary"}>
              {order.status}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col space-y-4">
          {/* Online Status */}
          <div className="flex gap-2">
            <OnlineStatusIndicator userId={order.creatorId} label="Creator" />
            <OnlineStatusIndicator userId={order.userId} label="Fan" />
          </div>

          {/* Timer */}
          {fulfillmentStarted && order.activatedAt && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Time Remaining:</span>
              <Badge variant={timer.isWarning ? "destructive" : "default"} className="text-lg">
                {timer.remainingTime}
              </Badge>
            </div>
          )}

          {/* Start Fulfillment Button */}
          {!fulfillmentStarted && (
            <div>
              {!canStartFulfillment ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Waiting for both parties to be online...
                  </AlertDescription>
                </Alert>
              ) : (
                <Button onClick={handleStartFulfillment} className="w-full" size="lg">
                  Start Fulfillment
                </Button>
              )}
            </div>
          )}

          {/* Fulfillment Interface */}
          {fulfillmentStarted && (
            <div className="flex-1 flex flex-col space-y-4">
              {/* Chat Interface */}
              {(isChatService || isCallService) && (
                <div className="flex-1 min-h-0">
                  <FulfillmentChat serviceOrderId={orderId} />
                </div>
              )}

              {/* Call Controls */}
              {isCallService && (
                <div>
                  <FulfillmentCallControls
                    serviceOrderId={orderId}
                    callType={order.serviceType === "video_call" ? "video" : "audio"}
                  />
                </div>
              )}

              {/* Complete Button */}
              <Button
                onClick={handleCompleteFulfillment}
                variant="outline"
                className="w-full"
                disabled={timer.isExpired}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete Fulfillment
              </Button>
            </div>
          )}

          {/* Status Messages */}
          {timer.isExpired && fulfillmentStarted && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Time has expired. Please complete the fulfillment.
              </AlertDescription>
            </Alert>
          )}

          {!onlineStatus.creator || !onlineStatus.fan ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                One party is offline. Timer paused.
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

