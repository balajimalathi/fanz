"use client";

import { createContext, useContext, ReactNode } from "react";

interface LiveHandlerContextType {
  onLiveClick: (streamId: string, streamType: "free" | "follower_only" | "paid", price?: number | null) => void;
}

const LiveHandlerContext = createContext<LiveHandlerContextType | null>(null);

export function LiveHandlerProvider({ 
  children, 
  onLiveClick 
}: { 
  children: ReactNode;
  onLiveClick: (streamId: string, streamType: "free" | "follower_only" | "paid", price?: number | null) => void;
}) {
  return (
    <LiveHandlerContext.Provider value={{ onLiveClick }}>
      {children}
    </LiveHandlerContext.Provider>
  );
}

export function useLiveHandler() {
  const context = useContext(LiveHandlerContext);
  return context;
}
