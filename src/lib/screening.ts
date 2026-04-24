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
        description:
          "Specific, evidence-based strengths from the candidate's answers and portfolio.",
      },
      gaps: {
        type: "array",
        items: { type: "string" },
        description:
          "Specific gaps against the must-haves and nice-to-haves.",
      },
      rationale: {
        type: "string",
        description: "2-4 sentence summary justifying the score and recommendation.",
      },
    },
    required: ["score", "recommendation", "strengths", "gaps", "rationale"],
  },
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

function renderVideoEditorCandidate(args: {
  fullName: string;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  answers: VideoEditorAnswers;
  resumeText: string | null;
}): string {
  const { answers } = args;
  const lines: string[] = [
    `Applying for: ${answers.roleType ?? "not specified"}`,
    `City: ${answers.city ?? "not specified"}`,
    `Years of experience: ${answers.experience ?? "not specified"}`,
    `Tools: ${(answers.tools ?? []).join(", ") || "none listed"}`,
    `Portfolio / reel: ${answers.portfolio ?? "not provided"}`,
    `LinkedIn: ${args.linkedinUrl || "not provided"}`,
    "",
    "D2C experience (self-described):",
    answers.d2cExperience ?? "(empty)",
    "",
    "What makes their work stand out (self-described):",
    answers.standout ?? "(empty)",
    "",
    `WFO Delhi comfort: ${answers.wfoDelhi ?? "not specified"}`,
    `Current CTC: ${answers.currentCtc ?? "not specified"}`,
    `Expected CTC: ${answers.expectedCtc ?? "not specified"}`,
    `Notice period: ${answers.noticePeriod ?? "not specified"}`,
  ];
  if (answers.additionalInfo) {
    lines.push("", "Additional info:", answers.additionalInfo);
  }
  if (args.resumeText) {
    lines.push("", "Resume (extracted text):", args.resumeText);
  }
  return lines.join("\n");
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

    const jobSpec = [
      `Role: ${job.title}`,
      job.tagline ? `Tagline: ${job.tagline}` : null,
      `Location: ${job.location ?? "not specified"}`,
      "",
      "Role description:",
      job.description,
      "",
      "Must-haves:",
      ...job.mustHaves.map((m) => `- ${m}`),
      "",
      "Nice-to-haves:",
      ...job.niceToHaves.map((n) => `- ${n}`),
    ]
      .filter(Boolean)
      .join("\n");

    const candidateSection = renderVideoEditorCandidate({
      fullName: app.fullName,
      email: app.email,
      phone: app.phone,
      linkedinUrl: app.linkedinUrl,
      answers: (app.answers ?? {}) as VideoEditorAnswers,
      resumeText: app.resumeText,
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
            "You are an unbiased hiring screener for a creative agency that hires video editors and graphic designers for D2C performance creative work.",
            "Judge fit strictly against the role's must-haves and nice-to-haves using the candidate's self-reported answers and (when present) their resume text.",
            "Signals you should weigh: tool overlap with the role, years of experience band, portfolio link presence + specificity, quality and specificity of their D2C experience description, concreteness of what makes their work stand out, CTC alignment, notice period, and WFO Delhi compatibility.",
            "Since you cannot view the portfolio contents, do NOT assume portfolio quality — only note whether a link was provided and whether their own description of their work is specific and outcome-oriented vs. vague.",
            "Ignore name, gender, ethnicity, nationality, age, school prestige. Do not penalize career gaps.",
            "Base every strength and gap on specific evidence from the candidate's answers. Do not fabricate.",
            "Return your decision by calling the submit_screening tool. Do not write any prose outside the tool call.",
          ].join(" "),
        },
        {
          type: "text",
          text: `Job specification:\n\n${jobSpec}`,
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
