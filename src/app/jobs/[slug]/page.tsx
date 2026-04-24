import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { jobs } from "@/db/schema";
import { VideoEditorDesignerForm } from "./video-editor-designer-form";
import { GenericApplicationForm } from "./generic-form";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [job] = await db.select().from(jobs).where(eq(jobs.slug, slug)).limit(1);
  if (!job || !job.isOpen) notFound();

  return (
    <div className="mx-auto max-w-3xl px-8 pb-28">
      <section className="pt-8">
        <Link
          href="/"
          className="text-xs uppercase tracking-widest text-muted transition-colors hover:text-fg"
        >
          ← All open roles
        </Link>
      </section>

      <section className="mt-10 animate-fade-up">
        <span className="mb-7 inline-flex items-center gap-2 rounded-full border border-accent bg-accent-dim px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[2px] text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Open position
        </span>
        <h1 className="font-display text-[clamp(36px,6vw,56px)] font-extrabold leading-[1.05] tracking-tight">
          {job.title}
          <span className="text-accent">.</span>
        </h1>
        {job.tagline && (
          <p className="mt-5 max-w-xl text-base leading-relaxed text-secondary">
            {job.tagline}
          </p>
        )}
      </section>

      <section className="mt-12 rounded-2xl border border-border bg-surface p-9">
        <p className="whitespace-pre-wrap leading-relaxed text-secondary">
          {job.description}
        </p>

        {job.mustHaves.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">
              Must-haves
            </h3>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-fg/90">
              {job.mustHaves.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {job.niceToHaves.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">
              Nice-to-haves
            </h3>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-fg/90">
              {job.niceToHaves.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mt-12">
        {job.formType === "video_editor_designer" ? (
          <VideoEditorDesignerForm jobId={job.id} />
        ) : (
          <GenericApplicationForm jobId={job.id} />
        )}
      </section>
    </div>
  );
}
