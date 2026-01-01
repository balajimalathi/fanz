import * as admin from "firebase-admin";
import { db } from "@/lib/db/client";
import { pushSubscription, notificationPreference, follower } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

/**
 * Firebase Cloud Messaging (FCM) Push Notification Service
 * 
 * This module handles Firebase push notifications for creator-to-follower communications.
 * 
 * Notification Types:
 * - Creator-to-Follower: Uses Firebase push notifications (this module)
 * - Admin-to-Creator: Uses DB storage + email (to be implemented separately)
 */

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    
    if (!projectId || !privateKey || !clientEmail) {
      const missing: string[] = [];
      if (!projectId) missing.push("FIREBASE_PROJECT_ID");
      if (!privateKey) missing.push("FIREBASE_PRIVATE_KEY");
      if (!clientEmail) missing.push("FIREBASE_CLIENT_EMAIL");
      
      console.error(
        `[FCM] Firebase Admin SDK not initialized - missing environment variables: ${missing.join(", ")}\n` +
        `Please add these to your .env file. You can get them from Firebase Console > Project Settings > Service Accounts`
      );
    } else {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          privateKey,
          clientEmail,
        }),
      });
      console.log("[FCM] Firebase Admin SDK initialized successfully");
    }
  } catch (error) {
    console.error("[FCM] Error initializing Firebase Admin:", error);
  }
}

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  data?: Record<string, string>;
  click_action?: string;
}

/**
 * Send push notification to a single FCM token
 */
export async function sendPushNotification(
  fcmToken: string,
  payload: PushNotificationPayload
): Promise<boolean> {
  try {
    if (!admin.apps.length) {
      console.error("Firebase Admin SDK not initialized");
      return false;
    }

    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.image,
      },
      data: payload.data || {},
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon,
          image: payload.image,
          click_action: payload.click_action,
        },
        fcmOptions: {
          link: payload.click_action,
        },
      },
    };

    await admin.messaging().send(message);
    return true;
  } catch (error: any) {
    // Handle invalid token errors
    if (error?.code === "messaging/invalid-registration-token" || 
        error?.code === "messaging/registration-token-not-registered") {
      // Token is invalid, should be removed from database
      console.warn("Invalid FCM token, should be removed:", fcmToken);
      return false;
    }
    console.error("Error sending push notification:", error);
    return false;
  }
}

/**
 * Send push notifications to multiple users
 */
export async function sendPushNotificationsToUsers(
  userIds: string[],
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number; errors?: string[] }> {
  const errors: string[] = [];
  
  if (!admin.apps.length) {
    const errorMsg = "Firebase Admin SDK not initialized";
    console.error(errorMsg);
    errors.push(errorMsg);
    return { sent: 0, failed: userIds.length, errors };
  }

  if (userIds.length === 0) {
    return { sent: 0, failed: 0 };
  }

  console.log(`[FCM] Attempting to send notifications to ${userIds.length} user(s)`);

  let sent = 0;
  let failed = 0;

  // Get all push subscriptions for these users
  const subscriptions = await db
    .select()
    .from(pushSubscription)
    .where(inArray(pushSubscription.userId, userIds));

  console.log(`[FCM] Found ${subscriptions.length} push subscription(s) for ${userIds.length} user(s)`);

  // Get notification preferences for these users
  const preferences = await db
    .select()
    .from(notificationPreference)
    .where(inArray(notificationPreference.userId, userIds));

  const enabledUserIds = new Set(
    preferences.filter((p) => p.enabled).map((p) => p.userId)
  );

  console.log(`[FCM] ${enabledUserIds.size} user(s) have notifications enabled`);

  // Filter subscriptions to only enabled users
  // Note: endpoint stores the FCM token
  const validSubscriptions = subscriptions.filter((sub) =>
    enabledUserIds.has(sub.userId)
  );

  console.log(`[FCM] ${validSubscriptions.length} valid subscription(s) after filtering`);

  if (validSubscriptions.length === 0) {
    const reasons: string[] = [];
    if (subscriptions.length === 0) {
      reasons.push("No push subscriptions found");
    }
    if (enabledUserIds.size === 0) {
      reasons.push("No users have notifications enabled");
    }
    if (subscriptions.length > 0 && enabledUserIds.size > 0) {
      reasons.push("Subscriptions exist but users have notifications disabled");
    }
    const errorMsg = `No valid subscriptions to send to. Reasons: ${reasons.join(", ")}`;
    console.warn(`[FCM] ${errorMsg}`);
    errors.push(errorMsg);
    return { sent: 0, failed: userIds.length, errors };
  }

  // Send notifications in batches using FCM multicast
  const batchSize = 500; // FCM batch limit
  for (let i = 0; i < validSubscriptions.length; i += batchSize) {
    const batch = validSubscriptions.slice(i, i + batchSize);
    const tokens = batch.map((sub) => sub.endpoint); // endpoint contains FCM token
    
    try {
      const message: admin.messaging.MulticastMessage = {
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.image,
        },
        data: payload.data || {},
        webpush: {
          notification: {
            title: payload.title,
            body: payload.body,
            icon: payload.icon,
            image: payload.image,
            click_action: payload.click_action,
          },
          fcmOptions: {
            link: payload.click_action,
          },
        },
        tokens,
      };

      console.log(`[FCM] Sending batch of ${tokens.length} notification(s)`);
      const response = await admin.messaging().sendEachForMulticast(message);
      sent += response.successCount;
      failed += response.failureCount;

      console.log(`[FCM] Batch result: ${response.successCount} sent, ${response.failureCount} failed`);

      // Remove invalid tokens and log detailed errors
      if (response.failureCount > 0) {
        const invalidTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code || "unknown";
            const errorMessage = resp.error?.message || "Unknown error";
            const tokenPreview = tokens[idx]?.substring(0, 20) + "...";
            
            console.error(`[FCM] Failed to send to token ${tokenPreview}:`, {
              code: errorCode,
              message: errorMessage,
              error: resp.error,
            });
            
            errors.push(`Token ${idx + 1}: ${errorCode} - ${errorMessage}`);
            
            if (errorCode === "messaging/invalid-registration-token" ||
                errorCode === "messaging/registration-token-not-registered") {
              invalidTokens.push(tokens[idx]);
            }
          }
        });

        if (invalidTokens.length > 0) {
          console.log(`[FCM] Removing ${invalidTokens.length} invalid token(s) from database`);
          await db
            .delete(pushSubscription)
            .where(inArray(pushSubscription.endpoint, invalidTokens));
        }
      }
    } catch (error: any) {
      const errorMsg = `Error sending batch notifications: ${error?.message || error}`;
      console.error(`[FCM] ${errorMsg}`, error);
      errors.push(errorMsg);
      failed += batch.length;
    }
  }

  console.log(`[FCM] Final result: ${sent} sent, ${failed} failed`);
  return { sent, failed, errors: errors.length > 0 ? errors : undefined };
}

/**
 * Send push notification to followers of a creator
 */
export async function sendPushToFollowers(
  creatorId: string,
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  // Get all followers for this creator
  const followers = await db
    .select()
    .from(follower)
    .where(eq(follower.creatorId, creatorId));

  const followerIds = followers.map((f) => f.followerId);

  if (followerIds.length === 0) {
    return { sent: 0, failed: 0 };
  }

  // Use the sendPushNotificationsToUsers function
  return sendPushNotificationsToUsers(followerIds, payload);
}

