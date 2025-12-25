"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ConversationItemProps {
  id: string;
  otherParticipant: {
    id: string;
    name: string;
    image?: string | null;
    username?: string;
    role: "creator" | "fan";
  };
  lastMessageAt: Date | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  isEnabled?: boolean;
  onClick: () => void;
  isActive?: boolean;
}

export function ConversationItem({
  otherParticipant,
  lastMessageAt,
  lastMessagePreview,
  unreadCount,
  isEnabled = true,
  onClick,
  isActive = false,
}: ConversationItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 p-4 cursor-pointer hover:bg-accent transition-colors",
        isActive && "bg-accent"
      )}
    >
      <Avatar className="h-12 w-12">
        <AvatarImage src={otherParticipant.image || undefined} alt={otherParticipant.name} />
        <AvatarFallback>
          {otherParticipant.name.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium truncate">{otherParticipant.name}</p>
          {lastMessageAt && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(lastMessageAt), { addSuffix: true })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className="text-sm text-muted-foreground truncate">
            {lastMessagePreview || "No messages yet"}
          </p>
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-medium rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
        {!isEnabled && (
          <div className="mt-1">
            <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded">
              Waiting for creator to enable
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

