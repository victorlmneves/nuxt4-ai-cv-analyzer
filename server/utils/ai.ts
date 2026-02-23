import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { IAnalysisResult } from '~/types';

// ── Helpers ───────────────────────────────────────────────────────────────────
export function extractRoleName(jd: string): string {
    if (!jd.trim()) {
        return 'Unknown Role';
    }

    const firstLine = jd.trim().split('\n')[0] ?? '';

    return firstLine.length > 50 ? firstLine.slice(0, 47) + '...' : firstLine;
}

// ── JSON extraction ───────────────────────────────────────────────────────────
export function extractJson<T = unknown>(raw: string): T {
    const cleaned = raw
        .replace(/^```(?:json)?/gm, '')
        .replace(/^```$/gm, '')
        .trim();

    return JSON.parse(cleaned) as T;
}

// ── System prompt ─────────────────────────────────────────────────────────────
export const ANALYSIS_SYSTEM_PROMPT = `You are an expert technical recruiter and talent analyst with deep knowledge of software engineering roles, tech stacks, and hiring best practices.

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

export function buildAnalysisUserPrompt(cvText: string, jobDescription: string): string {
    return `Analyse this candidate's CV against the job description below.

## Job Description
${jobDescription}

## Candidate CV
${cvText}

Return the analysis as a single JSON object following the schema exactly. No other text.`;
}

// ── Provider handlers ─────────────────────────────────────────────────────────
export async function analyseWithAnthropic(cvText: string, jobDescription: string, apiKey: string): Promise<IAnalysisResult> {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: ANALYSIS_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildAnalysisUserPrompt(cvText, jobDescription) }],
    });

    const text = message.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('');

    return extractJson<IAnalysisResult>(text);
}

export async function analyseWithOpenAI(cvText: string, jobDescription: string, apiKey: string): Promise<IAnalysisResult> {
    const client = new OpenAI({ apiKey });

    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 4096,
        messages: [
            { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
            { role: 'user', content: buildAnalysisUserPrompt(cvText, jobDescription) },
        ],
        response_format: { type: 'json_object' },
    });

    const text = response.choices[0]?.message.content ?? '{}';

    return extractJson<IAnalysisResult>(text);
}

export async function analyseWithGemini(cvText: string, jobDescription: string, apiKey: string): Promise<IAnalysisResult> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: ANALYSIS_SYSTEM_PROMPT,
    });

    const response = await model.generateContent(buildAnalysisUserPrompt(cvText, jobDescription));
    const text = response.response.text();

    return extractJson<IAnalysisResult>(text);
}
