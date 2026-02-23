import { useDb } from '#server/db/client';
import { analyses } from '#server/db/schema';
import { requireAuth } from '#server/utils/auth';
import { analyseWithAnthropic, analyseWithOpenAI, analyseWithGemini, extractRoleName } from '#server/utils/ai';
import type { IAnalysisInput, IAnalysisResult } from '~/types';

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

    const inserted = await db
        .insert(analyses)
        .values({
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
        })
        .returning({ id: analyses.id });

    if (!inserted || inserted.length === 0) {
        throw createError({ statusCode: 500, statusMessage: 'Failed to save analysis to database.' });
    }

    return {
        id: inserted[0]!.id,
        ...analysisResult,
    };
});
