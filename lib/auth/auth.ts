import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, createAuthMiddleware, organization } from "better-auth/plugins";
import { db } from "../db/client";
import { creator, user } from "../db/schema";
import { eq } from "drizzle-orm";

export const auth = betterAuth({
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
  databaseHooks: {
    session: {
      create: {
        after: async (createdSession) => {
          // Ensure creator record exists for logged-in users
          try {
            const userId = createdSession.userId;
            if (!userId) return;

            // Check if user has creator role, if not set it
            const userRecord = await db.query.user.findFirst({
              where: (u, { eq: eqOp }) => eqOp(u.id, userId),
            });

            if (userRecord && userRecord.role !== "creator") {
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
          } catch (error) {
            console.error("Error ensuring creator record:", error);
          }
        },
      },
    },
    user: {
      create: {
        after: async (createdUser) => {
          // Automatically set role to 'creator' and create creator record
          try {
            // Update user role to creator
            await db
              .update(user)
              .set({ role: "creator" })
              .where(eq(user.id, createdUser.id));

            // Check if creator record already exists
            const existingCreator = await db.query.creator.findFirst({
              where: (c, { eq: eqOp }) => eqOp(c.id, createdUser.id),
            });

            // Create creator record if it doesn't exist
            if (!existingCreator) {
              await db.insert(creator).values({
                id: createdUser.id,
                displayName: createdUser.name || "",
                onboardingStep: 0,
                onboardingData: {},
              });
            }
          } catch (error) {
            console.error("Error creating creator record:", error);
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
