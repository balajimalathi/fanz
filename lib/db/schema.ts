import {
  boolean,
  decimal,
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  role: text("role"),
  banned: boolean("banned"),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires", { withTimezone: true }),
});
 
export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
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
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const creatorTypeEnum = pgEnum("creator_type", ["ai", "human"]);
export const contentTypeEnum = pgEnum("content_type", ["18+", "general"]);
export const postTypeEnum = pgEnum("post_type", ["subscription", "exclusive", "free"]);
export const mediaTypeEnum = pgEnum("media_type", ["image", "video"]);
export const messageTypeEnum = pgEnum("message_type", ["text", "audio", "image", "video"]);
export const paymentTransactionTypeEnum = pgEnum("payment_transaction_type", ["membership", "exclusive_post", "service", "live_stream", "wallet_credit"]);
export const paymentTransactionStatusEnum = pgEnum("payment_transaction_status", ["pending", "processing", "completed", "failed", "cancelled"]);
export const serviceTypeEnum = pgEnum("service_type", ["shoutout", "chat", "custom_video", "custom_photo", "product_review", "endorsement", "collaboration", "personalized_message"]);
export const serviceOrderStatusEnum = pgEnum("service_order_status", ["pending", "active", "fulfilled", "cancelled"]);
export const payoutStatusEnum = pgEnum("payout_status", ["pending", "processing", "completed", "failed"]);
export const callStatusEnum = pgEnum("call_status", ["initiated", "ringing", "accepted", "rejected", "ended", "missed"]);
export const callTypeEnum = pgEnum("call_type", ["audio", "video"]);
export const liveStreamTypeEnum = pgEnum("live_stream_type", ["free", "follower_only", "paid"]);
export const liveStreamStatusEnum = pgEnum("live_stream_status", ["active", "ended"]);
export const conversationRequestStatusEnum = pgEnum("conversation_request_status", ["pending_request", "accepted", "rejected"]);

