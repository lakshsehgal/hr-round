import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { jobs } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const openJobs = await db
    .select()
    .from(jobs)
    .where(eq(jobs.isOpen, true))
    .orderBy(desc(jobs.createdAt));

  return (
    <div className="mx-auto max-w-3xl px-8 pb-20 pt-20">
      <section className="mb-14 animate-fade-up">
        <span className="mb-7 inline-flex items-center gap-2 rounded-full border border-accent bg-accent-dim px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[2px] text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          We&apos;re hiring
        </span>
        <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          Open roles<span className="text-accent">.</span>
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-secondary">
          Browse current openings. Every application is reviewed by a human — AI is used
          only to help us prioritise the queue.
        </p>
      </section>

      {openJobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-14 text-center text-secondary">
          No roles are open right now. Please check back soon.
        </div>
      ) : (
        <ul className="grid gap-4">
          {openJobs.map((job) => (
            <li key={job.id}>
              <Link
                href={`/jobs/${job.slug}`}
                className="group block rounded-2xl border border-border bg-surface p-8 transition-all hover:border-accent hover:shadow-[0_8px_40px_rgba(232,255,71,0.08)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-2xl font-bold tracking-tight">
                      {job.title}
                    </h2>
                    <p className="mt-2 text-xs uppercase tracking-widest text-muted">
                      {[job.department, job.location, job.employmentType]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-accent group-hover:underline">
                    View &amp; apply →
                  </span>
                </div>
                {job.tagline && (
                  <p className="mt-4 text-sm leading-relaxed text-secondary">
                    {job.tagline}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
