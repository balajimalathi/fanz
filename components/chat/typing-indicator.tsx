"use client";

import { Loader2 } from "lucide-react";

interface TypingIndicatorProps {
  userName: string;
}

export function TypingIndicator({ userName }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
      <div className="flex items-center gap-1">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{userName} is typing...</span>
      </div>
    </div>
  );
}