export const creator = pgTable("creator", {
  id: text("id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  username: text("username").unique(),
  displayName: text("display_name").notNull(),
  country: text("country"),
  creatorType: creatorTypeEnum("creator_type"),
  contentType: contentTypeEnum("content_type"),
  gender: text("gender"),
  dateOfBirth: timestamp("date_of_birth", { withTimezone: true }),
  categories: jsonb("categories").$type<string[]>(),
  onboarded: boolean("onboarded").notNull().default(false),
  usernameLocked: boolean("username_locked").notNull().default(false),
  subdomain: text("subdomain").unique(),
  onboardingStep: integer("onboarding_step").default(0),
  onboardingData: jsonb("onboarding_data").$type<Record<string, unknown>>(),
  profileImageUrl: text("profile_image_url"),
  profileCoverUrl: text("profile_cover_url"),
  bio: text("bio"),
  socialMediaLinks: jsonb("social_media_links").$type<{
    instagram?: string;
    twitter?: string;
    facebook?: string;
    telegram?: string;
    tiktok?: string;
    snapchat?: string;
    youtube?: string;
    linkedin?: string;
  }>(),
  currency: varchar("currency", { length: 3 }).default("INR"), // ISO 4217 currency code - creator's currency for pricing and payouts
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
  payoutSettings: jsonb("payout_settings").$type<{
    minimumThreshold?: number;
    automaticPayout?: boolean;
  }>(),
  isOnline: boolean("is_online").notNull().default(false),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  chatEnabled: boolean("chat_enabled").notNull().default(true),
  callEnabled: boolean("call_enabled").notNull().default(true),
  chatAvailabilitySchedule: jsonb("chat_availability_schedule").$type<{
    enabled: boolean;
    timezone: string; // Creator's timezone (e.g., "Asia/Kolkata", "America/New_York")
    schedule: {
      [day: string]: { // "monday", "tuesday", etc.
        enabled: boolean;
        startTime: string; // "HH:mm" format in creator's timezone
        endTime: string; // "HH:mm" format in creator's timezone
      };
    };
  }>(),
  callAvailabilitySchedule: jsonb("call_availability_schedule").$type<{
    enabled: boolean;
    timezone: string; // Creator's timezone (e.g., "Asia/Kolkata", "America/New_York")
    schedule: {
      [day: string]: { // "monday", "tuesday", etc.
        enabled: boolean;
        startTime: string; // "HH:mm" format in creator's timezone
        endTime: string; // "HH:mm" format in creator's timezone
      };
    };
  }>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
  visible: boolean("visible").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  planId: varchar("plan_id", { length: 255 }).notNull(), // membershipId as string
  price: integer("price"), // Stored in smallest currency unit (subunits), nullable for backward compatibility
  status: varchar("status", { length: 50 }).notNull().default("active"),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
    .references((): any => postComment.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notificationPreference = pgTable("notification_preference", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })
    .unique(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notificationChannelPreference = pgTable("notification_channel_preference", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(), // 'payout', 'follow', 'comment', 'message', 'security', 'platform'
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueUserChannel: { unique: { columns: [table.userId, table.channel] } },
}));

export const broadcastMessage = pgTable("broadcast_message", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creator.id, { onDelete: "cascade" }),
  followerIds: jsonb("follower_ids").$type<string[]>().notNull(),
  messageType: messageTypeEnum("message_type").notNull(),
  content: text("content"),
  audioUrl: text("audio_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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
  amount: integer("amount").notNull(), // Stored in smallest currency unit of originalCurrency
  originalCurrency: varchar("original_currency", { length: 3 }).default("INR"), // Fan's payment currency (ISO 4217)
  baseCurrency: varchar("base_currency", { length: 3 }).default("INR"), // Platform base currency (ISO 4217)
  convertedAmount: integer("converted_amount"), // Amount in base currency subunits
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 6 }), // Rate used for conversion
  processorFee: integer("processor_fee"), // Gateway forex fee if applicable
  platformFee: integer("platform_fee").notNull(), // 10% in base currency subunits
  creatorAmount: integer("creator_amount").notNull(), // 90% in base currency subunits
  status: paymentTransactionStatusEnum("status").notNull().default("pending"),
  gatewayTransactionId: text("gateway_transaction_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
  purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
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
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  utilizedAt: timestamp("utilized_at", { withTimezone: true }),
  customerJoinedAt: timestamp("customer_joined_at", { withTimezone: true }),
  creatorJoinedAt: timestamp("creator_joined_at", { withTimezone: true }),
  customerFulfilledAt: timestamp("customer_fulfilled_at", { withTimezone: true }),
  fulfillmentDeadlineHours: integer("fulfillment_deadline_hours").default(12),
  fulfillmentConfig: jsonb("fulfillment_config").$type<{
    requiresFanConfirmation?: boolean;
    requiresParticipation?: boolean;
    customFields?: Record<string, unknown>;
  }>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payout = pgTable("payout", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creator.id, { onDelete: "cascade" }),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  totalAmount: integer("total_amount").notNull(), // Sum of all transactions in base currency subunits
  platformFee: integer("platform_fee").notNull(), // Total platform fee in base currency subunits
  netAmount: integer("net_amount").notNull(), // Amount to be paid to creator in base currency subunits
  payoutCurrency: varchar("payout_currency", { length: 3 }).default("INR"), // Creator's preferred payout currency (ISO 4217)
  convertedFromAmount: integer("converted_from_amount"), // Amount in base currency before conversion
  convertedAmount: integer("converted_amount"), // Amount in payout currency subunits
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 6 }), // Rate used for payout conversion
  payoutFee: integer("payout_fee"), // Conversion/transfer fee
  status: payoutStatusEnum("status").notNull().default("pending"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const conversation = pgTable("conversation", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creator.id, { onDelete: "cascade" }),
  fanId: text("fan_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  isEnabled: boolean("is_enabled").notNull().default(true),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  lastMessagePreview: text("last_message_preview"),
  requestStatus: conversationRequestStatusEnum("request_status").notNull().default("pending_request"),
  requestedAt: timestamp("requested_at", { withTimezone: true }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueCreatorFan: { unique: { columns: [table.creatorId, table.fanId] } },
}));

