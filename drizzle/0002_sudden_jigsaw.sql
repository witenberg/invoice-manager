CREATE TABLE "company_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"invited_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "company_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "company_invitations" ADD CONSTRAINT "company_invitations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_invitations" ADD CONSTRAINT "company_invitations_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invitation_token_idx" ON "company_invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "company_invitations" USING btree ("email");