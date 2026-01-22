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
  Link,
  Copy,
  TrendingUp,
  Eye,
  MousePointerClick,
  Radio,
  MessageCircle,
  DollarSign,
  Share2,
  BarChart3,
} from "lucide-react";
export type FeatureWidgetType =
  | "av-calls"
  | "livestream"
  | "custom-requests"
  | "memberships"
  | "chat"
  | "ppv"
  | "creator-profile"
  | "feature-grid"
  | "share-earn";

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

type NotificationCard = {
  icon: string;
  title: string;
  amount?: string;
  description: string;
  timestamp: string;
  position: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  rotation: number;
  width: string;
  gradient: {
    from: string;
    to: string;
    textColor: string;
  };
};
const NOTIFICATION_CARDS: NotificationCard[] = [
  {
    icon: "🔓",
    title: "PPV Unlocked",
    amount: "₹25",
    description: "Alex unlocked your exclusive video.",
    timestamp: "just now",
    position: { top: "1%", left: "2%" },
    rotation: 4,
    width: "46%",
    gradient: {
      from: "amber-100",
      to: "orange-200",
      textColor: "amber-700",
    },
  },
  {
    icon: "🎬",
    title: "Custom Request",
    amount: "₹150",
    description: "New video request from David.",
    timestamp: "2 min ago",
    position: { top: "6%", right: "3%" },
    rotation: -5,
    width: "48%",
    gradient: {
      from: "emerald-100",
      to: "teal-200",
      textColor: "emerald-700",
    },
  },
  {
    icon: "✨",
    title: "Membership",
    amount: "₹99/mo",
    description: "Sarah joined VIP tier!",
    timestamp: "5 min ago",
    position: { top: "18%", left: "1%" },
    rotation: -3,
    width: "50%",
    gradient: {
      from: "purple-100",
      to: "pink-200",
      textColor: "purple-700",
    },
  },
  {
    icon: "💝",
    title: "Tip",
    amount: "₹50",
    description: "Emma sent you a tip!",
    timestamp: "8 min ago",
    position: { top: "24%", right: "6%" },
    rotation: 6,
    width: "44%",
    gradient: {
      from: "rose-100",
      to: "red-200",
      textColor: "rose-600",
    },
  },
  {
    icon: "💬",
    title: "Message",
    amount: "₹5",
    description: "New message from Mike.",
    timestamp: "12 min ago",
    position: { top: "38%", left: "2%" },
    rotation: 2,
    width: "48%",
    gradient: {
      from: "sky-100",
      to: "blue-200",
      textColor: "sky-700",
    },
  },
  {
    icon: "📸",
    title: "Photo Request",
    amount: "₹75",
    description: "Custom photo request from Jake.",
    timestamp: "15 min ago",
    position: { top: "42%", right: "-1%" },
    rotation: -4,
    width: "46%",
    gradient: {
      from: "violet-100",
      to: "indigo-200",
      textColor: "violet-700",
    },
  },
  {
    icon: "🔥",
    title: "PPV",
    amount: "₹35",
    description: "3 fans unlocked your post!",
    timestamp: "20 min ago",
    position: { bottom: "26%", left: "1%" },
    rotation: 5,
    width: "48%",
    gradient: {
      from: "fuchsia-100",
      to: "pink-200",
      textColor: "fuchsia-700",
    },
  },
  {
    icon: "💰",
    title: "Revenue",
    description: "You earned ₹2,847 this week!",
    timestamp: "1 hour ago",
    position: { bottom: "20%", right: "1%" },
    rotation: 3,
    width: "52%",
    gradient: {
      from: "green-100",
      to: "emerald-200",
      textColor: "green-700",
    },
  },
  {
    icon: "👋",
    title: "New Follower",
    description: "+15 new followers today!",
    timestamp: "2 hours ago",
    position: { bottom: "8%", left: "1%" },
    rotation: -3,
    width: "42%",
    gradient: {
      from: "cyan-100",
      to: "sky-200",
      textColor: "cyan-700",
    },
  },
  {
    icon: "🔄",
    title: "Renewal",
    amount: "₹49/mo",
    description: "Lisa renewed membership!",
    timestamp: "3 hours ago",
    position: { bottom: "5%", right: "6%" },
    rotation: 5,
    width: "48%",
    gradient: {
      from: "yellow-100",
      to: "amber-200",
      textColor: "yellow-700",
    },
  },
];


