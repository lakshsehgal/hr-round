import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { applications, jobs } from "@/db/schema";

const MODEL = "claude-sonnet-4-6";

export type ScreeningResult = {
  score: number;
  recommendation: "strong" | "maybe" | "weak";
  strengths: string[];
  gaps: string[];
  rationale: string;
};

const screeningTool = {
  name: "submit_screening",
  description:
    "Submit a structured screening decision for the candidate based on the job requirements.",
  input_schema: {
    type: "object" as const,
    properties: {
      score: {
        type: "number",
        description: "Overall fit score 0-100.",
        minimum: 0,
        maximum: 100,
      },
      recommendation: {
        type: "string",
        enum: ["strong", "maybe", "weak"],
        description:
          "Hiring recommendation: 'strong' = advance immediately, 'maybe' = borderline, 'weak' = likely decline.",
      },
      strengths: {
        type: "array",
        items: { type: "string" },
        description: "Specific, evidence-based strengths from the resume.",
      },
      gaps: {
        type: "array",
        items: { type: "string" },
        description: "Specific gaps against the must-haves and nice-to-haves.",
      },
      rationale: {
        type: "string",
        description: "2-4 sentence summary justifying the score and recommendation.",
      },
    },
    required: ["score", "recommendation", "strengths", "gaps", "rationale"],
  },
};

function buildPrompt(args: {
  job: { title: string; description: string; mustHaves: string[]; niceToHaves: string[] };
  candidate: { yearsExperience: number | null; coverNote: string | null; resumeText: string };
}) {
  const { job, candidate } = args;
  const jobSection = [
    `Role: ${job.title}`,
    "",
    "Role description:",
    job.description,
    "",
    "Must-haves:",
    ...job.mustHaves.map((m) => `- ${m}`),
    "",
    "Nice-to-haves:",
    ...job.niceToHaves.map((n) => `- ${n}`),
  ].join("\n");

  const candidateSection = [
    `Years of relevant experience: ${candidate.yearsExperience ?? "not provided"}`,
    "",
    "Cover note:",
    candidate.coverNote?.trim() || "(none)",
    "",
    "Resume (extracted text):",
    candidate.resumeText,
  ].join("\n");

  return { jobSection, candidateSection };
}

export async function screenApplication(applicationId: string): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("ANTHROPIC_API_KEY not set — skipping screening");
    return;
  }

  await db
    .update(applications)
    .set({ screeningStatus: "running" })
    .where(eq(applications.id, applicationId));

  try {
    const [app] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);
    if (!app) throw new Error("Application not found");

    const [job] = await db.select().from(jobs).where(eq(jobs.id, app.jobId)).limit(1);
    if (!job) throw new Error("Job not found");

    const { jobSection, candidateSection } = buildPrompt({
      job: {
        title: job.title,
        description: job.description,
        mustHaves: job.mustHaves,
        niceToHaves: job.niceToHaves,
      },
      candidate: {
        yearsExperience: app.yearsExperience,
        coverNote: app.coverNote,
        resumeText: app.resumeText,
      },
    });

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      tools: [screeningTool],
      tool_choice: { type: "tool", name: screeningTool.name },
      system: [
        {
          type: "text",
          text: [
            "You are an unbiased hiring screener. Judge fit strictly from the resume, cover note, and stated experience against the role's must-haves and nice-to-haves.",
            "Ignore name, gender, ethnicity, nationality, age, or school prestige. Do not penalize for career gaps.",
            "Base every strength and gap on specific evidence from the resume or cover note — do not fabricate.",
            "Return your decision by calling the submit_screening tool. Do not write any prose outside the tool call.",
          ].join(" "),
        },
        {
          type: "text",
          text: `Job specification:\n\n${jobSection}`,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Evaluate the following candidate against the job above.\n\n${candidateSection}`,
        },
      ],
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("Model did not return a tool call");
    }
    const result = toolUse.input as ScreeningResult;

    await db
      .update(applications)
      .set({
        screeningStatus: "complete",
        score: Math.round(result.score),
        recommendation: result.recommendation,
        strengths: result.strengths,
        gaps: result.gaps,
        rationale: result.rationale,
        rawModelResponse: response as unknown as Record<string, unknown>,
        screenedAt: new Date(),
      })
      .where(eq(applications.id, applicationId));
  } catch (err) {
    console.error("Screening failed", err);
    await db
      .update(applications)
      .set({
        screeningStatus: "failed",
        rationale: err instanceof Error ? err.message : "Unknown error",
      })
      .where(eq(applications.id, applicationId));
  }
}
