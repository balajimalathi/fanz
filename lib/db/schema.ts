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
 

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  customerid: text("customer_id")
    .references(() => user.id)
    .notNull(),
  planId: varchar("plan_id", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  dodoSubscriptionId: varchar("dodo_subscription_id", {
    length: 255,
  }).unique(),
  licenseKey: varchar("license_key", { length: 255 }),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Study app domain schema (NotebookLM-style)
 */

export const materialTypeEnum = pgEnum("material_type", [
  "pdf",
  "youtube",
  "gdoc",
  "ppt",
  "web",
  "pyq",
]);

export const materialStatusEnum = pgEnum("material_status", [
  "uploaded",
  "processing",
  "ready",
  "failed",
]);

export const quizTypeEnum = pgEnum("quiz_type", ["generated", "pyq"]);

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

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  createdByUserid: text("created_by_user_id")
    .references(() => user.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notebooks = pgTable("notebooks", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  createdByUserid: text("created_by_user_id")
    .references(() => user.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const materials = pgTable("materials", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  notebookId: text("notebook_id").references(() => notebooks.id),
  type: materialTypeEnum("type").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  sourceUrl: text("source_url"),
  rustFsKey: varchar("rustfs_key", { length: 512 }),
  language: varchar("language", { length: 16 }),
  status: materialStatusEnum("status").notNull().default("uploaded"),
  createdByUserid: text("created_by_user_id")
    .references(() => user.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
});

export const materialChunks = pgTable("material_chunks", {
  id: text("id").primaryKey(),
  materialId: text("material_id")
    .references(() => materials.id)
    .notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  tokenCount: integer("token_count"),
  embeddingId: varchar("embedding_id", { length: 255 }), // Qdrant point ID
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  notebookId: text("notebook_id").references(() => notebooks.id),
  title: varchar("title", { length: 255 }),
  createdByUserid: text("created_by_user_id")
    .references(() => user.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey(),
  sessionid: text("session_id")
    .references(() => chatSessions.id)
    .notNull(),
  role: varchar("role", { length: 16 }).notNull(), // 'user' | 'assistant' | 'system'
  content: text("content").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mindmaps = pgTable("mindmaps", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  notebookId: text("notebook_id").references(() => notebooks.id),
  title: varchar("title", { length: 255 }).notNull(),
  createdByUserid: text("created_by_user_id")
    .references(() => user.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mindmapNodes = pgTable("mindmap_nodes", {
  id: text("id").primaryKey(),
  mindmapId: text("mindmap_id")
    .references(() => mindmaps.id)
    .notNull(),
  parentId: text("parent_id"),
  label: varchar("label", { length: 512 }).notNull(),
  depth: integer("depth").notNull().default(0),
  // Optional linkage back to material/chunk for citations
  materialId: text("material_id").references(() => materials.id),
  materialChunkId: text("material_chunk_id").references(() => materialChunks.id),
  orderIndex: integer("order_index").notNull().default(0),
});

export const quizzes = pgTable("quizzes", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  notebookId: text("notebook_id").references(() => notebooks.id),
  materialId: text("material_id").references(() => materials.id),
  title: varchar("title", { length: 255 }).notNull(),
  type: quizTypeEnum("type").notNull().default("generated"),
  createdByUserid: text("created_by_user_id")
    .references(() => user.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quizQuestions = pgTable("quiz_questions", {
  id: text("id").primaryKey(),
  quizId: text("quiz_id")
    .references(() => quizzes.id)
    .notNull(),
  questionText: text("question_text").notNull(),
  explanation: text("explanation"),
  materialId: text("material_id").references(() => materials.id),
  materialChunkId: text("material_chunk_id").references(() => materialChunks.id),
  orderIndex: integer("order_index").notNull().default(0),
});

export const quizOptions = pgTable("quiz_options", {
  id: text("id").primaryKey(),
  questionId: text("question_id")
    .references(() => quizQuestions.id)
    .notNull(),
  text: text("text").notNull(),
  isCorrect: boolean("is_correct").notNull().default(false),
  orderIndex: integer("order_index").notNull().default(0),
});

export const quizAttempts = pgTable("quiz_attempts", {
  id: text("id").primaryKey(),
  quizId: text("quiz_id")
    .references(() => quizzes.id)
    .notNull(),
  userId: text("user_id")
    .references(() => user.id)
    .notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  score: integer("score"),
  totalQuestions: integer("total_questions"),
});

export const quizAnswers = pgTable("quiz_answers", {
  id: text("id").primaryKey(),
  attemptid: text("attempt_id")
    .references(() => quizAttempts.id)
    .notNull(),
  questionId: text("question_id")
    .references(() => quizQuestions.id)
    .notNull(),
  selectedOptionid: text("selected_option_id").references(() => quizOptions.id),
  isCorrect: boolean("is_correct"),
});

export const pyqPapers = pgTable("pyq_papers", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  year: integer("year"),
  examName: varchar("exam_name", { length: 255 }),
  rustFsKey: varchar("rustfs_key", { length: 512 }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdByUserid: text("created_by_user_id")
    .references(() => user.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pyqQuestions = pgTable("pyq_questions", {
  id: text("id").primaryKey(),
  paperid: text("paper_id")
    .references(() => pyqPapers.id)
    .notNull(),
  questionText: text("question_text").notNull(),
  answerText: text("answer_text"),
  topic: varchar("topic", { length: 255 }),
  difficulty: varchar("difficulty", { length: 32 }),
  orderIndex: integer("order_index").notNull().default(0),
  // Optional linkage into general quiz infrastructure
  quizquestionId: text("quiz_question_id").references(() => quizQuestions.id),
});
