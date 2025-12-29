"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Follower {
  id: string;
  followerId: string;
  followerName: string;
  followerEmail: string;
  createdAt: string;
}

interface InboxPageClientProps {
  creatorId: string;
}

export function InboxPageClient({ creatorId }: InboxPageClientProps) {
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFollowers();
  }, [creatorId]);

  const fetchFollowers = async () => {
    try {
      setIsLoading(true);
      const followersRes = await fetch(`/api/followers?creatorId=${creatorId}`);
      if (!followersRes.ok) throw new Error("Failed to fetch followers");
      const followersData = await followersRes.json();

      // Sort by creation time
      followersData.sort((a: Follower, b: Follower) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setFollowers(followersData);
    } catch (error) {
      console.error("Error fetching followers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold">Followers</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {followers.length} {followers.length === 1 ? "follower" : "followers"}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {followers.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <p>No followers yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {followers.map((follower) => (
              <div
                key={follower.followerId}
                className="p-4 hover:bg-accent transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarFallback>
                      {follower.followerName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium truncate">{follower.followerName}</p>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(follower.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {follower.followerEmail}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

