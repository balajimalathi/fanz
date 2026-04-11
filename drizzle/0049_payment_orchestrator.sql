CREATE TABLE "gateway_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gateway_name" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"credentials" jsonb NOT NULL,
	"mode" varchar(10) DEFAULT 'test' NOT NULL,
	"webhook_secret" text,
	"supported_currencies" jsonb DEFAULT '["INR"]'::jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gateway_credentials_gateway_name_unique" UNIQUE("gateway_name")
);
--> statement-breakpoint
CREATE TABLE "gateway_health" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gateway_name" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'healthy' NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"last_failure_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"circuit_open_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gateway_health_gateway_name_unique" UNIQUE("gateway_name")
);
--> statement-breakpoint
CREATE TABLE "payment_attempt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"gateway_name" varchar(50) NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"status" varchar(20) DEFAULT 'initiated' NOT NULL,
	"gateway_transaction_id" text,
	"gateway_response" jsonb,
	"error_message" text,
	"latency_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_gateway_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gateway_name" varchar(50) NOT NULL,
	"payment_type" varchar(50) NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creator" ADD COLUMN "stripe_connect_account_id" varchar(255);--> statement-breakpoint
ALTER TABLE "payment_transaction" ADD COLUMN "gateway_name" varchar(50);--> statement-breakpoint
ALTER TABLE "payment_transaction" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "payment_transaction" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_attempt" ADD CONSTRAINT "payment_attempt_transaction_id_payment_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."payment_transaction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transaction" ADD CONSTRAINT "payment_transaction_idempotency_key_unique" UNIQUE("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payment_gateway_config_gateway_payment_unique" ON "payment_gateway_config" ("gateway_name","payment_type");