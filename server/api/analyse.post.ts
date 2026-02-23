import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useDb } from '#server/db/client';
import { analyses } from '#server/db/schema';
import { requireAuth } from '#server/utils/auth';
import type { IAnalysisInput, IAnalysisResult } from '~/types';

// ── Helpers ───────────────────────────────────────────────────────────────────
function extractRoleName(jd: string): string {
    if (!jd.trim()) {
        return 'Unknown Role';
    }

    const firstLine = jd.trim().split('\n')[0] ?? '';

    return firstLine.length > 50 ? firstLine.slice(0, 47) + '...' : firstLine;
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert technical recruiter and talent analyst with deep knowledge of software engineering roles, tech stacks, and hiring best practices.

Your task is to analyse a candidate's CV against a job description and return a structured JSON analysis.

You must respond with ONLY valid JSON — no markdown, no backticks, no preamble. The JSON must strictly follow this schema:

{
  "candidate": {
    "name": string | null,
    "currentRole": string | null,
    "totalExperience": string | null,
    "location": string | null,
    "education": string | null
  },
  "fitScore": {
    "overall": number (0-100),
    "technical": number (0-100),
    "experience": number (0-100),
    "softSkills": number (0-100),
    "verdict": "strong fit" | "good fit" | "partial fit" | "weak fit",
    "summary": string (2-3 sentences explaining the verdict)
  },
  "techStack": {
    "languages": [{ "name": string, "yearsOfExperience": number | null, "level": "beginner"|"intermediate"|"advanced"|"expert", "lastUsed": string | null }],
    "frameworks": [...same shape],
    "databases": [...same shape],
    "tools": [...same shape],
    "cloud": [...same shape],
    "other": [...same shape]
  },
  "softSkills": [
    { "name": string, "evidence": string (quote or paraphrase from CV), "confidence": "low"|"medium"|"high" }
  ],
  "redFlags": [
    { "title": string, "description": string, "severity": "low"|"medium"|"high" }
  ],
  "interviewQuestions": [
    { "question": string, "category": "technical"|"behavioural"|"situational"|"cultural", "rationale": string, "targetSkill": string }
  ],
  "strengths": [string],
  "gaps": [string]
}

Guidelines:
- fitScore.overall should be a weighted average (technical 40%, experience 35%, softSkills 25%)
- Identify 3-6 red flags minimum if present; if none, return an empty array
- Generate 8-12 interview questions covering all 4 categories
- Infer soft skills from concrete evidence in the CV (e.g. "Led a team of 8" → Leadership)
- Be honest and critical — this is for professional hiring decisions
- For techStack, only include skills actually mentioned in the CV`;

// ── User prompt ───────────────────────────────────────────────────────────────
function buildUserPrompt(cvText: string, jobDescription: string): string {
    return `Analyse this candidate's CV against the job description below.

## Job Description
${jobDescription}

## Candidate CV
${cvText}

Return the analysis as a single JSON object following the schema exactly. No other text.`;
}

// ── JSON extraction ───────────────────────────────────────────────────────────
// Strips any accidental markdown fences before parsing
function extractJson(raw: string): IAnalysisResult {
    const cleaned = raw
        .replace(/^```(?:json)?/gm, '')
        .replace(/^```$/gm, '')
        .trim();

    return JSON.parse(cleaned) as IAnalysisResult;
}

// ── Provider handlers ─────────────────────────────────────────────────────────
async function analyseWithAnthropic(
    cvText: string,
    jobDescription: string,
    apiKey: string,
): Promise<IAnalysisResult> {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
            {
                role: 'user',
                content: buildUserPrompt(cvText, jobDescription),
            },
        ],
    });

    const text = message.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('');

    return extractJson(text);
}

async function analyseWithOpenAI(
    cvText: string,
    jobDescription: string,
    apiKey: string,
): Promise<IAnalysisResult> {
    const client = new OpenAI({ apiKey });

    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 4096,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserPrompt(cvText, jobDescription) },
        ],
        response_format: { type: 'json_object' },
    });

    const text = response.choices[0]?.message.content ?? '{}';

    return extractJson(text);
}

async function analyseWithGemini(
    cvText: string,
    jobDescription: string,
    apiKey: string,
): Promise<IAnalysisResult> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: SYSTEM_PROMPT,
    });

    const response = await model.generateContent(buildUserPrompt(cvText, jobDescription));
    const text = response.response.text();

    return extractJson(text);
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default defineEventHandler(async (event) => {
    const sessionUser = await requireAuth(event);
    const body = await readBody<IAnalysisInput>(event);

    if (!body.cvText?.trim()) {
        throw createError({ statusCode: 400, statusMessage: 'CV text is required.' });
    }

    if (!body.jobDescription?.trim()) {
        throw createError({ statusCode: 400, statusMessage: 'Job description is required.' });
    }

    const config = useRuntimeConfig();

    let analysisResult: IAnalysisResult;

    switch (body.provider) {
        case 'anthropic': {
            if (!config.anthropicApiKey) {
                throw createError({ statusCode: 400, statusMessage: 'Anthropic API key not configured.' });
            }

            analysisResult = await analyseWithAnthropic(body.cvText, body.jobDescription, config.anthropicApiKey as string);
            break;
        }

        case 'openai': {
            if (!config.openaiApiKey) {
                throw createError({ statusCode: 400, statusMessage: 'OpenAI API key not configured.' });
            }

            analysisResult = await analyseWithOpenAI(body.cvText, body.jobDescription, config.openaiApiKey as string);
            break;
        }

        case 'gemini': {
            if (!config.geminiApiKey) {
                throw createError({ statusCode: 400, statusMessage: 'Gemini API key not configured.' });
            }

            analysisResult = await analyseWithGemini(body.cvText, body.jobDescription, config.geminiApiKey as string);
            break;
        }

        default:
            throw createError({ statusCode: 400, statusMessage: 'Invalid provider specified.' });
    }

    // Attach metadata not returned by the AI
    analysisResult.provider = body.provider;
    analysisResult.analysedAt = new Date().toISOString();
    analysisResult.cvText = body.cvText;
    analysisResult.jobDescription = body.jobDescription;

    const db = useDb();

    const inserted = await db.insert(analyses).values({
        userId: sessionUser.id,
        candidateName: analysisResult.candidate.name ?? 'Unknown Candidate',
        candidateRole: analysisResult.candidate.currentRole,
        roleName: extractRoleName(body.jobDescription),
        overallScore: analysisResult.fitScore.overall,
        technicalScore: analysisResult.fitScore.technical,
        experienceScore: analysisResult.fitScore.experience,
        softSkillsScore: analysisResult.fitScore.softSkills,
        verdict: analysisResult.fitScore.verdict,
        redFlagCount: analysisResult.redFlags.length,
        provider: analysisResult.provider,
        result: analysisResult,
    }).returning({ id: analyses.id });

    if (!inserted || inserted.length === 0) {
        throw createError({ statusCode: 500, statusMessage: 'Failed to save analysis to database.' });
    }

    return {
        id: inserted[0]!.id,
        ...analysisResult,
    };
});
