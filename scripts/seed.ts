import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { jobs } from "../src/db/schema";
import { ensureResumeBucket, isStorageConfigured } from "../src/lib/storage";

async function main() {
  const url = process.env.DATABASE_URL;
  const schemaName = process.env.DB_SCHEMA ?? "hr_screening";
  if (!url) throw new Error("DATABASE_URL is not set");
  if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(schemaName)) {
    throw new Error(`Invalid DB_SCHEMA value: ${schemaName}`);
  }

  const sql = postgres(url, { prepare: false, max: 1 });
  try {
    await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    console.log(`Ensured Postgres schema "${schemaName}" exists.`);

    if (isStorageConfigured()) {
      await ensureResumeBucket();
      console.log(
        `Ensured Supabase bucket "${process.env.SUPABASE_BUCKET ?? "resumes"}" exists.`,
      );
    } else {
      console.log(
        "Supabase storage env vars not set — skipping bucket creation. Resume uploads will fall back to text-only.",
      );
    }

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
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
