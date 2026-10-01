ALTER TABLE "orders" ADD COLUMN "public_token" text DEFAULT encode(gen_random_bytes(16), 'hex');--> statement-breakpoint
UPDATE "orders" SET "public_token" = encode(gen_random_bytes(16), 'hex') WHERE "public_token" IS NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "public_token" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_public_token_unique" UNIQUE("public_token");
