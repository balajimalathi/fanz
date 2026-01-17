ALTER TYPE "public"."payment_transaction_type" ADD VALUE 'exclusive_post' BEFORE 'service';--> statement-breakpoint
ALTER TYPE "public"."payment_transaction_type" ADD VALUE 'live_stream';--> statement-breakpoint
ALTER TYPE "public"."payment_transaction_type" ADD VALUE 'wallet_credit';