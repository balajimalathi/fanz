"use client";

import { createContext, useContext, ReactNode } from "react";

interface ChatOrdersHandlerContextType {
  chatEnabled: boolean;
  hasOrdersFromCreator: boolean;
  isCreator: boolean;
  onChatClick: () => void;
  onOrdersClick: () => void;
}

const ChatOrdersHandlerContext = createContext<ChatOrdersHandlerContextType | null>(null);

export function ChatOrdersHandlerProvider({ 
  children, 
  chatEnabled,
  hasOrdersFromCreator,
  isCreator,
  onChatClick,
  onOrdersClick,
}: { 
  children: ReactNode;
  chatEnabled: boolean;
  hasOrdersFromCreator: boolean;
  isCreator: boolean;
  onChatClick: () => void;
  onOrdersClick: () => void;
}) {
  return (
    <ChatOrdersHandlerContext.Provider value={{ 
      chatEnabled,
      hasOrdersFromCreator,
      isCreator,
      onChatClick,
      onOrdersClick,
    }}>
      {children}
    </ChatOrdersHandlerContext.Provider>
  );
}

export function useChatOrdersHandler() {
  const context = useContext(ChatOrdersHandlerContext);
  return context;
}
