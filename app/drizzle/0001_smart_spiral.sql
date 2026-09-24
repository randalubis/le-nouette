CREATE TABLE "ready_product_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"quantity_delta" integer NOT NULL,
	"movement_type" text NOT NULL,
	"packed_at" timestamp with time zone,
	"expires_on" date,
	"order_id" text,
	"source_movement_id" text,
	"note" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "ready_quantity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ready_product_movements" ADD CONSTRAINT "ready_product_movements_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ready_product_movements_order_id_idx" ON "ready_product_movements" USING btree ("order_id");
--> statement-breakpoint
alter table "ready_product_movements" enable row level security;
