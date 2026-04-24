import {
  pgSchema,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";

const schemaName = process.env.DB_SCHEMA ?? "hr_screening";
export const appSchema = pgSchema(schemaName);

export const screeningStatus = appSchema.enum("screening_status", [
  "pending",
  "running",
  "complete",
  "failed",
]);

export const recommendation = appSchema.enum("recommendation", [
  "strong",
  "maybe",
  "weak",
]);

export const jobs = appSchema.table("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  tagline: text("tagline"),
  department: text("department"),
  location: text("location"),
  employmentType: text("employment_type"),
  formType: text("form_type").notNull().default("generic"),
  description: text("description").notNull(),
  mustHaves: jsonb("must_haves").$type<string[]>().notNull().default([]),
  niceToHaves: jsonb("nice_to_haves").$type<string[]>().notNull().default([]),
  isOpen: boolean("is_open").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const applications = appSchema.table("applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  linkedinUrl: text("linkedin_url"),
  answers: jsonb("answers").$type<Record<string, unknown>>().notNull().default({}),
  resumeFileName: text("resume_file_name"),
  resumeStoragePath: text("resume_storage_path"),
  resumeText: text("resume_text"),
  screeningStatus: screeningStatus("screening_status").notNull().default("pending"),
  score: integer("score"),
  recommendation: recommendation("recommendation"),
  strengths: jsonb("strengths").$type<string[]>(),
  gaps: jsonb("gaps").$type<string[]>(),
  rationale: text("rationale"),
  rawModelResponse: jsonb("raw_model_response"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  screenedAt: timestamp("screened_at", { withTimezone: true }),
});

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
