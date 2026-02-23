# CV Analyst

AI-powered CV analysis tool for technical recruiting teams. Analyse candidates against job descriptions — get fit scores, tech stack breakdowns, red flags, soft skills, tailored interview questions, candidate comparison, JD generation, PDF export, and admin dashboard. Built with Nuxt 4, Supabase, Drizzle ORM and nuxt-auth-utils.

## Features

- **Fit scoring** — overall score (0–100) with weighted breakdown; verdict from *strong fit* to *weak fit*
- **Tech stack analysis** — languages, frameworks, databases, tools, cloud with level and years of experience
- **Red flags** — severity-rated concerns (low / medium / high)
- **Soft skills** — inferred from CV evidence with confidence level
- **Interview questions** — 8–12 questions across technical, behavioural, situational and cultural categories
- **Candidate comparison** — analyse 2–3 CVs side by side for the same role
- **JD Generator** — generate inclusive job descriptions from recruiter notes
- **PDF export** — download analysis as a formatted PDF
- **3 AI providers** — Claude (Haiku), GPT-4o mini, Gemini 2.5 Flash
- **File upload** — `.txt`, `.pdf`, `.docx`
- **Authentication** — Google & Microsoft OAuth via `nuxt-auth-utils`; encrypted session cookies
- **Per-recruiter history** — all analyses persisted in Supabase, scoped to the authenticated user
- **Admin dashboard** — aggregate metrics, recruiter activity, verdict and provider breakdowns

## Getting Started

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `drizzle/0000_initial.sql`
3. Copy the **Transaction pooler** connection string from Project Settings → Database

### 2. Google & Microsoft OAuth

**Google:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add `http://localhost:3000/auth/google` as an authorised redirect URI

