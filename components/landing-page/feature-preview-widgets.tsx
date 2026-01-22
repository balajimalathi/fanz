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
  Users,
  Heart,
} from "lucide-react";
export type FeatureWidgetType =
  | "av-calls"
  | "livestream"
  | "custom-requests"
  | "memberships"
  | "chat"
  | "ppv"
  | "creator-profile"
  | "feature-grid";

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

function CreatorProfileWidget({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col h-full w-full bg-background overflow-hidden",
        className
      )}
    >
      {/* Banner with Profile Picture */}
      <div className="relative h-20 bg-muted/50">
        <NextImage
          src="/placeholders/blur.jpg"
          alt=""
          fill
          className="object-cover opacity-60"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        <div className="absolute -bottom-8 left-4">
          <Avatar className="h-16 w-16 border-4 border-background">
            <AvatarImage src="/placeholders/avatar-5.png" />
            <AvatarFallback className="bg-primary/20 text-primary text-lg">B</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Profile Info Section */}
      <div className="flex-1 pt-10 px-4 pb-3 flex flex-col">
        {/* Name and Follow Button */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-foreground">Balaji</h3>
            <p className="text-xs text-muted-foreground">@balaji</p>
          </div>
          <button className="rounded-full bg-fuchsia-500 hover:bg-fuchsia-600 text-white px-4 py-1.5 text-xs font-medium transition-colors">
            Follow
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span>1 followers</span>
          </div>
          <div className="flex items-center gap-1">
            <ImageIcon className="h-3.5 w-3.5" />
            <span>2 images</span>
          </div>
          <div className="flex items-center gap-1">
            <VideoIcon className="h-3.5 w-3.5" />
            <span>0 videos</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" />
            <span>1 likes</span>
          </div>
        </div>

        {/* Bio */}
        <p className="text-xs text-foreground/80 mb-3">
          Welcome to my app. Get the exclusive posts and videos
        </p>

        {/* Post Preview Card */}
        <div className="mt-auto rounded-lg border border-border/50 bg-muted/30 p-2">
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src="/placeholders/avatar-5.png" />
              <AvatarFallback className="text-[8px]">B</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium text-foreground truncate">Balaji</p>
              <p className="text-[8px] text-muted-foreground">8 days ago</p>
            </div>
          </div>
          <div className="w-full h-20 bg-muted rounded-md" />
        </div>
      </div>
    </div>
  );
}

