CREATE TABLE "company_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"instagram" text DEFAULT '' NOT NULL,
	"payment_info" text DEFAULT '' NOT NULL,
	"footer_note" text DEFAULT '' NOT NULL,
	"signature_name" text DEFAULT '' NOT NULL,
	"logo_base64" text,
	"logo_mime" text
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"order_id" text,
	"issued_at" date NOT NULL,
	"due_date" date NOT NULL,
	"buyer_name" text NOT NULL,
	"buyer_phone" text DEFAULT '' NOT NULL,
	"buyer_address" text DEFAULT '' NOT NULL,
	"lines" jsonb NOT NULL,
	"delivery_fee" integer DEFAULT 0 NOT NULL,
	"paid" integer DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"company" jsonb NOT NULL,
	"subtotal" integer NOT NULL,
	"tax" integer NOT NULL,
	"total" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE INDEX "invoices_order_id_idx" ON "invoices" USING btree ("order_id");
