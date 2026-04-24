import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { jobs, applications } from "@/db/schema";
import { isAdminAuthed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  if (!(await isAdminAuthed())) redirect("/admin/login");

  const rows = await db
    .select({
      id: jobs.id,
      slug: jobs.slug,
      title: jobs.title,
      department: jobs.department,
      isOpen: jobs.isOpen,
      createdAt: jobs.createdAt,
    })
    .from(jobs)
    .orderBy(desc(jobs.createdAt));

  const counts = await Promise.all(
    rows.map(async (job) => {
      const result = await db
        .select({ id: applications.id })
        .from(applications)
        .where(eq(applications.jobId, job.id));
      return { jobId: job.id, count: result.length };
    }),
  );
  const countsByJob = new Map(counts.map((c) => [c.jobId, c.count]));

  return (
    <div className="mx-auto max-w-3xl px-8 pb-20 pt-8">
      <header className="mb-10 flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Admin · Jobs<span className="text-accent">.</span>
        </h1>
        <form action="/api/admin/logout" method="post">
          <button className="text-xs uppercase tracking-widest text-muted transition-colors hover:text-fg">
            Sign out
          </button>
        </form>
      </header>

      <ul className="grid gap-3">
        {rows.map((job) => (
          <li key={job.id}>
            <Link
              href={`/admin/jobs/${job.id}`}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-accent"
            >
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight">
                  {job.title}
                </h2>
                <p className="mt-1 text-xs uppercase tracking-widest text-muted">
                  {job.department ?? "—"} · {job.isOpen ? "Open" : "Closed"}
                </p>
              </div>
              <div className="text-right">
                <div className="font-display text-xl font-extrabold text-accent">
                  {countsByJob.get(job.id) ?? 0}
                </div>
                <div className="text-[11px] uppercase tracking-widest text-muted">
                  applications
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
