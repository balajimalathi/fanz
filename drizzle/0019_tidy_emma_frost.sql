CREATE TYPE "public"."payment_transaction_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_transaction_type" AS ENUM('membership', 'exclusive_post', 'service');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."service_order_status" AS ENUM('pending', 'fulfilled', 'cancelled');--> statement-breakpoint
CREATE TABLE "payment_transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"creator_id" text NOT NULL,
	"type" "payment_transaction_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"platform_fee" integer NOT NULL,
	"creator_amount" integer NOT NULL,
	"status" "payment_transaction_status" DEFAULT 'pending' NOT NULL,
	"gateway_transaction_id" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" text NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"total_amount" integer NOT NULL,
	"platform_fee" integer NOT NULL,
	"net_amount" integer NOT NULL,
	"status" "payout_status" DEFAULT 'pending' NOT NULL,
	"processed_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payout_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_purchase" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"post_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"purchased_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"creator_id" text NOT NULL,
	"service_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"status" "service_order_status" DEFAULT 'pending' NOT NULL,
	"fulfillment_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"plan_id" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creator" ADD COLUMN "bank_account_details" jsonb;--> statement-breakpoint
ALTER TABLE "payment_transaction" ADD CONSTRAINT "payment_transaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transaction" ADD CONSTRAINT "payment_transaction_creator_id_creator_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout" ADD CONSTRAINT "payout_creator_id_creator_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_item" ADD CONSTRAINT "payout_item_payout_id_payout_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."payout"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_item" ADD CONSTRAINT "payout_item_transaction_id_payment_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."payment_transaction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_purchase" ADD CONSTRAINT "post_purchase_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_purchase" ADD CONSTRAINT "post_purchase_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_purchase" ADD CONSTRAINT "post_purchase_transaction_id_payment_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."payment_transaction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_purchase" ADD CONSTRAINT "post_purchase_user_id_post_id_unique" UNIQUE("user_id", "post_id");--> statement-breakpoint
ALTER TABLE "service_order" ADD CONSTRAINT "service_order_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_order" ADD CONSTRAINT "service_order_creator_id_creator_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_order" ADD CONSTRAINT "service_order_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_order" ADD CONSTRAINT "service_order_transaction_id_payment_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."payment_transaction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_id_plan_id_unique" UNIQUE("customer_id", "plan_id");