# HR Round — AI-assisted candidate screening

A careers site that lists open roles, accepts multi-section applications, and
uses Claude to score and rank candidates against each role's rubric.

## Stack

- **Next.js 15** (App Router, server components, server actions)
- **TypeScript** + **Tailwind CSS** (dark Neuroid theme, Syne + DM Sans)
- **Neon Postgres** via `@neondatabase/serverless` (HTTP driver)
- **Drizzle ORM**, scoped to a dedicated Postgres schema (default
  `hr_screening`) so this app's tables can never collide with other projects
  sharing the same Neon database.
- **Anthropic SDK** (`claude-sonnet-4-6`) with tool use + prompt caching
- **pdf-parse** to extract text from uploaded resumes for the model

## Pages

| Path                   | Who sees it | Purpose                                   |
| ---------------------- | ----------- | ----------------------------------------- |
| `/`                    | Public      | Lists currently open roles                |
| `/jobs/[slug]`         | Public      | Job description + multi-section form      |
| `/admin/login`         | Admin       | Password-gated sign-in                    |
| `/admin`               | Admin       | All jobs + application counts             |
| `/admin/jobs/[id]`     | Admin       | Candidates ranked by AI score             |
| `/api/applications`    | Public POST | Submission endpoint                       |
| `/api/admin/logout`    | Admin POST  | Clears admin cookie                       |

## Screening flow

1. Candidate submits the form. The server validates fields, extracts text from
   the PDF (if provided), persists the row, and returns success immediately.
2. `after()` queues the Claude screening call so it survives on serverless
   (Vercel terminates the request otherwise).
3. Claude is called with the job's must-haves / nice-to-haves (prompt-cached)
   and the candidate's structured answers. It returns a tool-call with
   `score`, `recommendation`, `strengths`, `gaps`, `rationale`.
4. Admin dashboard sorts by score and highlights `strong` recommendations.

### Bias guardrails

- System prompt instructs the model to ignore name, gender, ethnicity,
  nationality, age, school prestige, and to ground every strength / gap in
  explicit evidence from the candidate's answers.
- AI output is treated as a **recommendation**, never a hard filter. Full
  raw responses are stored for audit.

## Deployment (Vercel + Neon)

### 1. Provision Neon

- Create a Neon project (or reuse an existing one).
- Grab the **pooled** connection string from the Neon console.
- If other apps share this Neon database, set `DB_SCHEMA` to a unique name —
  this app's tables will live entirely inside that schema.

### 2. Vercel environment variables

Paste these into the Vercel project (Settings → Environment Variables) for
Production + Preview + Development.

| Key                    | Notes                                            |
| ---------------------- | ------------------------------------------------ |
| `DATABASE_URL`         | Neon pooled connection string                    |
| `DB_SCHEMA`            | `hr_screening` (or any unique identifier)        |
| `ANTHROPIC_API_KEY`    | `sk-ant-...`                                     |
| `ADMIN_PASSWORD`       | Any long random string                           |
| `ADMIN_SESSION_SECRET` | Any long random string (≥ 16 chars)              |

### 3. GitHub Actions secrets

Repository → Settings → Secrets and variables → Actions:

- `DATABASE_URL`
- `DB_SCHEMA`

### 4. First-time bootstrap

Run the workflow manually once: Actions → **Apply DB schema and seed** →
**Run workflow** on your branch. It applies the Drizzle schema and inserts
the demo Video Editor & Graphic Designer job. After this, every push that
touches `src/db/schema.ts` or `scripts/seed.ts` will re-run it (idempotent).

### 5. Deploy

Vercel will pick up the branch automatically. First visit to `/` should
show the Neuroid Video Editor & Graphic Designer listing.

## Project layout

```
src/
  app/
    api/
      applications/             # POST form → row + queued screen
      admin/logout/             # Clears admin cookie
    admin/                      # Gated dashboard
    jobs/[slug]/                # Public job + application form
  db/
    client.ts                   # Drizzle client (Neon HTTP, lazy)
    schema.ts                   # pgSchema-scoped tables
  lib/
    admin-auth.ts               # HMAC-signed admin session cookie
    pdf.ts                      # PDF → text
    screening.ts                # Claude call + persistence
drizzle/                        # Committed SQL migrations (generated)
scripts/seed.ts                 # Schema + demo job
.github/workflows/
  migrate-and-seed.yml          # CI job that provisions Neon
```

## Adding a new job type

1. Append a row in `scripts/seed.ts` (or insert via SQL) with a new
   `formType` value.
2. Create a form component under `src/app/jobs/[slug]/` (reuse the Neuroid
   components as a template).
3. Branch on `job.formType` in `src/app/jobs/[slug]/page.tsx`.
4. Add a Zod schema + branch in `src/app/api/applications/route.ts` for
   validation + persistence of the new form's answers.
5. Extend `src/lib/screening.ts` if the new form needs a different prompt
   shape.

## Known tradeoffs

- **Resume binaries are not stored.** We extract text via `pdf-parse` for the
  AI screen and store only the extracted text + filename. If you want
  recruiters to download the original PDF, add Vercel Blob (one env var, ~5
  minutes of work).
- **Portfolio content isn't fetched.** The model only sees that a link was
  provided and weighs the specificity of the candidate's own description. To
  evaluate the reel itself, transcription + vision is a bigger lift.
- **Single-page form** (matches the Neuroid reference HTML). True
  one-question-per-screen Typeform UX is a separate pass.
