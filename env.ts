import "dotenv/config";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    WORDPRESS_URL: z.string().url(),
    WORDPRESS_HOSTNAME: z.string(),
    DODO_PAYMENTS_API_KEY: z.string().min(1),
    DODO_PAYMENTS_WEBHOOK_KEY: z.string().min(1),
    DODO_PAYMENTS_RETURN_URL: z.string().url(),
    DODO_PAYMENTS_ENVIRONMENT: z.any(),
    DATABASE_URL: z.string().url(),
    DODO_STARTER_PRODUCT_ID: z.string().min(1),
    DODO_PRO_PRODUCT_ID: z.string().min(1),
    DODO_LIFETIME_PRODUCT_ID: z.string().min(1),
    // Auth & identity (BetterAuth)
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.string().url(),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    // LLM & vector stack
    OPENROUTER_API_KEY: z.string().min(1),
    OPENROUTER_CHAT_MODEL: z.string().min(1),
    OPENROUTER_EMBEDDING_MODEL: z.string().min(1),
    MISTRAL_API_KEY: z.string().min(1),
    QDRANT_URL: z.string().url(),
    QDRANT_API_KEY: z.string().min(1),
    // Object storage (RustFS)
    RUSTFS_URL: z.string().url(),
    RUSTFS_API_KEY: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  // If you're using Next.js < 13.4.4, you'll need to specify the runtimeEnv manually
  runtimeEnv: {
    WORDPRESS_URL: process.env.WORDPRESS_URL,
    WORDPRESS_HOSTNAME: process.env.WORDPRESS_HOSTNAME,
    DODO_PAYMENTS_API_KEY: process.env.DODO_PAYMENTS_API_KEY,
    DODO_PAYMENTS_WEBHOOK_KEY: process.env.DODO_PAYMENTS_WEBHOOK_KEY,
    DODO_PAYMENTS_RETURN_URL: process.env.DODO_PAYMENTS_RETURN_URL,
    DODO_PAYMENTS_ENVIRONMENT: process.env.DODO_PAYMENTS_ENVIRONMENT,
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    DODO_STARTER_PRODUCT_ID: process.env.DODO_STARTER_PRODUCT_ID,
    DODO_PRO_PRODUCT_ID: process.env.DODO_PRO_PRODUCT_ID,
    DODO_LIFETIME_PRODUCT_ID: process.env.DODO_LIFETIME_PRODUCT_ID,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_CHAT_MODEL: process.env.OPENROUTER_CHAT_MODEL,
    OPENROUTER_EMBEDDING_MODEL: process.env.OPENROUTER_EMBEDDING_MODEL,
    MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
    QDRANT_URL: process.env.QDRANT_URL,
    QDRANT_API_KEY: process.env.QDRANT_API_KEY,
    RUSTFS_URL: process.env.RUSTFS_URL,
    RUSTFS_API_KEY: process.env.RUSTFS_API_KEY,
  },
});