export const chatMessage = pgTable("chat_message", {
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
  thumbnailUrl: text("thumbnail_url"),
  readAt: timestamp("read_at", { withTimezone: true }),
  coinsPending: integer("coins_pending"), // Coins that will be deducted when creator replies
  coinsDeducted: boolean("coins_deducted").notNull().default(false), // Whether coins have been deducted
  deductedAt: timestamp("deducted_at", { withTimezone: true }), // When coins were deducted
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const call = pgTable("call", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .references(() => conversation.id, { onDelete: "set null" }),
  callerId: text("caller_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  receiverId: text("receiver_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  callType: callTypeEnum("call_type").notNull(),
  status: callStatusEnum("status").notNull(),
  livekitRoomName: text("livekit_room_name"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  duration: integer("duration"), // Duration in seconds
  coinsReserved: integer("coins_reserved"), // Coins reserved at call start
  coinsSpent: integer("coins_spent").default(0), // Coins actually spent during call
  lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }), // Timestamp of last heartbeat
  meteringActive: boolean("metering_active").notNull().default(false), // True when both parties connected
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const liveStream = pgTable("live_stream", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creator.id, { onDelete: "cascade" }),
  livekitRoomName: text("livekit_room_name").notNull().unique(),
  streamType: liveStreamTypeEnum("stream_type").notNull(),
  price: integer("price"), // In paise, nullable (only for paid streams)
  status: liveStreamStatusEnum("status").notNull().default("active"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const liveStreamPurchase = pgTable("live_stream_purchase", {
  id: uuid("id").primaryKey().defaultRandom(),
  liveStreamId: uuid("live_stream_id")
    .notNull()
    .references(() => liveStream.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  paymentTransactionId: uuid("payment_transaction_id")
    .references(() => paymentTransaction.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueUserStream: { unique: { columns: [table.userId, table.liveStreamId] } },
}));


export const reportStatusEnum = pgEnum("report_status", ["pending", "reviewing", "resolved", "dismissed"]);
export const reportTypeEnum = pgEnum("report_type", ["user", "creator", "post", "comment", "message", "other"]);

export const report = pgTable("report", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: text("reporter_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  reportedUserId: text("reported_user_id")
    .references(() => user.id, { onDelete: "set null" }),
  reportedCreatorId: text("reported_creator_id")
    .references(() => creator.id, { onDelete: "set null" }),
  reportedPostId: uuid("reported_post_id")
    .references(() => post.id, { onDelete: "set null" }),
  reportType: reportTypeEnum("report_type").notNull(),
  reason: text("reason").notNull(),
  description: text("description"),
  status: reportStatusEnum("status").notNull().default("pending"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: text("resolved_by")
    .references(() => user.id, { onDelete: "set null" }),
  resolution: text("resolution"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const disputeStatusEnum = pgEnum("dispute_status", ["open", "investigating", "resolved", "closed"]);
export const disputeTypeEnum = pgEnum("dispute_type", ["transaction", "payout", "refund", "service", "other"]);
export const fanWalletTransactionTypeEnum = pgEnum("fan_wallet_transaction_type", ["purchase", "usage", "refund"]);

export const dispute = pgTable("dispute", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id")
    .references(() => paymentTransaction.id, { onDelete: "set null" }),
  payoutId: uuid("payout_id")
    .references(() => payout.id, { onDelete: "set null" }),
  creatorId: text("creator_id")
    .references(() => creator.id, { onDelete: "set null" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  disputeType: disputeTypeEnum("dispute_type").notNull(),
  reason: text("reason").notNull(),
  description: text("description"),
  status: disputeStatusEnum("status").notNull().default("open"),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: text("resolved_by")
    .references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fanWallet = pgTable("fan_wallet", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })
    .unique(),
  balance: integer("balance").notNull().default(0), // Current credit balance in coins
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fanWalletTransaction = pgTable("fan_wallet_transaction", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  type: fanWalletTransactionTypeEnum("type").notNull(),
  amount: integer("amount").notNull(), // Positive for purchase/refund, negative for usage
  description: text("description"),
  paymentTransactionId: uuid("payment_transaction_id")
    .references(() => paymentTransaction.id, { onDelete: "set null" }),
  coinValueUsd: decimal("coin_value_usd", { precision: 10, scale: 6 }),
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 6 }),
  creatorCurrency: varchar("creator_currency", { length: 3 }),
  linkedPurchaseTransactionId: uuid("linked_purchase_transaction_id")
    .references((): any => fanWalletTransaction.id, { onDelete: "set null" }),
  remainingCoins: integer("remaining_coins"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const coinEarnings = pgTable("coin_earnings", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creator.id, { onDelete: "cascade" }),
  fanWalletTransactionId: uuid("fan_wallet_transaction_id")
    .notNull()
    .references(() => fanWalletTransaction.id, { onDelete: "cascade" }),
  coinsUsed: integer("coins_used").notNull(),
  usdValue: integer("usd_value").notNull(), // In cents
  creatorCurrency: varchar("creator_currency", { length: 3 }).notNull(),
  creatorAmount: integer("creator_amount").notNull(), // In creator currency subunits
  platformFee: integer("platform_fee").notNull(), // In creator currency subunits
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 6 }).notNull(),
  paymentTransactionId: uuid("payment_transaction_id")
    .references(() => paymentTransaction.id, { onDelete: "set null" }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const creatorPricing = pgTable("creator_pricing", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creator.id, { onDelete: "cascade" })
    .unique(),
  dmTextPrice: integer("dm_text_price").notNull().default(0), // Coins per text message
  dmImagePrice: integer("dm_image_price").notNull().default(0), // Coins per image message
  dmVideoPrice: integer("dm_video_price").notNull().default(0), // Coins per video message
  audioCallPricePerMinute: integer("audio_call_price_per_minute").notNull().default(0), // Coins per minute for audio calls
  videoCallPricePerMinute: integer("video_call_price_per_minute").notNull().default(0), // Coins per minute for video calls
  liveStreamEntryPrice: integer("live_stream_entry_price").notNull().default(0), // Coins for one-time entry to paid streams
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});