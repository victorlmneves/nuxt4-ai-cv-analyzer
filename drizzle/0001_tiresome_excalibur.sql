CREATE TABLE "comparisons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_name" text NOT NULL,
	"candidate_count" integer NOT NULL,
	"provider" "provider" NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;