# HR Round — AI-assisted candidate screening

A careers site that lists open roles, accepts multi-section applications, stores
resume PDFs, and uses Claude to score and rank candidates against each role's
rubric.

## Stack

- **Next.js 15** (App Router, server components, server actions)
- **TypeScript** + **Tailwind CSS** (dark Neuroid theme, Syne + DM Sans)
- **Neon Postgres** via `@neondatabase/serverless`
- **Drizzle ORM** scoped to a dedicated Postgres schema (default `hr_screening`)
- **Supabase Storage** for resume PDFs (signed URLs for admin download)
- **Anthropic SDK** (`claude-sonnet-4-6`) with tool use + prompt caching
- **pdf-parse** to extract text from uploaded resumes for the model

## Pages

| Path                      | Who sees it | Purpose                                   |
| ------------------------- | ----------- | ----------------------------------------- |
| `/`                       | Public      | Lists currently open roles                |
| `/jobs/[slug]`            | Public      | Job description + multi-section form      |
| `/admin/login`            | Admin       | Password-gated sign-in                    |
| `/admin`                  | Admin       | All jobs + application counts             |
| `/admin/jobs/[id]`        | Admin       | Candidates ranked by AI score             |
| `/api/applications`       | Public POST | Submission endpoint                       |
| `/api/admin/resume/[id]`  | Admin GET   | Redirects to a short-lived signed PDF URL |
| `/api/admin/logout`       | Admin POST  | Clears admin cookie                       |

## Screening flow

1. Candidate submits the form. The server validates fields, extracts text from
   the PDF (if provided), persists the row, uploads the PDF to Supabase, and
   returns success immediately.
2. `after()` queues the Claude screening call so it survives on serverless
   (Vercel kills the request otherwise).
3. Claude is called with the job's must-haves / nice-to-haves (prompt-cached)
   and the candidate's structured answers. It returns a tool-call with
   `score`, `recommendation`, `strengths`, `gaps`, `rationale`.
4. Admin dashboard sorts by score and highlights `strong` recommendations.

### Bias guardrails

- System prompt instructs the model to ignore name, gender, ethnicity,
  nationality, age, school prestige, and to ground every strength / gap in
  explicit evidence from the candidate's answers.
- The UI treats AI output as a **recommendation**, never a hard filter. Full
  raw responses are stored for audit.

## Deployment (Vercel + Neon + Supabase)

### 1. Provision services

- **Neon**: create a database (any region). Grab the pooled connection string.
- **Supabase**: create a project. Grab the **project URL** and the **service
  role key** (Project Settings → API). You do **not** need to create the
  bucket — the seed script does that.

### 2. Add Vercel environment variables

Paste these into the Vercel project (Settings → Environment Variables). All
are "Production + Preview + Development" unless noted.

| Key                         | Example / note                                  |
| --------------------------- | ----------------------------------------------- |
| `DATABASE_URL`              | `postgres://.../dbname?sslmode=require`         |
| `DB_SCHEMA`                 | `hr_screening`                                  |
| `ANTHROPIC_API_KEY`         | `sk-ant-...`                                    |
| `ADMIN_PASSWORD`            | Any long random string                          |
| `ADMIN_SESSION_SECRET`      | Any long random string (≥ 16 chars)             |
| `SUPABASE_URL`              | `https://YOUR-PROJECT.supabase.co`              |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — server-side only            |
| `SUPABASE_BUCKET`           | `resumes` (default if unset)                    |

### 3. Add GitHub Actions secrets

Repository Settings → Secrets and variables → Actions. Needed by the
`Apply DB schema and seed` workflow:

- `DATABASE_URL`
- `DB_SCHEMA`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET` (optional — defaults to `resumes`)

### 4. Push / deploy

- On push, the GitHub Action applies the schema (`drizzle-kit push`) and runs
  the seed (creates Supabase bucket + inserts the demo job). Safe to re-run:
  schema push is idempotent, seed uses `onConflictDoNothing`, bucket create
  is guarded.
- Vercel builds and deploys the app. First visit to `/` should show the
  Neuroid Video Editor & Graphic Designer listing.

### 5. Trigger the workflow manually (first time)

The workflow only runs on changes to schema / seed files by default. To kick
it off the first time, go to Actions → **Apply DB schema and seed** → **Run
workflow**.

## Project layout

```
src/
  app/
    api/
      applications/             # POST form → row + upload + queued screen
      admin/
        logout/                 # Clears admin cookie
        resume/[id]/            # Admin-only signed URL redirect
    admin/                      # Gated dashboard
    jobs/[slug]/                # Public job + application form
  db/
    client.ts                   # Drizzle client (Neon HTTP)
    schema.ts                   # pgSchema-scoped tables
  lib/
    admin-auth.ts               # HMAC-signed admin session cookie
    pdf.ts                      # PDF → text
    screening.ts                # Claude call + persistence
    storage.ts                  # Supabase Storage (upload + signed URL)
drizzle/                        # Committed SQL migrations (generated)
scripts/seed.ts                 # Schema + bucket + demo job
.github/workflows/
  migrate-and-seed.yml          # CI job that provisions everything
```

## Adding a new job type

1. Append a row in `scripts/seed.ts` (or insert via SQL) with a new
   `formType` value.
2. Create a form component under `src/app/jobs/[slug]/` (reuse the Neuroid
   components as a template).
3. In `src/app/jobs/[slug]/page.tsx`, add a branch that renders it based on
   `job.formType`.
4. In `src/app/api/applications/route.ts`, add a validation schema for that
   form and a branch that persists its answers.
5. Extend `src/lib/screening.ts` if the new form needs a different prompt
   shape.

## Known tradeoffs

- **Portfolio content isn't fetched.** The model only sees that a link was
  provided and weighs the specificity of the candidate's own description. If
  you want it to actually watch the reel, that's a bigger task (transcription
  + vision).
- **Single-page form** (matches the Neuroid reference HTML). True
  one-question-per-screen Typeform UX is a separate pass.
- **Resume PDFs in Supabase only.** If you'd rather consolidate on one vendor
  later, swap `src/lib/storage.ts` for R2 / S3 — it's the only caller.
