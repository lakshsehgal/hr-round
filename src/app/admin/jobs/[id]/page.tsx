import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { applications, jobs } from "@/db/schema";
import { isAdminAuthed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const recommendationStyles: Record<string, string> = {
  strong: "bg-emerald-100 text-emerald-800 border-emerald-200",
  maybe: "bg-amber-100 text-amber-800 border-amber-200",
  weak: "bg-slate-100 text-slate-700 border-slate-200",
};

export default async function AdminJobApplicationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdminAuthed())) redirect("/admin/login");
  const { id } = await params;

  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!job) notFound();

  const apps = await db
    .select()
    .from(applications)
    .where(eq(applications.jobId, id))
    .orderBy(desc(applications.score), desc(applications.createdAt));

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-900">
          ← All jobs
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{job.title}</h1>
        <p className="text-sm text-slate-500">
          {apps.length} application{apps.length === 1 ? "" : "s"} · sorted by AI score
        </p>
      </div>

      {apps.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No applications yet.
        </div>
      ) : (
        <ul className="grid gap-4">
          {apps.map((app) => {
            const topTier =
              app.recommendation === "strong" || (app.score != null && app.score >= 80);
            return (
              <li
                key={app.id}
                className={`rounded-lg border bg-white p-5 ${
                  topTier
                    ? "border-emerald-300 ring-2 ring-emerald-100"
                    : "border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-slate-900">{app.fullName}</h2>
                    <p className="text-sm text-slate-500">
                      {app.email}
                      {app.phone ? ` · ${app.phone}` : ""}
                      {app.linkedinUrl ? (
                        <>
                          {" · "}
                          <a
                            href={app.linkedinUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand-600 hover:underline"
                          >
                            LinkedIn
                          </a>
                        </>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {app.yearsExperience ?? "?"} yrs · submitted{" "}
                      {new Date(app.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <ScoreBadge
                      status={app.screeningStatus}
                      score={app.score}
                      recommendation={app.recommendation}
                    />
                  </div>
                </div>

                {app.screeningStatus === "complete" ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Strengths
                      </h3>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                        {(app.strengths ?? []).map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Gaps
                      </h3>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                        {(app.gaps ?? []).map((g, i) => (
                          <li key={i}>{g}</li>
                        ))}
                      </ul>
                    </div>
                    {app.rationale && (
                      <div className="sm:col-span-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Rationale
                        </h3>
                        <p className="mt-1 text-sm text-slate-700">{app.rationale}</p>
                      </div>
                    )}
                  </div>
                ) : app.screeningStatus === "failed" ? (
                  <p className="mt-3 text-sm text-red-600">
                    Screening failed: {app.rationale ?? "unknown error"}
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">Screening in progress…</p>
                )}

                {app.coverNote && (
                  <details className="mt-3 text-sm text-slate-600">
                    <summary className="cursor-pointer text-slate-500 hover:text-slate-900">
                      Candidate&apos;s cover note
                    </summary>
                    <p className="mt-2 whitespace-pre-wrap">{app.coverNote}</p>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ScoreBadge({
  status,
  score,
  recommendation,
}: {
  status: string;
  score: number | null;
  recommendation: string | null;
}) {
  if (status !== "complete" || score == null) {
    return (
      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
        {status === "running" ? "Screening…" : status}
      </span>
    );
  }
  const pillClass =
    recommendationStyles[recommendation ?? "weak"] ??
    "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <div className="flex items-center gap-2">
      <span className="text-2xl font-semibold text-slate-900">{score}</span>
      <span
        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${pillClass}`}
      >
        {recommendation}
      </span>
    </div>
  );
}