function FeatureGridWidget({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative h-full w-full p-3",
        className
      )}
    >
      {NOTIFICATION_CARDS.map((card, index) => {
        const positionStyles: React.CSSProperties = {
          ...card.position,
          width: card.width,
          transform: `rotate(${card.rotation}deg)`,
        };

        const gradientClassMap: Record<string, string> = {
          "amber-100-orange-200-amber-700": "bg-linear-to-r from-amber-100 to-orange-200 text-amber-700",
          "emerald-100-teal-200-emerald-700": "bg-linear-to-r from-emerald-100 to-teal-200 text-emerald-700",
          "purple-100-pink-200-purple-700": "bg-linear-to-r from-purple-100 to-pink-200 text-purple-700",
          "rose-100-red-200-rose-600": "bg-linear-to-r from-rose-100 to-red-200 text-rose-600",
          "sky-100-blue-200-sky-700": "bg-linear-to-r from-sky-100 to-blue-200 text-sky-700",
          "violet-100-indigo-200-violet-700": "bg-linear-to-r from-violet-100 to-indigo-200 text-violet-700",
          "fuchsia-100-pink-200-fuchsia-700": "bg-linear-to-r from-fuchsia-100 to-pink-200 text-fuchsia-700",
          "green-100-emerald-200-green-700": "bg-linear-to-r from-green-100 to-emerald-200 text-green-700",
          "cyan-100-sky-200-cyan-700": "bg-linear-to-r from-cyan-100 to-sky-200 text-cyan-700",
          "yellow-100-amber-200-yellow-700": "bg-linear-to-r from-yellow-100 to-amber-200 text-yellow-700",
        };

        const gradientKey = `${card.gradient.from}-${card.gradient.to}-${card.gradient.textColor}`;
        const gradientClass = gradientClassMap[gradientKey] || "";

        return (
          <div
            key={index}
            className="absolute backdrop-blur-md shadow-md bg-background flex overflow-hidden rounded-2xl flex-col items-start border-[5px] border-border transition-all duration-500"
            style={positionStyles}
          >
            <div className={cn("w-full px-2.5 py-1.5 font-medium text-[12px] flex items-center", gradientClass)}>
              <span className="text-[14px] mr-1">{card.icon}</span>
              {card.title}
              {card.amount && ` · ${card.amount}`}
            </div>
            <div className="text-[11px] font-normal text-foreground px-2 pt-1.5 pb-1.5">
              {card.description}
              <br />
              <span className="text-[9px] text-muted-foreground">{card.timestamp}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ShareEarnWidget({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative h-full w-full bg-background p-4 overflow-hidden flex flex-col gap-3",
        className
      )}
    >
      {/* Link Sharing Card */}
      <div className="bg-background rounded-xl border border-border/50 p-3 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="rounded-full bg-green-100 p-1.5">
            <Link className="h-3.5 w-3.5 text-green-600" />
          </div>
          <span className="text-xs font-medium text-foreground">Your Creator Link</span>
        </div>
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
          <span className="text-[11px] text-muted-foreground truncate flex-1">desifans.com/balaji</span>
          <button className="flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">
            <Copy className="h-3 w-3" />
            Copy
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-muted-foreground">Share on:</span>
          <div className="flex gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-[8px] text-white font-bold">IG</span>
            </div>
            <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center">
              <span className="text-[8px] text-white font-bold">X</span>
            </div>
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="text-[8px] text-white font-bold">FB</span>
            </div>
            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
              <span className="text-[8px] text-white font-bold">YT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 flex-1">
        {/* Engagement Card */}
        <div className="bg-background rounded-xl border border-border/50 p-2.5 shadow-sm flex flex-col">
          <div className="flex items-center gap-1.5 mb-1">
            <BarChart3 className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-[10px] font-medium text-muted-foreground">This Week</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-foreground">₹12,847</span>
            <span className="text-[9px] text-green-500 font-medium flex items-center">
              <TrendingUp className="h-2.5 w-2.5" />
              +23%
            </span>
          </div>
          <span className="text-[9px] text-muted-foreground">Total earnings</span>
        </div>

        {/* Live Status */}
        <div className="bg-background rounded-xl border border-border/50 p-2.5 shadow-sm flex flex-col">
          <div className="flex items-center gap-1.5 mb-1">
            <Radio className="h-3.5 w-3.5 text-red-500" />
            <span className="text-[10px] font-medium text-muted-foreground">Go Live</span>
          </div>
          <div className="flex items-center gap-1.5 mt-auto">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[11px] font-medium text-foreground">247 watching</span>
          </div>
          <span className="text-[9px] text-muted-foreground">Start streaming</span>
        </div>

        {/* Profile Views */}
        <div className="bg-background rounded-xl border border-border/50 p-2.5 shadow-sm flex flex-col">
          <div className="flex items-center gap-1.5 mb-1">
            <Eye className="h-3.5 w-3.5 text-purple-500" />
            <span className="text-[10px] font-medium text-muted-foreground">Views</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-foreground">3.2K</span>
            <span className="text-[9px] text-green-500 font-medium flex items-center">
              <TrendingUp className="h-2.5 w-2.5" />
              +18%
            </span>
          </div>
          <span className="text-[9px] text-muted-foreground">Profile visits</span>
        </div>

        {/* Link Clicks */}
        <div className="bg-background rounded-xl border border-border/50 p-2.5 shadow-sm flex flex-col">
          <div className="flex items-center gap-1.5 mb-1">
            <MousePointerClick className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-[10px] font-medium text-muted-foreground">Clicks</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-foreground">892</span>
            <span className="text-[9px] text-green-500 font-medium flex items-center">
              <TrendingUp className="h-2.5 w-2.5" />
              +31%
            </span>
          </div>
          <span className="text-[9px] text-muted-foreground">Link clicks</span>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-background rounded-xl border border-border/50 p-2.5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-medium text-muted-foreground">Recent Activity</span>
          <span className="text-[9px] text-primary">View all</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src="/placeholders/avatar-6.png" />
              <AvatarFallback className="text-[8px]">A</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-foreground truncate">
                <span className="font-medium">Alex</span> sent you a message
              </p>
            </div>
            <MessageCircle className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src="/placeholders/avatar-8.png" />
              <AvatarFallback className="text-[8px]">S</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-foreground truncate">
                <span className="font-medium">Sarah</span> tipped ₹100
              </p>
            </div>
            <DollarSign className="h-3 w-3 text-green-500" />
          </div>
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
  "share-earn": ShareEarnWidget,
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
