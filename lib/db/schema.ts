import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
 
 
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  role: text("role"),
  banned: boolean("banned"),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});
 
export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  impersonatedBy: text("impersonated_by"),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const creatorTypeEnum = pgEnum("creator_type", ["ai", "human"]);
export const contentTypeEnum = pgEnum("content_type", ["18+", "general"]);
export const postTypeEnum = pgEnum("post_type", ["subscription", "exclusive"]);
export const mediaTypeEnum = pgEnum("media_type", ["image", "video"]);
export const messageTypeEnum = pgEnum("message_type", ["text", "audio", "image", "video"]);
export const paymentTransactionTypeEnum = pgEnum("payment_transaction_type", ["membership", "exclusive_post", "service"]);
export const paymentTransactionStatusEnum = pgEnum("payment_transaction_status", ["pending", "processing", "completed", "failed", "cancelled"]);
export const serviceTypeEnum = pgEnum("service_type", ["shoutout", "audio_call", "video_call", "chat"]);
export const serviceOrderStatusEnum = pgEnum("service_order_status", ["pending", "active", "fulfilled", "cancelled"]);
export const payoutStatusEnum = pgEnum("payout_status", ["pending", "processing", "completed", "failed"]);

export const creator = pgTable("creator", {
  id: text("id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  username: text("username").unique(),
  displayName: text("display_name").notNull(),
  country: text("country"),
  creatorType: creatorTypeEnum("creator_type"),
  contentType: contentTypeEnum("content_type"),
  gender: text("gender"),
  dateOfBirth: timestamp("date_of_birth"),
  categories: jsonb("categories").$type<string[]>(),
  onboarded: boolean("onboarded").notNull().default(false),
  usernameLocked: boolean("username_locked").notNull().default(false),
  subdomain: text("subdomain").unique(),
  onboardingStep: integer("onboarding_step").default(0),
  onboardingData: jsonb("onboarding_data").$type<Record<string, unknown>>(),
  profileImageUrl: text("profile_image_url"),
  profileCoverUrl: text("profile_cover_url"),
  bio: text("bio"),
  bankAccountDetails: jsonb("bank_account_details").$type<{
    pan?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    accountHolderName?: string;
    branchName?: string;
    accountType?: "savings" | "current";
    verified?: boolean;
  }>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const service = pgTable("service", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creator.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull().default(0), // Stored in paise (smallest currency unit)
  serviceType: serviceTypeEnum("service_type").notNull(),
  durationMinutes: integer("duration_minutes").default(30), // Default 30 minutes
  visible: boolean("visible").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const membership = pgTable("membership", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creator.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  monthlyRecurringFee: integer("monthly_recurring_fee").notNull().default(0), // Stored in paise (smallest currency unit)
  visible: boolean("visible").notNull().default(true),
  coverImageUrl: text("cover_image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const post = pgTable("post", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creator.id, { onDelete: "cascade" }),
  caption: text("caption"),
  postType: postTypeEnum("post_type").notNull(),
  price: integer("price"), // For exclusive posts, stored in paise
  isPinned: boolean("is_pinned").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const postMedia = pgTable("post_media", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .notNull()
    .references(() => post.id, { onDelete: "cascade" }),
  mediaType: mediaTypeEnum("media_type").notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  hlsUrl: text("hls_url"),
  blurThumbnailUrl: text("blur_thumbnail_url"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const postMembership = pgTable("post_membership", {
  postId: uuid("post_id")
    .notNull()
    .references(() => post.id, { onDelete: "cascade" }),
  membershipId: uuid("membership_id")
    .notNull()
    .references(() => membership.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: { primaryKey: { columns: [table.postId, table.membershipId] } },
}));

export const notification = pgTable("notification", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const follower = pgTable("follower", {
  id: uuid("id").primaryKey().defaultRandom(),
  followerId: text("follower_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creator.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueFollowerCreator: { unique: { columns: [table.followerId, table.creatorId] } },
}));

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  dodoCustomerId: varchar("dodo_customer_id", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  planId: varchar("plan_id", { length: 255 }).notNull(), // membershipId as string
  status: varchar("status", { length: 50 }).notNull().default("active"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueCustomerPlan: { unique: { columns: [table.customerId, table.planId] } },
}));

export const postLike = pgTable("post_like", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .notNull()
    .references(() => post.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniquePostUser: { unique: { columns: [table.postId, table.userId] } },
}));

export const postComment = pgTable("post_comment", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .notNull()
    .references(() => post.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  parentCommentId: uuid("parent_comment_id")
    .references(() => postComment.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const pushSubscription = pgTable("push_subscription", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const notificationPreference = pgTable("notification_preference", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })
    .unique(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const broadcastMessage = pgTable("broadcast_message", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creator.id, { onDelete: "cascade" }),
  followerIds: jsonb("follower_ids").$type<string[]>().notNull(),
  messageType: messageTypeEnum("message_type").notNull(),
  content: text("content"),
  audioUrl: text("audio_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const paymentTransaction = pgTable("payment_transaction", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creator.id, { onDelete: "cascade" }),
  type: paymentTransactionTypeEnum("type").notNull(),
  entityId: uuid("entity_id").notNull(), // membershipId, postId, or serviceId
  amount: integer("amount").notNull(), // Stored in paise
  platformFee: integer("platform_fee").notNull(), // 10% in paise
  creatorAmount: integer("creator_amount").notNull(), // 90% in paise
  status: paymentTransactionStatusEnum("status").notNull().default("pending"),
  gatewayTransactionId: text("gateway_transaction_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const postPurchase = pgTable("post_purchase", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  postId: uuid("post_id")
    .notNull()
    .references(() => post.id, { onDelete: "cascade" }),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => paymentTransaction.id, { onDelete: "cascade" }),
  purchasedAt: timestamp("purchased_at").notNull().defaultNow(),
}, (table) => ({
  uniqueUserPost: { unique: { columns: [table.userId, table.postId] } },
}));

export const serviceOrder = pgTable("service_order", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creator.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id")
    .notNull()
    .references(() => service.id, { onDelete: "cascade" }),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => paymentTransaction.id, { onDelete: "cascade" }),
  status: serviceOrderStatusEnum("status").notNull().default("pending"),
  fulfillmentNotes: text("fulfillment_notes"),
  activatedAt: timestamp("activated_at"),
  utilizedAt: timestamp("utilized_at"),
  customerJoinedAt: timestamp("customer_joined_at"),
  creatorJoinedAt: timestamp("creator_joined_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const payout = pgTable("payout", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creator.id, { onDelete: "cascade" }),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  totalAmount: integer("total_amount").notNull(), // Sum of all transactions in paise
  platformFee: integer("platform_fee").notNull(), // Total platform fee in paise
  netAmount: integer("net_amount").notNull(), // Amount to be paid to creator in paise
  status: payoutStatusEnum("status").notNull().default("pending"),
  processedAt: timestamp("processed_at"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const payoutItem = pgTable("payout_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  payoutId: uuid("payout_id")
    .notNull()
    .references(() => payout.id, { onDelete: "cascade" }),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => paymentTransaction.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(), // Creator amount for this transaction in paise
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const conversation = pgTable("conversation", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceOrderId: uuid("service_order_id")
    .notNull()
    .references(() => serviceOrder.id, { onDelete: "cascade" }),
  creatorId: text("creator_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  fanId: text("fan_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  lastMessageAt: timestamp("last_message_at"),
  unreadCountCreator: integer("unread_count_creator").notNull().default(0),
  unreadCountFan: integer("unread_count_fan").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueServiceOrder: { unique: { columns: [table.serviceOrderId] } },
}));

export const message = pgTable("message", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversation.id, { onDelete: "cascade" }),
  senderId: text("sender_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  messageType: messageTypeEnum("message_type").notNull(),
  content: text("content"),
  mediaUrl: text("media_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});