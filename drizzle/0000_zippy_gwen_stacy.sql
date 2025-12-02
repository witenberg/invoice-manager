CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"nip" text NOT NULL,
	"address_data" jsonb NOT NULL,
	"bank_account" text,
	"bank_name" text,
	"ksef_auth_token" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "companies_user_id_nip_unique" UNIQUE("user_id","nip")
);
--> statement-breakpoint
CREATE TABLE "contractors" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"nip" text,
	"address" text,
	"email" text,
	"is_vat_payer" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"name" text NOT NULL,
	"quantity" numeric(10, 3) NOT NULL,
	"unit" text DEFAULT 'szt' NOT NULL,
	"net_price" numeric(12, 2) NOT NULL,
	"vat_rate" text NOT NULL,
	"net_value" numeric(12, 2) NOT NULL,
	"vat_value" numeric(12, 2) NOT NULL,
	"gross_value" numeric(12, 2) NOT NULL,
	"gtu_code" text
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"contractor_id" integer,
	"buyer_name_snapshot" text NOT NULL,
	"buyer_nip_snapshot" text,
	"buyer_address_snapshot" text NOT NULL,
	"number" text NOT NULL,
	"type" text DEFAULT 'VAT' NOT NULL,
	"issue_date" timestamp NOT NULL,
	"sale_date" timestamp NOT NULL,
	"payment_deadline" timestamp,
	"payment_method" text DEFAULT 'transfer',
	"split_payment" boolean DEFAULT false,
	"currency" text DEFAULT 'PLN' NOT NULL,
	"exchange_rate" numeric(10, 4) DEFAULT '1.0000',
	"total_net" numeric(12, 2) NOT NULL,
	"total_vat" numeric(12, 2) NOT NULL,
	"total_gross" numeric(12, 2) NOT NULL,
	"ksef_status" text DEFAULT 'DRAFT' NOT NULL,
	"ksef_number" text,
	"ksef_reference_number" text,
	"ksef_session_id" text,
	"ksef_upo_raw" text,
	"ksef_errors" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "invoices_company_id_number_unique" UNIQUE("company_id","number")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"emailVerified" timestamp,
	"image" text,
	"password" text
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractors" ADD CONSTRAINT "contractors_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_invoice_issue_date" ON "invoices" USING btree ("issue_date");--> statement-breakpoint
CREATE INDEX "idx_invoice_ksef_status" ON "invoices" USING btree ("ksef_status");--> statement-breakpoint
CREATE INDEX "idx_invoice_company" ON "invoices" USING btree ("company_id");