import { useDb } from '#server/db/client';
import { analyses, comparisons } from '#server/db/schema';
import { requireAuth } from '#server/utils/auth';
import { analyseWithAnthropic, analyseWithOpenAI, analyseWithGemini, extractRoleName, extractJson } from '#server/utils/ai';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { IAnalysisResult, IComparisonResult, IComparisonCandidate, TProvider } from '~/types';

interface ICompareInput {
    cvTexts: string[];
    jobDescription: string;
    provider: TProvider;
}

// ── Comparison synthesis prompt ───────────────────────────────────────────────
const COMPARISON_SYSTEM_PROMPT = `You are an expert technical recruiter. You have already analysed individual CVs and now need to produce a side-by-side comparison summary.

Return ONLY valid JSON — no markdown, no backticks, no preamble — matching this schema exactly:

{
  "candidates": [
    {
      "analysisId": string,
      "name": string,
      "currentRole": string | null,
      "overallScore": number,
      "technicalScore": number,
      "experienceScore": number,
      "softSkillsScore": number,
      "verdict": "strong fit" | "good fit" | "partial fit" | "weak fit",
      "redFlagCount": number,
      "topStrengths": [string] (max 3),
      "topGaps": [string] (max 3),
      "techStackHighlights": [string] (max 5 most relevant tech items),
      "integrationEase": "easy" | "moderate" | "challenging",
      "integrationRationale": string (1-2 sentences)
    }
  ],
  "winner": string (name of top recommended candidate),
  "rankedOrder": [string] (all candidate names ordered best to worst),
  "recommendation": string (3-4 sentences: who to hire first, why, and key trade-offs)
}`;

function buildComparisonPrompt(analyses: IAnalysisResult[], jobDescription: string): string {
    const summaries = analyses
        .map(
            (a, i) => `## Candidate ${i + 1}: ${a.candidate.name ?? 'Unknown'}
analysisId: candidate_${i}
Score: ${a.fitScore.overall} (tech: ${a.fitScore.technical}, exp: ${a.fitScore.experience}, soft: ${a.fitScore.softSkills})
Verdict: ${a.fitScore.verdict}
Red Flags: ${a.redFlags.length}
Strengths: ${a.strengths.slice(0, 3).join('; ')}
Gaps: ${a.gaps.slice(0, 3).join('; ')}
Tech: ${[...a.techStack.languages, ...a.techStack.frameworks]
                .map((s) => s.name)
                .slice(0, 6)
                .join(', ')}`
        )
        .join('\n\n');

    return `Compare these ${analyses.length} candidates for the following role and return the JSON comparison.

## Job Description
${jobDescription}

## Candidate Analyses
${summaries}

Return the comparison JSON exactly. No other text.`;
}

