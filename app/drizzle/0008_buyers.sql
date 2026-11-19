CREATE TABLE "buyers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buyers_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE INDEX "buyers_name_prefix_idx" ON "buyers" USING btree (lower("name") text_pattern_ops);
--> statement-breakpoint
ALTER TABLE "buyers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- Backfill from existing orders and invoices. Same phone rule as toWaNumber(): strip spaces and dashes,
-- accept +62 / 62 / 0 followed by 8 and 7 to 13 digits, store as 62... The most recent row per phone wins.
-- Cancelled orders are skipped (test and abandoned orders). Postgres \s does not match every Unicode space JS \s does,
-- so a number pasted with a non-breaking space may be skipped here; it still saves through the app later.
INSERT INTO "buyers" ("name", "phone", "address", "updated_at")
SELECT DISTINCT ON (s.phone) btrim(s.name), s.phone, s.address, s.ts
FROM (
	SELECT "customer_name" AS name,
		regexp_replace(regexp_replace(regexp_replace("customer_whatsapp", '[\s-]', '', 'g'), '^\+?62', '62'), '^0', '62') AS phone,
		coalesce("address", '') AS address, "created_at" AS ts
	FROM "orders"
	WHERE "status" <> 'CANCELLED' AND regexp_replace("customer_whatsapp", '[\s-]', '', 'g') ~ '^(\+62|62|0)8\d{7,13}$'
	UNION ALL
	SELECT "buyer_name",
		regexp_replace(regexp_replace(regexp_replace("buyer_phone", '[\s-]', '', 'g'), '^\+?62', '62'), '^0', '62'),
		"buyer_address", "created_at"
	FROM "invoices"
	WHERE regexp_replace("buyer_phone", '[\s-]', '', 'g') ~ '^(\+62|62|0)8\d{7,13}$'
) s
WHERE btrim(s.name) <> ''
ORDER BY s.phone, s.ts DESC
ON CONFLICT ("phone") DO NOTHING;
