import { useDb } from '~~/server/db/client';
import { analyses } from '~~/server/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { requireAuth } from '~~/server/utils/auth';

// ── GET /api/analyses ─────────────────────────────────────────────────────────
// Returns the current user's analyses (scalar columns only — no full JSONB).
// The full result is loaded separately via GET /api/analyses/:id.
export default defineEventHandler(async (event) => {
    const sessionUser = await requireAuth(event);
    const db = useDb();

    const rows = await db
        .select({
            id: analyses.id,
            candidateName: analyses.candidateName,
            candidateRole: analyses.candidateRole,
            roleName: analyses.roleName,
            overallScore: analyses.overallScore,
            technicalScore: analyses.technicalScore,
            experienceScore: analyses.experienceScore,
            softSkillsScore: analyses.softSkillsScore,
            verdict: analyses.verdict,
            redFlagCount: analyses.redFlagCount,
            provider: analyses.provider,
            createdAt: analyses.createdAt,
        })
        .from(analyses)
        .where(
            and(
                eq(analyses.userId, sessionUser.id),
                eq(analyses.isArchived, false),
            ),
        )
        .orderBy(desc(analyses.createdAt))
        .limit(50);

    return rows;
});
