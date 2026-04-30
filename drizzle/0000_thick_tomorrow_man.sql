CREATE SCHEMA "hr_screening";
--> statement-breakpoint
CREATE TYPE "hr_screening"."recommendation" AS ENUM('strong', 'maybe', 'weak');--> statement-breakpoint
CREATE TYPE "hr_screening"."screening_status" AS ENUM('pending', 'running', 'complete', 'failed');--> statement-breakpoint
CREATE TABLE "hr_screening"."applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"linkedin_url" text,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"resume_file_name" text,
	"resume_text" text,
	"screening_status" "hr_screening"."screening_status" DEFAULT 'pending' NOT NULL,
	"score" integer,
	"recommendation" "hr_screening"."recommendation",
	"strengths" jsonb,
	"gaps" jsonb,
	"rationale" text,
	"raw_model_response" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"screened_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "hr_screening"."jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"tagline" text,
	"department" text,
	"location" text,
	"employment_type" text,
	"form_type" text DEFAULT 'generic' NOT NULL,
	"description" text NOT NULL,
	"must_haves" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"nice_to_haves" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_open" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "hr_screening"."applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "hr_screening"."jobs"("id") ON DELETE cascade ON UPDATE no action;