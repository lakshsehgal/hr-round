import { Pool, neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { jobs } from "../src/db/schema";

async function main() {
  const url = process.env.DATABASE_URL;
  const schemaName = process.env.DB_SCHEMA ?? "hr_screening";
  if (!url) throw new Error("DATABASE_URL is not set");
  if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(schemaName)) {
    throw new Error(`Invalid DB_SCHEMA value: ${schemaName}`);
  }

  const pool = new Pool({ connectionString: url });
  await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
  await pool.end();

  const sql = neon(url);
  const db = drizzle(sql);
  const seeded = await db
    .insert(jobs)
    .values([
      {
        title: "Senior Full-Stack Engineer",
        department: "Engineering",
        location: "Remote (EU/US)",
        employmentType: "Full-time",
        description:
          "Build product features end-to-end across our Next.js + Postgres stack. Partner with design and product to ship iteratively and own quality.",
        mustHaves: [
          "5+ years shipping production web apps",
          "Strong TypeScript and React",
          "Comfort writing SQL against Postgres",
        ],
        niceToHaves: [
          "Experience with Next.js App Router",
          "Prior startup / 0-to-1 experience",
          "LLM / AI product experience",
        ],
      },
      {
        title: "AI Product Engineer",
        department: "AI",
        location: "Remote",
        employmentType: "Full-time",
        description:
          "Design and ship LLM-powered features. You will own prompt design, evaluation pipelines, and production integration with Anthropic's Claude API.",
        mustHaves: [
          "Hands-on experience integrating LLM APIs in production",
          "Strong Python or TypeScript",
          "Experience designing evaluations for AI features",
        ],
        niceToHaves: [
          "Prompt caching / tool use with Claude",
          "Familiarity with retrieval / embeddings",
        ],
      },
      {
        title: "Recruiting Operations Lead",
        department: "People",
        location: "Hybrid - London",
        employmentType: "Full-time",
        description:
          "Own the hiring funnel end-to-end. Partner with hiring managers, build structured interview loops, and improve candidate experience.",
        mustHaves: [
          "3+ years recruiting in tech orgs",
          "Experience running structured interviews",
          "Strong written communication",
        ],
        niceToHaves: [
          "Experience with ATS tools (Greenhouse/Ashby)",
          "Worked at companies scaling past 100 employees",
        ],
      },
    ])
    .onConflictDoNothing()
    .returning({ id: jobs.id, title: jobs.title });

  console.log(`Seeded ${seeded.length} jobs into schema "${schemaName}"`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
