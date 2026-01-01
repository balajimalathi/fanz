"use client";

interface TypingIndicatorProps {
  userName: string;
}

export function TypingIndicator({ userName }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">{userName} is typing</span>
        <div className="flex gap-1 ml-1">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground"
            style={{
              animation: "typing 1.4s ease-in-out infinite",
              animationDelay: "0ms",
            }}
          />
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground"
            style={{
              animation: "typing 1.4s ease-in-out infinite",
              animationDelay: "150ms",
            }}
          />
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground"
            style={{
              animation: "typing 1.4s ease-in-out infinite",
              animationDelay: "300ms",
            }}
          />
        </div>
      </div>
    </div>
  );
}

