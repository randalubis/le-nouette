ALTER TABLE "invoices" ADD COLUMN "paid_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "paid_method" text;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "order_payment_id" text;
--> statement-breakpoint
CREATE TABLE "invoice_counters" (
	"year" integer PRIMARY KEY NOT NULL,
	"last_seq" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoice_counters" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
INSERT INTO "invoice_counters" ("year", "last_seq")
SELECT split_part("number", '/', 2)::integer, max(split_part("number", '/', 3)::integer)
FROM "invoices" WHERE "number" ~ '^INV/[0-9]{4}/[0-9]+$' GROUP BY 1;
