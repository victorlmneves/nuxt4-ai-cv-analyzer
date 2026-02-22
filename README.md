# CV Analyst

AI-powered CV analysis tool for technical recruiters. Paste a CV and a job description — get fit scores, tech stack breakdown, red flags, inferred soft skills, and tailored interview questions in seconds.

## Features

- **Fit scoring** — overall score (0–100) with weighted breakdown across technical, experience, and soft skills dimensions; verdict from *strong fit* to *weak fit*
- **Tech stack analysis** — extracts languages, frameworks, databases, tools, and cloud services with proficiency level, years of experience and last-used date
- **Red flags** — identifies gaps, inconsistencies, or concerns with severity rating (low / medium / high)
- **Soft skills** — infers communication, leadership, and other traits from concrete CV evidence, with confidence level
- **Interview questions** — generates 8–12 questions across technical, behavioural, situational, and cultural categories, each with a rationale and target skill
- **3 AI providers** — Claude (Haiku), GPT-4o mini, Gemini 2.5 Flash; switchable from the UI
- **File upload** — drag-and-drop or browse for `.txt`, `.pdf`, `.docx`
- **Analysis history** — persisted in `localStorage`; click any past entry to restore the full result

## Getting Started

```bash
npm install
cp .env.example .env   # add at least one API key
npm run dev
```

Open `http://localhost:3000`.

## API Keys

| Provider  | Model           | Where to get a key                          | Free tier |
|-----------|-----------------|---------------------------------------------|-----------|
| Anthropic | claude-haiku-4-5 | https://console.anthropic.com/settings/keys | ~$5 credit |
| OpenAI    | gpt-4o-mini     | https://platform.openai.com/api-keys        | ~$5 credit |
| Google    | gemini-2.5-flash | https://aistudio.google.com/apikey         | ✅ Generous daily quota, no card required |

You only need one key to use the app. Gemini is the recommended starting point.

## Project Structure

```
app/
  app.vue                          # root component
  assets/css/main.css              # design system (CSS variables, fonts, animations)
  composables/
    types.ts                       # all interfaces (I prefix) and types (T prefix)
    useAnalyser.ts                 # analysis state, history, progress, helpers
  pages/
    index.vue                      # full UI — input, loading, results
server/
  api/
    analyse.post.ts                # CV analysis — calls Claude / GPT-4o / Gemini
    extract-text.post.ts           # file text extraction — .txt, .pdf, .docx
nuxt.config.ts
.env.example
test-cv.txt                        # sample CV (Senior Full-Stack Developer)
test-job-description.txt           # sample JD (Tech Lead – Product Engineering)
```

## Test Files

Two realistic test files are included:

- `test-cv.txt` — Senior Full-Stack Developer with 7 years experience, Vue/Node/AWS background, some intentional red flags (gap in certifications, FTP deploys, delayed projects)
- `test-job-description.txt` — Tech Lead role at a fintech SaaS company; a deliberate near-match to surface nuanced scoring

## Tech Stack

- **Nuxt 4** with `compatibilityVersion: 4`
- **TypeScript** throughout
- **@anthropic-ai/sdk**, **openai**, **@google/generative-ai**
- **mammoth** (DOCX extraction), **pdf-parse** (PDF extraction)
- **DM Sans** + **Fraunces** + **DM Mono** (Google Fonts)
