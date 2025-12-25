"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatHeaderProps {
  otherParticipant: {
    id: string;
    name: string;
    image?: string | null;
  };
  onBack: () => void;
}

export function ChatHeader({ otherParticipant, onBack }: ChatHeaderProps) {
  return (
    <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex items-center gap-3 p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-9 w-9"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-8 w-8">
          <AvatarImage src={otherParticipant.image || undefined} alt={otherParticipant.name} />
          <AvatarFallback>
            {otherParticipant.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-medium">{otherParticipant.name}</p>
        </div>
      </div>
    </div>
  );
}

