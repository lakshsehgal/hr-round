import { NextResponse, after } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { applications, jobs } from "@/db/schema";
import { extractPdfText } from "@/lib/pdf";
import { screenApplication } from "@/lib/screening";
import { isBlobConfigured, uploadResumePdf } from "@/lib/blob";

export const runtime = "nodejs";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

const baseSchema = z.object({
  jobId: z.string().uuid(),
  fullName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(50),
  linkedinUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
});

const videoEditorSchema = baseSchema.extend({
  city: z.string().trim().min(1).max(100),
  roleType: z.enum([
    "Video Editor",
    "Graphic Designer",
    "Both - Video Editor & Graphic Designer",
  ]),
  experience: z.enum(["0-1 years", "1-2 years", "2-3 years", "3-5 years", "5+ years"]),
  tools: z
    .array(z.string().max(80))
    .min(1, "Please select at least one tool")
    .max(30),
  portfolio: z.string().trim().url().max(500),
  d2cExperience: z.string().trim().min(20).max(4000),
  standout: z.string().trim().min(20).max(4000),
  wfoDelhi: z.enum(["Yes", "No", "Hybrid preferred"]),
  currentCtc: z.string().trim().min(1).max(100),
  expectedCtc: z.string().trim().min(1).max(100),
  noticePeriod: z.enum(["Immediate", "15 days", "30 days", "60 days", "90 days"]),
  additionalInfo: z.string().trim().max(4000).optional().or(z.literal("")),
});

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const jobId = str(formData.get("jobId"));
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  const [job] = await db
    .select({
      id: jobs.id,
      isOpen: jobs.isOpen,
      formType: jobs.formType,
    })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);
  if (!job || !job.isOpen) {
    return NextResponse.json({ error: "This role is no longer open" }, { status: 404 });
  }

  if (job.formType !== "video_editor_designer") {
    return NextResponse.json(
      { error: "Applications for this role aren't configured yet" },
      { status: 400 },
    );
  }

  let parsedTools: string[] = [];
  try {
    parsedTools = JSON.parse(str(formData.get("tools")) || "[]");
    if (!Array.isArray(parsedTools)) parsedTools = [];
  } catch {
    return NextResponse.json({ error: "Invalid tools selection" }, { status: 400 });
  }

  const parsed = videoEditorSchema.safeParse({
    jobId,
    fullName: str(formData.get("fullName")),
    email: str(formData.get("email")),
    phone: str(formData.get("phone")),
    linkedinUrl: str(formData.get("linkedinUrl")),
    city: str(formData.get("city")),
    roleType: str(formData.get("roleType")),
    experience: str(formData.get("experience")),
    tools: parsedTools,
    portfolio: str(formData.get("portfolio")),
    d2cExperience: str(formData.get("d2cExperience")),
    standout: str(formData.get("standout")),
    wfoDelhi: str(formData.get("wfoDelhi")),
    currentCtc: str(formData.get("currentCtc")),
    expectedCtc: str(formData.get("expectedCtc")),
    noticePeriod: str(formData.get("noticePeriod")),
    additionalInfo: str(formData.get("additionalInfo")),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  let resumeFileName: string | null = null;
  let resumeText: string | null = null;
  let resumeBuffer: Buffer | null = null;

  const resume = formData.get("resume");
  if (resume instanceof File && resume.size > 0) {
    if (resume.type !== "application/pdf") {
      return NextResponse.json({ error: "Resume must be a PDF" }, { status: 400 });
    }
    if (resume.size > MAX_RESUME_BYTES) {
      return NextResponse.json({ error: "Resume must be under 5 MB" }, { status: 400 });
    }
    resumeBuffer = Buffer.from(await resume.arrayBuffer());
    try {
      resumeText = await extractPdfText(resumeBuffer);
      resumeFileName = resume.name;
    } catch {
      return NextResponse.json(
        { error: "We couldn't read that PDF. Try re-exporting it." },
        { status: 400 },
      );
    }
  }

  const answers = {
    city: parsed.data.city,
    roleType: parsed.data.roleType,
    experience: parsed.data.experience,
    tools: parsed.data.tools,
    portfolio: parsed.data.portfolio,
    d2cExperience: parsed.data.d2cExperience,
    standout: parsed.data.standout,
    wfoDelhi: parsed.data.wfoDelhi,
    currentCtc: parsed.data.currentCtc,
    expectedCtc: parsed.data.expectedCtc,
    noticePeriod: parsed.data.noticePeriod,
    additionalInfo: parsed.data.additionalInfo || null,
  };

  const [inserted] = await db
    .insert(applications)
    .values({
      jobId: parsed.data.jobId,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      linkedinUrl: parsed.data.linkedinUrl || null,
      answers,
      resumeFileName,
      resumeText,
    })
    .returning({ id: applications.id });

  if (resumeBuffer && resumeFileName && isBlobConfigured()) {
    try {
      const url = await uploadResumePdf({
        applicationId: inserted.id,
        fileName: resumeFileName,
        buffer: resumeBuffer,
      });
      await db
        .update(applications)
        .set({ resumeUrl: url })
        .where(eq(applications.id, inserted.id));
    } catch (err) {
      console.error("Resume blob upload failed", err);
    }
  }

  after(() => screenApplication(inserted.id));

  return NextResponse.json({ id: inserted.id }, { status: 201 });
}
