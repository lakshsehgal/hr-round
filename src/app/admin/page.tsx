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
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Admin · Jobs</h1>
        <form action="/api/admin/logout" method="post">
          <button className="text-sm text-slate-500 hover:text-slate-900">Sign out</button>
        </form>
      </header>

      <ul className="grid gap-3">
        {rows.map((job) => (
          <li key={job.id}>
            <Link
              href={`/admin/jobs/${job.id}`}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-5 transition hover:border-brand-500"
            >
              <div>
                <h2 className="font-semibold text-slate-900">{job.title}</h2>
                <p className="text-xs text-slate-500">
                  {job.department ?? "—"} · {job.isOpen ? "Open" : "Closed"}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-900">
                  {countsByJob.get(job.id) ?? 0}
                </div>
                <div className="text-xs text-slate-500">applications</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
