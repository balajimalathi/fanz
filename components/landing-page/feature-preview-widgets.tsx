import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import NextImage from "next/image";
import {
  Mic,
  Video,
  PhoneOff,
  Lock,
  Phone,
  VideoIcon,
  Gift,
  Image as ImageIcon,
} from "lucide-react";
export type FeatureWidgetType =
  | "av-calls"
  | "livestream"
  | "custom-requests"
  | "memberships"
  | "chat"
  | "ppv";

function AvCallsWidget({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 h-full w-full bg-muted/80 p-3",
        className
      )}
    >
      <Avatar className="h-12 w-12 border-2 border-primary/30">
        <AvatarImage src={`/placeholders/avatar-5.png`} />
        <AvatarFallback className="bg-primary/20 text-primary text-sm">CR</AvatarFallback>
      </Avatar>
      <span className="text-xs font-mono font-medium text-foreground/80">02:34</span>
      <div className="flex gap-1.5">
        <div className="rounded-full bg-background p-1.5 shadow-sm">
          <Mic className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="rounded-full bg-background p-1.5 shadow-sm">
          <Video className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="rounded-full bg-destructive/90 p-1.5">
          <PhoneOff className="h-3.5 w-3.5 text-destructive-foreground" />
        </div>
      </div>
    </div>
  );
}

function LivestreamWidget({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full w-full overflow-hidden",
        className
      )}
    >
      <div className="relative flex-[0.65] bg-black/80 min-w-0 min-h-0">
        <NextImage
          src="/placeholders/stream.jpeg"
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 768px) 65vw, 22vw"
        />
      </div>
      <div className="flex-[0.35] flex flex-col bg-muted/90 border-l border-border/50 min-w-0 min-h-0">
        <div className="flex-1 min-h-0 overflow-hidden px-1.5 py-1 space-y-1">
          <div className="flex gap-1.5 items-start">
            <Avatar className="h-4 w-4 shrink-0">
              <AvatarImage src={`/placeholders/avatar-6.png`} />
              <AvatarFallback className="text-[8px]">A</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-[9px] text-foreground/90 truncate">Fan123: Love this!</p>
            </div>
          </div>
          <div className="flex gap-1.5 items-start">
            <Avatar className="h-4 w-4 shrink-0">
              <AvatarImage src={`/placeholders/avatar-8.png`} />
              <AvatarFallback className="text-[8px]">B</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-[9px] text-foreground/90 truncate">User2: 🔥</p>
            </div>
          </div>
        </div>
        <div className="p-1 border-t border-border/50 shrink-0">
          <div className="w-full flex items-center justify-center gap-1 rounded bg-primary/20 text-primary py-1 px-1.5">
            <Gift className="h-3 w-3" />
            <span className="text-[9px] font-medium">Tip</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomRequestsWidget({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col justify-center h-full w-full bg-muted/80 p-3 gap-2",
        className
      )}
    >
      <div className="flex items-center gap-2 rounded-lg bg-background border border-border/50 px-2.5 py-2">
        <div className="rounded bg-primary/10 p-1.5">
          <Video className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground truncate">Custom video</p>
          <p className="text-[10px] text-primary font-semibold">₹499</p>
        </div>
        <Badge variant="secondary" className="text-[9px] shrink-0">
          Pending
        </Badge>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-background border border-border/50 px-2.5 py-2">
        <div className="rounded bg-primary/10 p-1.5">
          <ImageIcon className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground truncate">Custom image</p>
          <p className="text-[10px] text-primary font-semibold">₹199</p>
        </div>
        <Badge variant="secondary" className="text-[9px] shrink-0">
          Pending
        </Badge>
      </div>
    </div>
  );
}

function MembershipsWidget({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col h-full w-full overflow-hidden rounded-lg",
        className
      )}
    >
      <div className="h-10 bg-linear-to-br from-primary/30 to-primary/10 flex items-center justify-center">
        <span className="text-[10px] font-semibold text-primary">✨VIP✨</span>
      </div>
      <div className="flex-1 flex flex-col justify-center gap-1.5 bg-muted/80 px-2.5 py-2">
        <p className="text-[10px] text-muted-foreground">
          <span>Teaser Club | </span>₹99/month</p>
        <div className="rounded bg-primary px-2 py-1 text-center">
          <span className="text-[9px] font-medium text-primary-foreground">Subscribe</span>
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center gap-1.5 bg-muted/80 px-2.5 py-2">
        <p className="text-[10px] text-muted-foreground">
          <span>Super Fan Club | </span>₹299/month</p>
        <div className="rounded bg-primary px-2 py-1 text-center">
          <span className="text-[9px] font-medium text-primary-foreground">Subscribe</span>
        </div>
      </div>
    </div>
  );
}

function ChatWidget({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col h-full w-full bg-muted/80 overflow-hidden",
        className
      )}
    >
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border/50 bg-background/80 shrink-0">
        <Avatar className="h-6 w-6">
          <AvatarImage src={`/placeholders/avatar-5.png`} />
          <AvatarFallback className="text-[10px]">CR</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium text-foreground truncate">Anshika Sharma</p>
          <p className="text-[8px] text-emerald-500">Online</p>
        </div>
        <div className="flex gap-2">
          <Phone className="h-3 w-3 text-muted-foreground" />
          <VideoIcon className="h-3 w-3 text-muted-foreground" />
        </div>
      </div>
      <div className="flex-1 min-h-0 p-2 space-y-1.5 overflow-hidden">
        <div className="flex justify-start">
          <div className="rounded-lg bg-muted px-2 py-1 max-w-[85%]">
            <p className="text-[9px] text-foreground/90">Hey! 👋</p>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="rounded-lg bg-primary/20 px-2 py-1 max-w-[85%]">
            <p className="text-[9px] text-foreground">Thanks for reaching out!</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PpvWidget({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm",
        className
      )}
    >
      <div className="flex flex-col items-center gap-1.5 text-white px-3 py-2 text-center">
        <Lock className="h-8 w-8 text-white/90" />
        <p className="text-[10px] font-semibold">Exclusive Content</p>
        <p className="text-xs font-bold">₹99</p>
        <div className="rounded bg-primary px-2 py-1">
          <span className="text-[9px] font-medium text-primary-foreground">Unlock</span>
        </div>
      </div>
    </div>
  );
}

const WIDGET_MAP: Record<
  FeatureWidgetType,
  ({ className }: { className?: string }) => JSX.Element
> = {
  "av-calls": AvCallsWidget,
  livestream: LivestreamWidget,
  "custom-requests": CustomRequestsWidget,
  memberships: MembershipsWidget,
  chat: ChatWidget,
  ppv: PpvWidget,
};

export function FeaturePreviewWidget({
  widgetType,
  className,
}: {
  widgetType: FeatureWidgetType;
  className?: string;
}) {
  const Widget = WIDGET_MAP[widgetType];
  const isPpv = widgetType === "ppv";
  return (
    <div className={cn("relative w-full h-full overflow-hidden", isPpv && "bg-muted/80")}>
      {isPpv && (
        <NextImage
          src="/placeholders/blur.jpg"
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      )}
      <Widget className={className} />
    </div>
  );
}
