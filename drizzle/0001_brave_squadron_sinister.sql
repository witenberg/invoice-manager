CREATE TABLE "company_members" (
	"user_id" text NOT NULL,
	"company_id" integer NOT NULL,
	"role" text DEFAULT 'EMPLOYEE' NOT NULL,
	CONSTRAINT "company_members_user_id_company_id_pk" PRIMARY KEY("user_id","company_id")
);
--> statement-breakpoint
CREATE TABLE "ksef_credentials" (
	"company_id" integer PRIMARY KEY NOT NULL,
	"environment" text DEFAULT 'test' NOT NULL,
	"authorization_token" text,
	"session_token" text,
	"session_valid_until" timestamp,
	"last_session_reference_number" text
);
--> statement-breakpoint
ALTER TABLE "contractors" RENAME COLUMN "address" TO "address_data";--> statement-breakpoint
ALTER TABLE "companies" DROP CONSTRAINT "companies_user_id_nip_unique";--> statement-breakpoint
ALTER TABLE "companies" DROP CONSTRAINT "companies_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "nip" SET DATA TYPE varchar(10);--> statement-breakpoint
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ksef_credentials" ADD CONSTRAINT "ksef_credentials_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN "bank_account";--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN "bank_name";--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN "ksef_auth_token";--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_nip_unique" UNIQUE("nip");