async function synthesiseComparison(
    analysisResults: IAnalysisResult[],
    jobDescription: string,
    provider: TProvider,
    config: ReturnType<typeof useRuntimeConfig>
): Promise<Omit<IComparisonResult, 'comparedAt' | 'provider' | 'roleName' | 'jobDescription'>> {
    const prompt = buildComparisonPrompt(analysisResults, jobDescription);

    let raw: string;

    if (provider === 'anthropic') {
        const client = new Anthropic({ apiKey: config.anthropicApiKey as string });
        const msg = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 2048,
            system: COMPARISON_SYSTEM_PROMPT,
            messages: [{ role: 'user', content: prompt }],
        });

        raw = msg.content
            .filter((b) => b.type === 'text')
            .map((b) => (b as { type: 'text'; text: string }).text)
            .join('');
    } else if (provider === 'openai') {
        const client = new OpenAI({ apiKey: config.openaiApiKey as string });
        const res = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 2048,
            messages: [
                { role: 'system', content: COMPARISON_SYSTEM_PROMPT },
                { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
        });

        raw = res.choices[0]?.message.content ?? '{}';
    } else {
        const genAI = new GoogleGenerativeAI(config.geminiApiKey as string);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction: COMPARISON_SYSTEM_PROMPT });
        const res = await model.generateContent(prompt);

        raw = res.response.text();
    }

    return extractJson<Omit<IComparisonResult, 'comparedAt' | 'provider' | 'roleName' | 'jobDescription'>>(raw);
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default defineEventHandler(async (event) => {
    const sessionUser = await requireAuth(event);
    const body = await readBody<ICompareInput>(event);

    if (!body.cvTexts || body.cvTexts.length < 2 || body.cvTexts.length > 3) {
        throw createError({ statusCode: 400, statusMessage: 'Please provide 2 or 3 CV texts to compare.' });
    }

    if (body.cvTexts.some((t) => !t?.trim())) {
        throw createError({ statusCode: 400, statusMessage: 'All CV texts must be non-empty.' });
    }

    if (!body.jobDescription?.trim()) {
        throw createError({ statusCode: 400, statusMessage: 'Job description is required.' });
    }

    const config = useRuntimeConfig();

    // Validate provider key
    if (body.provider === 'anthropic' && !config.anthropicApiKey) {
        throw createError({ statusCode: 400, statusMessage: 'Anthropic API key not configured.' });
    }

    if (body.provider === 'openai' && !config.openaiApiKey) {
        throw createError({ statusCode: 400, statusMessage: 'OpenAI API key not configured.' });
    }

    if (body.provider === 'gemini' && !config.geminiApiKey) {
        throw createError({ statusCode: 400, statusMessage: 'Gemini API key not configured.' });
    }

    const db = useDb();
    const roleName = extractRoleName(body.jobDescription);

    // ── Step 1: analyse each CV individually ─────────────────────────────────
    const runAnalysis = async (cvText: string): Promise<IAnalysisResult> => {
        let result: IAnalysisResult;

        if (body.provider === 'anthropic') {
            result = await analyseWithAnthropic(cvText, body.jobDescription, config.anthropicApiKey as string);
        } else if (body.provider === 'openai') {
            result = await analyseWithOpenAI(cvText, body.jobDescription, config.openaiApiKey as string);
        } else {
            result = await analyseWithGemini(cvText, body.jobDescription, config.geminiApiKey as string);
        }

        result.provider = body.provider;
        result.analysedAt = new Date().toISOString();
        result.cvText = cvText;
        result.jobDescription = body.jobDescription;

        return result;
    };

    const analysisResults = await Promise.all(body.cvTexts.map(runAnalysis));

    // Save each individual analysis to the analyses table
    const insertedAnalyses = await Promise.all(
        analysisResults.map((r) =>
            db
                .insert(analyses)
                .values({
                    userId: sessionUser.id,
                    candidateName: r.candidate.name ?? 'Unknown Candidate',
                    candidateRole: r.candidate.currentRole,
                    roleName,
                    overallScore: r.fitScore.overall,
                    technicalScore: r.fitScore.technical,
                    experienceScore: r.fitScore.experience,
                    softSkillsScore: r.fitScore.softSkills,
                    verdict: r.fitScore.verdict,
                    redFlagCount: r.redFlags.length,
                    provider: r.provider,
                    result: r,
                })
                .returning({ id: analyses.id })
        )
    );

    const analysisIds = insertedAnalyses.map((rows) => rows[0]!.id);

    // ── Step 2: synthesise the comparison ────────────────────────────────────
    const synthesis = await synthesiseComparison(analysisResults, body.jobDescription, body.provider, config);

    // Map analysisId placeholders (candidate_N) to real UUIDs
    const candidates: IComparisonCandidate[] = synthesis.candidates.map((c, i) => ({
        ...c,
        analysisId: analysisIds[i] ?? c.analysisId,
    }));

    const comparisonResult: IComparisonResult = {
        candidates,
        roleName,
        winner: synthesis.winner,
        rankedOrder: synthesis.rankedOrder,
        recommendation: synthesis.recommendation,
        provider: body.provider,
        comparedAt: new Date().toISOString(),
        jobDescription: body.jobDescription,
    };

    // ── Step 3: save comparison row ──────────────────────────────────────────
    const inserted = await db
        .insert(comparisons)
        .values({
            userId: sessionUser.id,
            roleName,
            candidateCount: body.cvTexts.length,
            provider: body.provider,
            result: comparisonResult,
        })
        .returning({ id: comparisons.id });

    if (!inserted || inserted.length === 0) {
        throw createError({ statusCode: 500, statusMessage: 'Failed to save comparison to database.' });
    }

    return {
        id: inserted[0]!.id,
        ...comparisonResult,
    };
});
