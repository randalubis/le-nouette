CREATE TABLE "audit_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"action" text NOT NULL,
	"ref" text
);
--> statement-breakpoint
CREATE TABLE "calendar_dates" (
	"date" date PRIMARY KEY NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movements" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"ref" text
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"unit_price" integer NOT NULL,
	"quantity" integer NOT NULL,
	"recipe" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"customer_name" text NOT NULL,
	"customer_whatsapp" text NOT NULL,
	"fulfillment" text NOT NULL,
	"address" text,
	"note" text,
	"total" integer NOT NULL,
	"promised_ready_date" date NOT NULL,
	"current_ready_date" date NOT NULL,
	"status" text NOT NULL,
	"ready_at" timestamp with time zone,
	"dispatched_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	CONSTRAINT "orders_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"amount" integer NOT NULL,
	"method" text NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"reversed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"item_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"state" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_status" (
	"id" integer PRIMARY KEY NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payments_order_id_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "reservations_order_id_idx" ON "reservations" USING btree ("order_id");
--> statement-breakpoint
alter table "orders" enable row level security;
--> statement-breakpoint
alter table "order_items" enable row level security;
--> statement-breakpoint
alter table "payments" enable row level security;
--> statement-breakpoint
alter table "movements" enable row level security;
--> statement-breakpoint
alter table "reservations" enable row level security;
--> statement-breakpoint
alter table "calendar_dates" enable row level security;
--> statement-breakpoint
alter table "store_status" enable row level security;
--> statement-breakpoint
alter table "audit_events" enable row level security;
--> statement-breakpoint
insert into "store_status" ("id", "status") values (1, 'OPEN');