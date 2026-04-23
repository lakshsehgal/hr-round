import { defineConfig } from "drizzle-kit";

const schema = process.env.DB_SCHEMA ?? "hr_screening";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  schemaFilter: [schema],
  verbose: true,
  strict: true,
});
