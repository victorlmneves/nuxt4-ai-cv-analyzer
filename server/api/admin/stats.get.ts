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

    // Placement rate for 'strong fit' candidates
    const [strongFitTotal] = await db
        .select({ count: count(analyses.id) })
        .from(analyses)
        .where(sql`${analyses.isArchived} = false AND ${analyses.verdict} = 'strong fit'`);

    const [strongFitPlaced] = await db
        .select({ count: count(analyses.id) })
        .from(analyses)
        .where(sql`${analyses.isArchived} = false AND ${analyses.verdict} = 'strong fit' AND ${analyses.status} = 'placed'`);

    // Placement rate by provider for 'strong fit'
    const strongFitByProvider = await db
        .select({
            provider: analyses.provider,
            total: count(analyses.id),
        })
        .from(analyses)
        .where(sql`${analyses.isArchived} = false AND ${analyses.verdict} = 'strong fit'`)
        .groupBy(analyses.provider);

    const strongFitPlacedByProvider = await db
        .select({
            provider: analyses.provider,
            placed: count(analyses.id),
        })
        .from(analyses)
        .where(sql`${analyses.isArchived} = false AND ${analyses.verdict} = 'strong fit' AND ${analyses.status} = 'placed'`)
        .groupBy(analyses.provider);

    // Merge provider breakdowns
    const placementRateByProvider = strongFitByProvider.map((row) => {
        const placedRow = strongFitPlacedByProvider.find((p) => p.provider === row.provider);

        return {
            provider: row.provider,
            total: row.total,
            placed: placedRow?.placed ?? 0,
            rate: row.total > 0 ? (placedRow?.placed ?? 0) / row.total : null,
        };
    });

    return {
        totals,
        byVerdict,
        byProvider,
        byRecruiter,
        recent,
        strongFitPlacement: {
            total: strongFitTotal?.count ?? 0,
            placed: strongFitPlaced?.count ?? 0,
            rate: (strongFitTotal?.count ?? 0) > 0 ? (strongFitPlaced?.count ?? 0) / (strongFitTotal?.count ?? 1) : null,
            byProvider: placementRateByProvider,
        },
    };
});