**Microsoft:**
1. Go to [Azure Portal](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Register a new application
3. Add `http://localhost:3000/auth/microsoft` as a Web redirect URI
4. Create a Client Secret

### 3. AI Providers

You will need an API key for at least one of the supported AI providers.

| Provider  | Model           | Where to get a key                          | Free tier |
|-----------|-----------------|---------------------------------------------|-----------|
| Anthropic | claude-haiku-4-5 | https://console.anthropic.com/settings/keys | ~$5 credit |
| OpenAI    | gpt-4o-mini     | https://platform.openai.com/api-keys        | ~$5 credit |
| Google    | gemini-2.5-flash | https://aistudio.google.com/apikey         | ✅ Generous daily quota, no card required |

### 4. Environment

```bash
cp .env.example .env
# Fill in all values — see .env.example for instructions
```


### 5. Database Migrations

```bash
pnpm db:generate   # generate migration files from schema changes
pnpm db:migrate    # apply migrations to the database
pnpm db:studio     # open Drizzle Studio (visual DB browser)
```

### 6. Run

```bash
pnpm install
pnpm run dev
```

Open `http://localhost:3000`. Sign in with Google or Microsoft — the first user to sign in will be a `recruiter` by default.

### 7. Grant admin access

After your first sign-in, run this in the Supabase SQL Editor:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

Then sign out and back in. The **▤ Admin** link will appear in the header.

Open `http://localhost:3000`. Sign in with Google or Microsoft — the first user to sign in will be a `recruiter` by default.

### 6. Grant admin access

After your first sign-in, run this in the Supabase SQL Editor:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

Then sign out and back in. The **▤ Admin** link will appear in the header.

## Database



## Project Structure

drizzle/
```
app/
  app.vue
  assets/scss/main.scss
  composables/
    useAnalyser.ts         # analysis state + history
    useComparison.ts       # candidate comparison
    useJDGenerator.ts      # JD generator
    usePDFExport.ts        # PDF export
    useDateFormat.ts       # date formatting
  middleware/
    auth.global.ts         # redirect unauthenticated users to /auth/login
  pages/
    index.vue              # main analyser UI
    compare.vue            # candidate comparison UI
    jd-generator.vue       # JD generator UI
    admin/index.vue        # admin dashboard
    auth/login.vue         # OAuth sign-in page
  types/
    index.ts               # interfaces and types
server/
  db/
    schema.ts              # Drizzle schema (users, analyses, comparisons)
    client.ts              # Drizzle + postgres.js singleton
  middleware/
    auth.ts                # protect all /api/* routes
  utils/
    ai.ts                  # AI provider helpers
    auth.ts                # requireAuth / requireAdmin helpers
  routes/
    auth/
      google.get.ts        # Google OAuth callback
      microsoft.get.ts     # Microsoft OAuth callback
      logout.get.ts        # session clear + redirect
  api/
    analyse.post.ts        # CV analysis — AI + persist to DB
    compare.post.ts        # candidate comparison
    generate-jd.post.ts    # JD generator
    extract-text.post.ts   # file text extraction
    analyses/
      index.get.ts         # GET  /api/analyses        (user history)
      [id].get.ts          # GET  /api/analyses/:id    (full result)
      [id].delete.ts       # DELETE /api/analyses/:id  (soft-delete)
    comparisons/
      index.get.ts         # GET  /api/comparisons     (comparison history)
      [id].get.ts          # GET  /api/comparisons/:id (full comparison)
      [id].delete.ts       # DELETE /api/comparisons/:id (soft-delete)
    admin/
      stats.get.ts         # GET  /api/admin/stats     (admin only)

  0000_initial.sql         # reference SQL for manual Supabase setup
  0001_tiresome_excalibur.sql # migration example
  drizzle.config.ts        # Drizzle Kit config
```
## Tech Stack

- **Nuxt 4** — `compatibilityVersion: 4`, `app/` directory convention
- **nuxt-auth-utils** — Google & Microsoft OAuth, encrypted session cookies
- **Drizzle ORM** — type-safe schema + queries, PostgreSQL dialect
- **Supabase** — managed PostgreSQL, connection pooling via pgBouncer
- **@anthropic-ai/sdk**, **openai**, **@google/generative-ai** — AI providers
- **mammoth** (DOCX), **pdf-parse** (PDF) — file text extraction
- **jspdf** — PDF export
- **drizzle-kit** — migrations & DB studio
- **dotenv** — environment management
- **DM Sans** + **Fraunces** + **DM Mono** — Google Fonts

## API Endpoints

### Analysis
- `POST /api/analyse` — analyse a CV against a job description
- `GET /api/analyses` — list user analyses
- `GET /api/analyses/:id` — get full analysis result
- `DELETE /api/analyses/:id` — archive/delete analysis

### Comparison
- `POST /api/compare` — compare 2–3 CVs for a role
- `GET /api/comparisons` — list user comparisons
- `GET /api/comparisons/:id` — get full comparison result
- `DELETE /api/comparisons/:id` — archive/delete comparison

### JD Generator
- `POST /api/generate-jd` — generate job description from notes

### File Extraction
- `POST /api/extract-text` — extract text from `.txt`, `.pdf`, `.docx` file

### Admin
- `GET /api/admin/stats` — aggregate metrics (admin only)

## Supported File Formats

- `.txt`, `.pdf`, `.docx` for CV upload and extraction

## PDF Export

- Download formatted PDF of analysis results (uses jsPDF)

## Comparison

- Compare 2–3 candidates for the same role, see scores, strengths, gaps, integration ease, and AI recommendation

## JD Generator

- Generate inclusive job descriptions from recruiter notes, copy or use directly in the analyser

## Environment & Setup

- Requires Node.js >= 18 and pnpm >= 8
- Environment variables managed via `.env` (see `.env.example`)
- Uses `dotenv` for config loading

## Testing

- (To be implemented) Planned tests:
  - Unit tests for composables and utils
  - Integration tests for API routes
  - End-to-end tests for main user flows
