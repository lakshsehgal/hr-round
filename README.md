# HR Round — AI-assisted candidate screening

A minimal careers site that lists open roles, accepts applications with PDF
resumes, and uses Claude to score and rank candidates against each role's
rubric.

## Stack

- **Next.js 15** (App Router, Server Components, Server Actions)
- **TypeScript** + **Tailwind CSS**
- **Neon Postgres** via `@neondatabase/serverless`
- **Drizzle ORM** (schema-scoped — everything lives in its own Postgres schema)
- **Anthropic SDK** (`claude-sonnet-4-6`) with tool use + prompt caching for
  structured, low-cost screening
- **pdf-parse** for resume text extraction

## Pages

| Path                     | Who sees it | Purpose                                          |
| ------------------------ | ----------- | ------------------------------------------------ |
| `/`                      | Public      | Lists currently open roles                       |
| `/jobs/[id]`             | Public      | Job description + application form (PDF upload)  |
| `/admin/login`           | Admin       | Password-gated sign-in                           |
| `/admin`                 | Admin       | All jobs + application counts                    |
| `/admin/jobs/[id]`       | Admin       | Applicants ranked by AI score; top-tier highlighted |

## Screening flow

1. Candidate submits the application form. The server extracts text from the
   PDF, persists the row, and responds immediately.
2. An async task calls Claude with the job's must-haves/nice-to-haves (cached)
   and the candidate's resume text + cover note. Claude returns a structured
   decision through a tool call: `score`, `recommendation`, `strengths`,
   `gaps`, `rationale`.
3. The admin view loads whenever a recruiter visits and sorts by score,
   highlighting `strong` recommendations.

### Bias guardrails

- The system prompt tells the model to ignore name, demographics, age, and
  school prestige, and to ground every strength/gap in explicit resume
  evidence.
- The UI treats AI output as a **recommendation**, never a hard filter, and
  the footer says so plainly.
- The full raw model response is stored for auditing.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in real values
npm run db:seed              # creates the schema (if missing) + seeds jobs
npm run db:push              # applies Drizzle migrations
npm run dev
```

### Required env vars

| Var                     | Purpose                                             |
| ----------------------- | --------------------------------------------------- |
| `DATABASE_URL`          | Neon Postgres connection string                     |
| `DB_SCHEMA`             | Schema name to create/use (default `hr_screening`)  |
| `ANTHROPIC_API_KEY`     | Claude API key for screening                        |
| `ADMIN_PASSWORD`        | Shared password for `/admin/login`                  |
| `ADMIN_SESSION_SECRET`  | Long random string used to sign the admin cookie    |

## Project layout

```
src/
  app/                     # Next.js routes
    api/applications/      # POST form + PDF → row + async screen
    api/admin/logout/      # Clears admin cookie
    admin/                 # Gated dashboard
    jobs/[id]/             # Public job detail + application form
  db/
    client.ts              # Drizzle client (Neon HTTP)
    schema.ts              # pgSchema-scoped tables
  lib/
    admin-auth.ts          # HMAC-signed admin session cookie
    pdf.ts                 # PDF → text
    screening.ts           # Claude call + persistence
scripts/seed.ts            # Creates schema + seeds demo jobs
```

## Suggested next steps

- Swap resume text-only storage for object storage (S3/R2) and keep only the
  extracted text in the DB.
- Add per-job custom questions (JSON field + render in form).
- Move screening to a queue (QStash / Inngest) instead of fire-and-forget.
- Human-in-the-loop: allow recruiters to override the score and capture the
  correction for future eval.
