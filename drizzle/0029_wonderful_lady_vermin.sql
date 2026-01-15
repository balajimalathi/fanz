CREATE TABLE "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_currency" varchar(3) NOT NULL,
	"to_currency" varchar(3) NOT NULL,
	"rate" numeric(10, 6) NOT NULL,
	"source" text NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_currency_preference" (
	"user_id" text PRIMARY KEY NOT NULL,
	"currency" varchar(3) NOT NULL,
	"detected_from" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creator" ADD COLUMN "preferred_currency" varchar(3) DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "creator" ADD COLUMN "payout_currency" varchar(3) DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "payment_transaction" ADD COLUMN "original_currency" varchar(3) DEFAULT 'INR';--> statement-breakpoint
ALTER TABLE "payment_transaction" ADD COLUMN "base_currency" varchar(3) DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "payment_transaction" ADD COLUMN "converted_amount" integer;--> statement-breakpoint
ALTER TABLE "payment_transaction" ADD COLUMN "exchange_rate" numeric(10, 6);--> statement-breakpoint
ALTER TABLE "payment_transaction" ADD COLUMN "processor_fee" integer;--> statement-breakpoint
ALTER TABLE "payout" ADD COLUMN "payout_currency" varchar(3) DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "payout" ADD COLUMN "converted_from_amount" integer;--> statement-breakpoint
ALTER TABLE "payout" ADD COLUMN "converted_amount" integer;--> statement-breakpoint
ALTER TABLE "payout" ADD COLUMN "exchange_rate" numeric(10, 6);--> statement-breakpoint
ALTER TABLE "payout" ADD COLUMN "payout_fee" integer;--> statement-breakpoint
ALTER TABLE "user_currency_preference" ADD CONSTRAINT "user_currency_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;