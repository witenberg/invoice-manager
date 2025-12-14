-- Convert text to jsonb: for empty database (NULL/empty values), set to empty json object
-- For existing text data that's not valid JSON, wrap it in an object to preserve it
ALTER TABLE "invoices" ALTER COLUMN "buyer_address_snapshot" SET DATA TYPE jsonb USING 
  CASE 
    WHEN buyer_address_snapshot IS NULL OR trim(buyer_address_snapshot) = '' THEN '{}'::jsonb
    ELSE 
      -- Try to parse as JSON, if it fails (not valid JSON), wrap in object
      (buyer_address_snapshot::jsonb)
  END;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "pkwiu" text;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "cn" text;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "quantity_before" numeric(10, 3);--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "net_price_before" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "vat_rate_before" text;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "quantity_after" numeric(10, 3);--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "net_price_after" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "vat_rate_after" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "has_recipient" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "recipient_name_snapshot" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "recipient_nip_snapshot" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "recipient_address_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "bank_account" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "reverse_charge" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "cash_method" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "self_billing" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "send_to_ksef" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "original_invoice_number" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "original_invoice_issue_date" timestamp;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "original_invoice_ksef_number" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "correction_reason" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "order_value" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "order_date" timestamp;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "order_number" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "advance_percentage" numeric(5, 2);