"use client";

import React from "react";
import { CallStateProvider, useCallState } from "./call-state-provider";
import { IncomingCallModal } from "./incoming-call-modal";
import { ActiveCallView } from "./active-call-view";

function CallGlobalContent({ children }: { children: React.ReactNode }) {
  const { incomingCall, activeCall, acceptCall, rejectCall, endCall, setActiveCall } = useCallState();

  // Debug logging
  React.useEffect(() => {
    if (incomingCall) {
      console.log("[CallGlobalWrapper] Incoming call detected:", incomingCall);
    }
  }, [incomingCall]);

  React.useEffect(() => {
    if (activeCall) {
      console.log("[CallGlobalWrapper] Active call detected:", activeCall);
    }
  }, [activeCall]);

  const handleAccept = async () => {
    if (!incomingCall) return;
    try {
      await acceptCall(incomingCall.callId);
    } catch (error) {
      console.error("Error accepting call:", error);
    }
  };

  const handleReject = async () => {
    if (!incomingCall) return;
    try {
      await rejectCall(incomingCall.callId);
    } catch (error) {
      console.error("Error rejecting call:", error);
    }
  };

  const handleEndCall = async () => {
    if (!activeCall) return;
    try {
      await endCall(activeCall.callId);
      setActiveCall(null);
    } catch (error) {
      console.error("Error ending call:", error);
      setActiveCall(null);
    }
  };

  return (
    <>
      {children}
      {/* Show incoming call modal if there's an incoming call and no active call */}
      {incomingCall && !activeCall && (
        <IncomingCallModal
          open={!!incomingCall}
          callId={incomingCall.callId}
          callerName={incomingCall.callerName}
          callerImage={incomingCall.callerImage}
          callType={incomingCall.callType}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}
      {/* Show active call view if there's an active call */}
      {activeCall && (
        <ActiveCallView
          activeCall={activeCall}
          onCallEnd={handleEndCall}
        />
      )}
    </>
  );
}

export function CallGlobalWrapper({ children }: { children: React.ReactNode }) {
  return (
    <CallStateProvider>
      <CallGlobalContent>{children}</CallGlobalContent>
    </CallStateProvider>
  );
}

