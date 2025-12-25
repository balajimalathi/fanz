"use client";

import { ConversationList } from "@/components/chat/conversation-list";
import { useRouter } from "next/navigation";

export default function ChatPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto h-screen flex">
      <div className="w-1/3 border-r">
        <div className="h-full flex flex-col">
          <div className="border-b p-4">
            <h1 className="text-xl font-bold">Messages</h1>
          </div>
          <ConversationList
            onSelectConversation={(id) => {
              router.push(`/chat/${id}`);
            }}
          />
        </div>
      </div>
      <div className="flex-1">
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <p>Select a conversation to start chatting</p>
        </div>
      </div>
    </div>
  );
}

