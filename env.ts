import "dotenv/config";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    WORDPRESS_URL: z.string().url(),
    WORDPRESS_HOSTNAME: z.string(),
    DATABASE_URL: z.string().url(),
    // Auth & identity (BetterAuth)
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.string().url(),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    // Cloudflare R2 storage
    CLOUDFLARE_R2_ACCOUNT_ID: z.string().min(1),
    CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().min(1),
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().min(1),
    CLOUDFLARE_R2_BUCKET_NAME: z.string().min(1),
    CLOUDFLARE_R2_PUBLIC_URL: z.string().url(),
    // Redis for job queue (BullMQ)
    REDIS_HOST: z.string().min(1).default("localhost"),
    REDIS_PORT: z.string().regex(/^\d+$/).default("6379"),
    REDIS_PASSWORD: z.string().optional(),
    REDIS_DB: z.string().regex(/^\d+$/).default("0"),
    // Firebase Admin SDK (for push notifications)
    FIREBASE_PROJECT_ID: z.string().min(1).optional(),
    FIREBASE_PRIVATE_KEY: z.string().optional(),
    FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
    // LiveKit for WebRTC calls
    LIVEKIT_URL: z.string().url().optional(),
    LIVEKIT_API_KEY: z.string().optional(),
    LIVEKIT_API_SECRET: z.string().optional(),
    // Socket.IO configuration
    SOCKETIO_URL: z.string().url().optional(), // Socket.IO server URL
    SOCKETIO_PORT: z.string().regex(/^\d+$/).default("3001"),
    // WebSocket configuration (deprecated, kept for backward compatibility)
    WEBSOCKET_URL: z.string().optional(), // Can be ws:// or wss:// URL
    WEBSOCKET_MAX_CONNECTIONS: z.string().regex(/^\d+$/).default("1000"),
    CHAT_MEDIA_MAX_SIZE: z.string().default("52428800"), // 50MB in bytes
    // Payment Gateway configuration
    PAYMENT_GATEWAY_ENABLED: z.string().transform((val) => val === "true").default("false"),
    PAYMENT_GATEWAY_TYPE: z.enum(["paytm", "ccbill", "epoch", "segpay"]).optional().default("paytm"),
    PAYMENT_GATEWAY_API_KEY: z.string().optional(),
    PAYMENT_GATEWAY_SECRET_KEY: z.string().optional(),
    PAYMENT_GATEWAY_MERCHANT_ID: z.string().optional(),
    PAYMENT_GATEWAY_WEBHOOK_SECRET: z.string().optional(),
    PAYMENT_GATEWAY_MODE: z.enum(["live", "test"]).default("test"),
    // Resend email service
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM_EMAIL: z.string().email().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    // Firebase Client SDK (for push notifications)
    NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional(),
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_FIREBASE_VAPID_KEY: z.string().min(1).optional(),
  },
  // If you're using Next.js < 13.4.4, you'll need to specify the runtimeEnv manually
  runtimeEnv: {
    WORDPRESS_URL: process.env.WORDPRESS_URL,
    WORDPRESS_HOSTNAME: process.env.WORDPRESS_HOSTNAME,
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET, 
    CLOUDFLARE_R2_ACCOUNT_ID: process.env.CLOUDFLARE_R2_ACCOUNT_ID,
    CLOUDFLARE_R2_ACCESS_KEY_ID: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    CLOUDFLARE_R2_BUCKET_NAME: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    CLOUDFLARE_R2_PUBLIC_URL: process.env.CLOUDFLARE_R2_PUBLIC_URL,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    REDIS_DB: process.env.REDIS_DB,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    LIVEKIT_URL: process.env.LIVEKIT_URL,
    LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
    SOCKETIO_URL: process.env.SOCKETIO_URL,
    SOCKETIO_PORT: process.env.SOCKETIO_PORT,
    WEBSOCKET_URL: process.env.WEBSOCKET_URL,
    WEBSOCKET_MAX_CONNECTIONS: process.env.WEBSOCKET_MAX_CONNECTIONS,
    CHAT_MEDIA_MAX_SIZE: process.env.CHAT_MEDIA_MAX_SIZE,
    PAYMENT_GATEWAY_ENABLED: process.env.PAYMENT_GATEWAY_ENABLED,
    PAYMENT_GATEWAY_TYPE: process.env.PAYMENT_GATEWAY_TYPE,
    PAYMENT_GATEWAY_API_KEY: process.env.PAYMENT_GATEWAY_API_KEY,
    PAYMENT_GATEWAY_SECRET_KEY: process.env.PAYMENT_GATEWAY_SECRET_KEY,
    PAYMENT_GATEWAY_MERCHANT_ID: process.env.PAYMENT_GATEWAY_MERCHANT_ID,
    PAYMENT_GATEWAY_WEBHOOK_SECRET: process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET,
    PAYMENT_GATEWAY_MODE: process.env.PAYMENT_GATEWAY_MODE,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_VAPID_KEY: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  },
});
