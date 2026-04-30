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
  console.log(`Ensured Postgres schema "${schemaName}" exists.`);

  const sql = neon(url);
  const db = drizzle(sql);
  const seeded = await db
    .insert(jobs)
    .values([
      {
        slug: "video-editor-graphic-designer",
        title: "Video Editor & Graphic Designer",
        tagline:
          "Craft fast, engaging D2C content that stops thumbs and drives conversions.",
        department: "Creative",
        location: "Delhi (WFO / Hybrid)",
        employmentType: "Full-time",
        formType: "video_editor_designer",
        description:
          "Join Neuroid Media — a performance & creative growth agency for ambitious D2C brands. We're looking for someone who can craft fast, engaging content that stops thumbs and drives conversions. If you eat, sleep, and breathe D2C creative — this is for you.",
        mustHaves: [
          "Hands-on experience editing short-form D2C ad creatives",
          "Fluency in at least one of: Premiere Pro, After Effects, DaVinci Resolve, CapCut",
          "Strong eye for pacing, hooks, and scroll-stopping edits",
          "Fast turnaround without compromising quality",
          "Portfolio demonstrating D2C / performance creative work",
        ],
        niceToHaves: [
          "Graphic design skills across Figma / Photoshop / Illustrator",
          "Experience with UGC-style ad edits",
          "Motion graphics and typography chops",
          "Based in Delhi or open to Delhi WFO",
        ],
      },
    ])
    .onConflictDoNothing()
    .returning({ id: jobs.id, title: jobs.title });

  console.log(`Seeded ${seeded.length} jobs into schema "${schemaName}".`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