function FeatureGridWidget({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative h-full w-full p-3 overflow-hidden",
        className
      )}
    >
      {/* Card 1: PPV Unlock */}
      <div className="absolute backdrop-blur-md shadow-md bg-white flex overflow-hidden rounded-2xl flex-col items-start border-[5px] border-white transition-all duration-500 transform rotate-3 top-2 left-2 w-[48%]">
        <div className="w-full px-2.5 py-1.5 bg-linear-to-r from-amber-100 to-orange-200 text-amber-700 font-medium text-[12px] flex items-center">
          <span className="text-[14px] mr-1">🔓</span>PPV Unlocked · ₹25
        </div>
        <div className="text-[11px] font-normal text-gray-800 px-2 pt-1.5 pb-1.5">
          Alex unlocked your exclusive video.<br />
          <span className="text-[9px] text-gray-500">just now</span>
        </div>
      </div>

      {/* Card 2: Custom Request */}
      <div className="absolute backdrop-blur-md shadow-md bg-white flex overflow-hidden rounded-2xl flex-col items-start border-[5px] border-white transition-all duration-500 transform -rotate-2 top-2 right-2 w-[48%]">
        <div className="w-full px-2.5 py-1.5 bg-linear-to-r from-emerald-100 to-teal-200 text-emerald-700 font-medium text-[12px] flex items-center">
          <span className="text-[14px] mr-1">🎬</span>Custom Request · ₹150
        </div>
        <div className="text-[11px] font-normal text-gray-800 px-2 pt-1.5 pb-1.5">
          New video request from David.<br />
          <span className="text-[9px] text-gray-500">2 min ago</span>
        </div>
      </div>

      {/* Card 3: Membership */}
      <div className="absolute backdrop-blur-md shadow-md bg-white flex overflow-hidden rounded-2xl flex-col items-start border-[5px] border-white transition-all duration-500 transform rotate-1 top-[30%] left-[5%] w-[50%]">
        <div className="w-full px-2.5 py-1.5 bg-linear-to-r from-purple-100 to-pink-200 text-purple-700 font-medium text-[12px] flex items-center">
          <span className="text-[14px] mr-1">✨</span>Membership · ₹99/mo
        </div>
        <div className="text-[11px] font-normal text-gray-800 px-2 pt-1.5 pb-1.5">
          Sarah joined VIP tier!<br />
          <span className="text-[9px] text-gray-500">5 min ago</span>
        </div>
      </div>

      {/* Card 4: Tip */}
      <div className="absolute backdrop-blur-md shadow-md bg-white flex overflow-hidden rounded-2xl flex-col items-start border-[5px] border-white transition-all duration-500 transform -rotate-3 top-[28%] right-[3%] w-[46%]">
        <div className="w-full px-2.5 py-1.5 bg-linear-to-r from-rose-100 to-red-200 text-rose-600 font-medium text-[12px] flex items-center">
          <span className="text-[14px] mr-1">💝</span>Tip · ₹50
        </div>
        <div className="text-[11px] font-normal text-gray-800 px-2 pt-1.5 pb-1.5">
          Emma sent you a tip!<br />
          <span className="text-[9px] text-gray-500">8 min ago</span>
        </div>
      </div>

      {/* Card 5: Message */}
      <div className="absolute backdrop-blur-md shadow-md bg-white flex overflow-hidden rounded-2xl flex-col items-start border-[5px] border-white transition-all duration-500 transform rotate-2 top-[52%] left-[8%] w-[44%]">
        <div className="w-full px-2.5 py-1.5 bg-linear-to-r from-sky-100 to-blue-200 text-sky-700 font-medium text-[12px] flex items-center">
          <span className="text-[14px] mr-1">💬</span>Message · ₹5
        </div>
        <div className="text-[11px] font-normal text-gray-800 px-2 pt-1.5 pb-1.5">
          New message from Mike.<br />
          <span className="text-[9px] text-gray-500">12 min ago</span>
        </div>
      </div>

      {/* Card 6: Custom Image Request */}
      <div className="absolute backdrop-blur-md shadow-md bg-white flex overflow-hidden rounded-2xl flex-col items-start border-[5px] border-white transition-all duration-500 transform -rotate-1 top-[50%] right-[5%] w-[48%]">
        <div className="w-full px-2.5 py-1.5 bg-linear-to-r from-violet-100 to-indigo-200 text-violet-700 font-medium text-[12px] flex items-center">
          <span className="text-[14px] mr-1">📸</span>Photo Request · ₹75
        </div>
        <div className="text-[11px] font-normal text-gray-800 px-2 pt-1.5 pb-1.5">
          Custom photo request from Jake.<br />
          <span className="text-[9px] text-gray-500">15 min ago</span>
        </div>
      </div>

      {/* Card 7: PPV Content */}
      <div className="absolute backdrop-blur-md shadow-md bg-white flex overflow-hidden rounded-2xl flex-col items-start border-[5px] border-white transition-all duration-500 transform rotate-3 bottom-[18%] left-[3%] w-[46%]">
        <div className="w-full px-2.5 py-1.5 bg-linear-to-r from-fuchsia-100 to-pink-200 text-fuchsia-700 font-medium text-[12px] flex items-center">
          <span className="text-[14px] mr-1">🔥</span>PPV · ₹35
        </div>
        <div className="text-[11px] font-normal text-gray-800 px-2 pt-1.5 pb-1.5">
          3 fans unlocked your post!<br />
          <span className="text-[9px] text-gray-500">20 min ago</span>
        </div>
      </div>

      {/* Card 8: Revenue Summary */}
      <div className="absolute backdrop-blur-md shadow-md bg-white flex overflow-hidden rounded-2xl flex-col items-start border-[5px] border-white transition-all duration-500 transform -rotate-2 bottom-[15%] right-[2%] w-[52%]">
        <div className="w-full px-2.5 py-1.5 bg-linear-to-r from-green-100 to-emerald-200 text-green-700 font-medium text-[12px] flex items-center">
          <span className="text-[14px] mr-1">💰</span>Revenue
        </div>
        <div className="text-[11px] font-normal text-gray-800 px-2 pt-1.5 pb-1.5">
          You earned ₹2,847 this week!<br />
          <span className="text-[9px] text-gray-500">1 hour ago</span>
        </div>
      </div>

      {/* Card 9: New Subscriber */}
      <div className="absolute backdrop-blur-md shadow-md bg-white flex overflow-hidden rounded-2xl flex-col items-start border-[5px] border-white transition-all duration-500 transform rotate-1 bottom-2 left-[15%] w-[42%]">
        <div className="w-full px-2.5 py-1.5 bg-linear-to-r from-cyan-100 to-sky-200 text-cyan-700 font-medium text-[12px] flex items-center">
          <span className="text-[14px] mr-1">👋</span>New Follower
        </div>
        <div className="text-[11px] font-normal text-gray-800 px-2 pt-1.5 pb-1.5">
          +15 new followers today!<br />
          <span className="text-[9px] text-gray-500">2 hours ago</span>
        </div>
      </div>

      {/* Card 10: Membership Renewal */}
      <div className="absolute backdrop-blur-md shadow-md bg-white flex overflow-hidden rounded-2xl flex-col items-start border-[5px] border-white transition-all duration-500 transform -rotate-3 bottom-2 right-[8%] w-[48%]">
        <div className="w-full px-2.5 py-1.5 bg-linear-to-r from-yellow-100 to-amber-200 text-yellow-700 font-medium text-[12px] flex items-center">
          <span className="text-[14px] mr-1">🔄</span>Renewal · ₹49/mo
        </div>
        <div className="text-[11px] font-normal text-gray-800 px-2 pt-1.5 pb-1.5">
          Lisa renewed membership!<br />
          <span className="text-[9px] text-gray-500">3 hours ago</span>
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
  "creator-profile": CreatorProfileWidget,
  "feature-grid": FeatureGridWidget,
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
