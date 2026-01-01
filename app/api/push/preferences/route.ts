import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { notificationPreference, notificationChannelPreference } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

type NotificationChannel = 'payout' | 'follow' | 'comment' | 'message' | 'security' | 'platform';

const CHANNELS: NotificationChannel[] = ['payout', 'follow', 'comment', 'message', 'security', 'platform'];

interface UpdatePreferencesRequest {
  enabled?: boolean;
  channels?: Partial<Record<NotificationChannel, boolean>>;
}

// Helper function to get all channel preferences for a user
async function getChannelPreferences(userId: string): Promise<Record<NotificationChannel, boolean>> {
  const preferences = await db.query.notificationChannelPreference.findMany({
    where: (ncp, { eq: eqOp }) => eqOp(ncp.userId, userId),
  });

  const channelMap: Record<NotificationChannel, boolean> = {
    payout: true,
    follow: true,
    comment: true,
    message: true,
    security: true,
    platform: true,
  };

  preferences.forEach((pref) => {
    if (CHANNELS.includes(pref.channel as NotificationChannel)) {
      channelMap[pref.channel as NotificationChannel] = pref.enabled;
    }
  });

  return channelMap;
}

// Helper function to update channel preferences
async function updateChannelPreferences(
  userId: string,
  channels: Partial<Record<NotificationChannel, boolean>>
): Promise<void> {
  for (const [channel, enabled] of Object.entries(channels)) {
    if (!CHANNELS.includes(channel as NotificationChannel)) {
      continue;
    }

    const existing = await db.query.notificationChannelPreference.findFirst({
      where: (ncp, { eq: eqOp, and: andOp }) =>
        andOp(
          eqOp(ncp.userId, userId),
          eqOp(ncp.channel, channel)
        ),
    });

    if (existing) {
      await db
        .update(notificationChannelPreference)
        .set({
          enabled: enabled as boolean,
          updatedAt: new Date(),
        })
        .where(eq(notificationChannelPreference.id, existing.id));
    } else {
      await db.insert(notificationChannelPreference).values({
        userId,
        channel,
        enabled: enabled as boolean,
      });
    }
  }
}

// GET - Get notification preferences
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const preference = await db.query.notificationPreference.findFirst({
      where: (np, { eq: eqOp }) => eqOp(np.userId, session.user.id),
    });

    const globalEnabled = preference?.enabled ?? true;
    const channels = await getChannelPreferences(session.user.id);

    return NextResponse.json({
      enabled: globalEnabled,
      channels,
    });
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Update notification preferences
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body: UpdatePreferencesRequest = await request.json();
    const { enabled, channels } = body;

    // Update global preference if provided
    if (enabled !== undefined) {
      if (typeof enabled !== "boolean") {
        return NextResponse.json(
          { error: "enabled must be a boolean" },
          { status: 400 }
        );
      }

      const existing = await db.query.notificationPreference.findFirst({
        where: (np, { eq: eqOp }) => eqOp(np.userId, session.user.id),
      });

      if (existing) {
        await db
          .update(notificationPreference)
          .set({
            enabled,
            updatedAt: new Date(),
          })
          .where(eq(notificationPreference.id, existing.id));
      } else {
        await db.insert(notificationPreference).values({
          userId: session.user.id,
          enabled,
        });
      }
    }

    // Update channel preferences if provided
    if (channels && Object.keys(channels).length > 0) {
      await updateChannelPreferences(session.user.id, channels);
    }

    // Return updated preferences
    const preference = await db.query.notificationPreference.findFirst({
      where: (np, { eq: eqOp }) => eqOp(np.userId, session.user.id),
    });
    const updatedChannels = await getChannelPreferences(session.user.id);

    return NextResponse.json({
      success: true,
      enabled: preference?.enabled ?? true,
      channels: updatedChannels,
    });
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

