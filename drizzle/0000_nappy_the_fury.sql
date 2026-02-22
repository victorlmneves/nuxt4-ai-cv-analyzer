CREATE TYPE "public"."provider" AS ENUM('anthropic', 'openai', 'gemini');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'recruiter');--> statement-breakpoint
CREATE TYPE "public"."verdict" AS ENUM('strong fit', 'good fit', 'partial fit', 'weak fit');--> statement-breakpoint
CREATE TABLE "analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"candidate_name" text NOT NULL,
	"candidate_role" text,
	"role_name" text NOT NULL,
	"overall_score" integer NOT NULL,
	"technical_score" integer NOT NULL,
	"experience_score" integer NOT NULL,
	"soft_skills_score" integer NOT NULL,
	"verdict" "verdict" NOT NULL,
	"red_flag_count" integer DEFAULT 0 NOT NULL,
	"provider" "provider" NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"avatar_url" text,
	"role" "role" DEFAULT 'recruiter' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;