"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface ChatContextType {
  openChat: () => void;
  isChatOpen: boolean;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function useChatContext() {
  const context = useContext(ChatContext);
  return context;
}

interface ChatProviderProps {
  children: ReactNode;
  onOpenChat: () => void;
  isChatOpen: boolean;
}

export function ChatProvider({ children, onOpenChat, isChatOpen }: ChatProviderProps) {
  return (
    <ChatContext.Provider value={{ openChat: onOpenChat, isChatOpen }}>
      {children}
    </ChatContext.Provider>
  );
}

