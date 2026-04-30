import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { applications, jobs } from "@/db/schema";
import { isAdminAuthed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const recommendationStyles: Record<string, string> = {
  strong: "bg-success/15 text-success border-success/40",
  maybe: "bg-accent-dim text-accent border-accent/60",
  weak: "bg-surface-2 text-secondary border-border",
};

type VideoEditorAnswers = {
  city?: string;
  roleType?: string;
  experience?: string;
  tools?: string[];
  portfolio?: string;
  d2cExperience?: string;
  standout?: string;
  wfoDelhi?: string;
  currentCtc?: string;
  expectedCtc?: string;
  noticePeriod?: string;
  additionalInfo?: string | null;
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
    <div className="mx-auto max-w-4xl px-8 pb-20 pt-8">
      <div>
        <Link
          href="/admin"
          className="text-xs uppercase tracking-widest text-muted transition-colors hover:text-fg"
        >
          ← All jobs
        </Link>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">
          {job.title}
          <span className="text-accent">.</span>
        </h1>
        <p className="mt-1 text-xs uppercase tracking-widest text-muted">
          {apps.length} application{apps.length === 1 ? "" : "s"} · sorted by AI score
        </p>
      </div>

      {apps.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-surface p-12 text-center text-secondary">
          No applications yet.
        </div>
      ) : (
        <ul className="mt-10 grid gap-4">
          {apps.map((app) => {
            const answers = (app.answers ?? {}) as VideoEditorAnswers;
            const topTier =
              app.recommendation === "strong" || (app.score != null && app.score >= 80);
            return (
              <li
                key={app.id}
                className={`rounded-2xl border bg-surface p-6 ${
                  topTier
                    ? "border-accent shadow-[0_0_0_3px_rgba(232,255,71,0.1)]"
                    : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-lg font-bold tracking-tight">
                      {app.fullName}
                    </h2>
                    <p className="mt-1 text-sm text-secondary">
                      {app.email}
                      {app.phone ? ` · ${app.phone}` : ""}
                      {answers.city ? ` · ${answers.city}` : ""}
                    </p>
                    <p className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[11px] uppercase tracking-widest text-muted">
                      {answers.roleType && <span>{answers.roleType}</span>}
                      {answers.experience && <span>· {answers.experience}</span>}
                      {answers.noticePeriod && <span>· Notice: {answers.noticePeriod}</span>}
                      {answers.wfoDelhi && <span>· WFO: {answers.wfoDelhi}</span>}
                    </p>
                  </div>
                  <ScoreBadge
                    status={app.screeningStatus}
                    score={app.score}
                    recommendation={app.recommendation}
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  {answers.portfolio && (
                    <a
                      href={answers.portfolio}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-accent/60 bg-accent-dim px-3 py-1 font-medium text-accent hover:border-accent"
                    >
                      Portfolio ↗
                    </a>
                  )}
                  {app.linkedinUrl && (
                    <a
                      href={app.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-border px-3 py-1 font-medium text-secondary hover:text-fg"
                    >
                      LinkedIn ↗
                    </a>
                  )}
                  {app.resumeUrl ? (
                    <a
                      href={app.resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-border px-3 py-1 font-medium text-secondary hover:text-fg"
                    >
                      Resume PDF ↓
                    </a>
                  ) : app.resumeFileName ? (
                    <span className="rounded-full border border-border px-3 py-1 font-medium text-secondary">
                      Resume: {app.resumeFileName}
                    </span>
                  ) : null}
                  {answers.currentCtc && (
                    <span className="rounded-full border border-border px-3 py-1 text-secondary">
                      Current: {answers.currentCtc}
                    </span>
                  )}
                  {answers.expectedCtc && (
                    <span className="rounded-full border border-border px-3 py-1 text-secondary">
                      Expected: {answers.expectedCtc}
                    </span>
                  )}
                </div>

                {answers.tools && answers.tools.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {answers.tools.map((tool) => (
                      <span
                        key={tool}
                        className="rounded-md border border-border bg-surface-2 px-2 py-0.5 text-[11px] text-secondary"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                )}

                {app.screeningStatus === "complete" ? (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                        Strengths
                      </h3>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-fg/90">
                        {(app.strengths ?? []).map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                        Gaps
                      </h3>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-fg/90">
                        {(app.gaps ?? []).map((g, i) => (
                          <li key={i}>{g}</li>
                        ))}
                      </ul>
                    </div>
                    {app.rationale && (
                      <div className="sm:col-span-2">
                        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                          Rationale
                        </h3>
                        <p className="mt-2 text-sm text-fg/90">{app.rationale}</p>
                      </div>
                    )}
                  </div>
                ) : app.screeningStatus === "failed" ? (
                  <p className="mt-4 text-sm text-danger">
                    Screening failed: {app.rationale ?? "unknown error"}
                  </p>
                ) : (
                  <p className="mt-4 text-sm text-secondary">Screening in progress…</p>
                )}

                <details className="mt-4 text-sm text-secondary">
                  <summary className="cursor-pointer text-muted transition-colors hover:text-fg">
                    Candidate&apos;s full answers
                  </summary>
                  <div className="mt-3 grid gap-3 rounded-xl bg-surface-2 p-4 text-sm">
                    {answers.d2cExperience && (
                      <AnswerBlock label="D2C experience" value={answers.d2cExperience} />
                    )}
                    {answers.standout && (
                      <AnswerBlock label="What stands out" value={answers.standout} />
                    )}
                    {answers.additionalInfo && (
                      <AnswerBlock
                        label="Additional info"
                        value={answers.additionalInfo}
                      />
                    )}
                    {app.resumeText && (
                      <AnswerBlock label="Resume text" value={app.resumeText} />
                    )}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AnswerBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <h4 className="text-[11px] font-semibold uppercase tracking-widest text-muted">
        {label}
      </h4>
      <p className="mt-1 whitespace-pre-wrap text-fg/90">{value}</p>
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
      <span className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs font-medium text-secondary">
        {status === "running" ? "Screening…" : status}
      </span>
    );
  }
  const pillClass =
    recommendationStyles[recommendation ?? "weak"] ??
    "bg-surface-2 text-secondary border-border";
  return (
    <div className="flex items-center gap-3">
      <span className="font-display text-3xl font-extrabold">{score}</span>
      <span
        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-widest ${pillClass}`}
      >
        {recommendation}
      </span>
    </div>
  );
}
