"use client";

export function GenericApplicationForm({ jobId: _jobId }: { jobId: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-secondary">
      The application form for this role hasn&apos;t been configured yet. Please contact
      us directly.
    </div>
  );
}
