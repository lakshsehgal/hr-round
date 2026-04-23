import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { jobs } from "@/db/schema";
import { ApplicationForm } from "./application-form";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!job) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
          ← All open roles
        </Link>
      </div>

      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          {job.title}
        </h1>
        <p className="text-sm text-slate-500">
          {[job.department, job.location, job.employmentType].filter(Boolean).join(" · ")}
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          About the role
        </h2>
        <p className="mt-3 whitespace-pre-wrap text-slate-700">{job.description}</p>

        {job.mustHaves.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-900">Must-haves</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {job.mustHaves.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {job.niceToHaves.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-900">Nice-to-haves</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {job.niceToHaves.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Apply</h2>
        <p className="mt-1 text-sm text-slate-500">
          Fill out the form below. We&apos;ll review within a few business days.
        </p>
        <div className="mt-6">
          <ApplicationForm jobId={job.id} />
        </div>
      </section>
    </div>
  );
}
