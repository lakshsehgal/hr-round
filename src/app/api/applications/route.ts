import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { applications, jobs } from "@/db/schema";
import { extractPdfText } from "@/lib/pdf";
import { screenApplication } from "@/lib/screening";

export const runtime = "nodejs";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

const formSchema = z.object({
  jobId: z.string().uuid(),
  fullName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  linkedinUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  yearsExperience: z.coerce.number().int().min(0).max(60),
  coverNote: z.string().trim().max(4000).optional().or(z.literal("")),
});

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const parsed = formSchema.safeParse({
    jobId: formData.get("jobId"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? undefined,
    linkedinUrl: formData.get("linkedinUrl") ?? undefined,
    yearsExperience: formData.get("yearsExperience"),
    coverNote: formData.get("coverNote") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const [job] = await db
    .select({ id: jobs.id, isOpen: jobs.isOpen })
    .from(jobs)
    .where(eq(jobs.id, parsed.data.jobId))
    .limit(1);
  if (!job || !job.isOpen) {
    return NextResponse.json({ error: "This role is no longer open" }, { status: 404 });
  }

  const resume = formData.get("resume");
  if (!(resume instanceof File) || resume.size === 0) {
    return NextResponse.json({ error: "Resume PDF is required" }, { status: 400 });
  }
  if (resume.type !== "application/pdf") {
    return NextResponse.json({ error: "Resume must be a PDF" }, { status: 400 });
  }
  if (resume.size > MAX_RESUME_BYTES) {
    return NextResponse.json({ error: "Resume must be under 5 MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await resume.arrayBuffer());
  let resumeText: string;
  try {
    resumeText = await extractPdfText(buffer);
  } catch {
    return NextResponse.json(
      { error: "We couldn&apos;t read that PDF. Try re-exporting it." },
      { status: 400 },
    );
  }
  if (resumeText.length < 50) {
    return NextResponse.json(
      { error: "The PDF appears to be empty or image-only. Please upload a text-based resume." },
      { status: 400 },
    );
  }

  const [inserted] = await db
    .insert(applications)
    .values({
      jobId: parsed.data.jobId,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      linkedinUrl: parsed.data.linkedinUrl || null,
      yearsExperience: parsed.data.yearsExperience,
      coverNote: parsed.data.coverNote || null,
      resumeFileName: resume.name,
      resumeText,
    })
    .returning({ id: applications.id });

  // Screening runs async; we don't block the applicant on the LLM call.
  void screenApplication(inserted.id);

  return NextResponse.json({ id: inserted.id }, { status: 201 });
}
