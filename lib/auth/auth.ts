import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, createAuthMiddleware, organization } from "better-auth/plugins";
import { db } from "../db/client";
import { creator, user } from "../db/schema";
import { eq } from "drizzle-orm";

// Detect environment for cookie configuration
const baseURL = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";
const isLocalhost = baseURL.includes('localhost') || baseURL.includes('127.0.0.1');
const isProduction = !isLocalhost && (baseURL.includes('skndan.cloud') || process.env.NODE_ENV === 'production');
const useSecureCookies = isProduction || baseURL.startsWith('https://');

// Build trusted origins list with wildcard support for subdomains
// Better-auth supports wildcard patterns like *.example.com
const trustedOrigins: string[] = [];

// Always include the base URL origin
try {
  const url = new URL(baseURL);
  const baseOrigin = url.origin;
  trustedOrigins.push(baseOrigin);

  // Extract domain pattern for wildcard subdomain support
  const hostname = url.hostname;
  const protocol = url.protocol;
  const port = url.port ? `:${url.port}` : '';

  if (isLocalhost) {
    // For localhost, allow all subdomains: *.localhost:3000
    // Also allow the base localhost
    trustedOrigins.push(`${protocol}//*.localhost${port}`);
    trustedOrigins.push(`${protocol}//localhost${port}`);
  } else if (isProduction) {
    // For production, allow all subdomains: *.skndan.cloud
    // Extract the domain (e.g., skndan.cloud from subdomain.skndan.cloud)
    const domainParts = hostname.split('.');
    if (domainParts.length >= 2) {
      // Get the base domain (last 2 parts: domain.tld)
      const baseDomain = domainParts.slice(-2).join('.');
      trustedOrigins.push(`${protocol}//*.${baseDomain}${port}`);
    }
  }
} catch (e) {
  // Invalid URL, skip
}

// Add additional trusted origins from environment variable (comma-separated)
// This allows manual override or additional origins beyond the wildcard pattern
const envTrustedOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS;
if (envTrustedOrigins) {
  const additionalOrigins = envTrustedOrigins.split(',').map(origin => origin.trim()).filter(Boolean);
  trustedOrigins.push(...additionalOrigins);
}

export const auth = betterAuth({
  baseURL,
  trustedOrigins: trustedOrigins.length > 0 ? trustedOrigins : undefined,
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => { }),
  },
  account: {},
  plugins: [admin(), nextCookies(), organization({})],
  // Ensure cookies work correctly in both localhost and production
  // OAuth state cookies need SameSite=None with Secure=true for cross-site redirects
  advanced: {
    cookiePrefix: "better-auth",
    defaultCookieAttributes: {
      sameSite: useSecureCookies ? "none" : "lax",
      secure: useSecureCookies,
      path: "/",
    },
    crossSubDomainCookies: {
      enabled: true,
      domain: isLocalhost ? "localhost" : (isProduction ? ".skndan.cloud" : undefined),
    },
  },
  databaseHooks: {
    session: {
      create: {
        after: async (createdSession, context) => {
          try {
            const userId = createdSession.userId;
            if (!userId) return;

            const userRecord = await db.query.user.findFirst({
              where: (u, { eq: eqOp }) => eqOp(u.id, userId),
            });

            if (!userRecord) return;

            // Check if user already has a role set
            // If role is "user", keep it (customer sign-in from /u/*)
            // If role is null or undefined, check the callbackURL to determine
            // For now, if role is not set, we'll check the referrer or use a default

            // If user doesn't have a role yet, check if they should be a creator
            // This happens when signing in from /home paths
            // We'll use a different approach: check if user is accessing /home after login
            // For now, if role is "user", don't change it (customer sign-in)
            // If role is null, we need to determine based on context

            // Since we can't easily access callbackURL here, we'll use a different strategy:
            // - Users signing in from /u/* will have role="user" (set in user.create hook)
            // - Users signing in from /home will need their role updated to "creator"
            // We'll handle this in a middleware or by checking the path they access after login

            // For users with role="user", don't create creator record
            if (userRecord.role === "user") {
              return; // Customer sign-in, no creator record needed
            }

            // For users without a role or with role="creator", ensure creator record exists
            if (!userRecord.role || userRecord.role === "creator") {
              // Update user role to creator if not set
              if (!userRecord.role) {
                await db
                  .update(user)
                  .set({ role: "creator" })
                  .where(eq(user.id, userId));
              }

              // Check if creator record exists
              const existingCreator = await db.query.creator.findFirst({
                where: (c, { eq: eqOp }) => eqOp(c.id, userId),
              });

              // Create creator record if it doesn't exist
              if (!existingCreator) {
                await db.insert(creator).values({
                  id: userId,
                  displayName: userRecord?.name || "",
                  onboardingStep: 0,
                  onboardingData: {},
                });
              }
            }
          } catch (error) {
            console.error("Error ensuring creator record:", error);
          }
        },
      },
    },
    user: {
      create: {
        after: async (createdUser, context) => {
          // Determine user role based on sign-in source
          // Default to "user" for customer sign-ins, "creator" for creator sign-ins
          // We'll check the callbackURL in session hook to determine the role
          // For now, default to "user" - will be updated in session hook if needed
          try {
            // Set default role to "user" (will be updated in session hook if signing in from /home)
            await db
              .update(user)
              .set({ role: "user" })
              .where(eq(user.id, createdUser.id));
          } catch (error) {
            console.error("Error setting user role:", error);
          }
        },
      },
      update: {
        before: async (session) => {
          console.log("session update before", session, session);
        },
        after: async (session) => {
          console.log("session update after", session);
        },
      },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }
  },
});
