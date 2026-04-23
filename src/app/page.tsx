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
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Open roles
        </h1>
        <p className="max-w-2xl text-slate-600">
          Browse our current openings and submit your application. Every submission is
          reviewed by a recruiter — AI is used only to help prioritise the queue.
        </p>
      </section>

      {openJobs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No roles are open right now. Please check back soon.
        </div>
      ) : (
        <ul className="grid gap-4">
          {openJobs.map((job) => (
            <li key={job.id}>
              <Link
                href={`/jobs/${job.id}`}
                className="group block rounded-lg border border-slate-200 bg-white p-6 transition hover:border-brand-500 hover:shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 group-hover:text-brand-600">
                      {job.title}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {[job.department, job.location, job.employmentType]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-brand-600 group-hover:underline">
                    View &amp; apply →
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                  {job.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
