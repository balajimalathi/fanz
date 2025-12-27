ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_dodo_subscription_id_unique";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_customer_id_customers_id_fk";
--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "plan_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "status" SET DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN "dodo_subscription_id";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN "license_key";