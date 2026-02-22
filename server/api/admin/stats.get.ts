import { useDb } from '~~/server/db/client';
import { analyses, users } from '~~/server/db/schema';
import { eq, count, avg, sql } from 'drizzle-orm';
import { requireAdmin } from '~~/server/utils/auth';

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
// Aggregate metrics for the admin dashboard.
export default defineEventHandler(async (event) => {
    await requireAdmin(event);

    const db = useDb();

    // Total analyses and average score across the whole team
    const [totals] = await db
        .select({
            totalAnalyses: count(analyses.id),
            avgScore: avg(analyses.overallScore),
        })
        .from(analyses)
        .where(eq(analyses.isArchived, false));

    // Breakdown by verdict
    const byVerdict = await db
        .select({
            verdict: analyses.verdict,
            count: count(analyses.id),
        })
        .from(analyses)
        .where(eq(analyses.isArchived, false))
        .groupBy(analyses.verdict);

    // Breakdown by provider
    const byProvider = await db
        .select({
            provider: analyses.provider,
            count: count(analyses.id),
        })
        .from(analyses)
        .where(eq(analyses.isArchived, false))
        .groupBy(analyses.provider);

    // Per-recruiter activity (join with users for name)
    const byRecruiter = await db
        .select({
            userId: users.id,
            name: users.name,
            email: users.email,
            avatarUrl: users.avatarUrl,
            analysisCount: count(analyses.id),
            avgScore: avg(analyses.overallScore),
            lastSeenAt: users.lastSeenAt,
        })
        .from(users)
        .leftJoin(analyses, eq(analyses.userId, users.id))
        .groupBy(users.id, users.name, users.email, users.avatarUrl, users.lastSeenAt)
        .orderBy(sql`count(${analyses.id}) desc`);

    // Latest 10 analyses across all users
    const recent = await db
        .select({
            id: analyses.id,
            candidateName: analyses.candidateName,
            roleName: analyses.roleName,
            overallScore: analyses.overallScore,
            verdict: analyses.verdict,
            provider: analyses.provider,
            createdAt: analyses.createdAt,
            recruiterName: users.name,
        })
        .from(analyses)
        .innerJoin(users, eq(users.id, analyses.userId))
        .where(eq(analyses.isArchived, false))
        .orderBy(sql`${analyses.createdAt} desc`)
        .limit(10);

    return {
        totals,
        byVerdict,
        byProvider,
        byRecruiter,
        recent,
    };
});
