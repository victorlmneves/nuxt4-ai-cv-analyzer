import { useDb } from '#server/db/client';
import { comparisons } from '#server/db/schema';
import { requireAuth } from '#server/utils/auth';
import { eq, and, desc } from 'drizzle-orm';
import type { IComparisonHistoryEntry } from '~/types';

export default defineEventHandler(async (event) => {
    const sessionUser = await requireAuth(event);
    const db = useDb();

    const rows = await db
        .select({
            id: comparisons.id,
            roleName: comparisons.roleName,
            candidateCount: comparisons.candidateCount,
            provider: comparisons.provider,
            createdAt: comparisons.createdAt,
        })
        .from(comparisons)
        .where(and(eq(comparisons.userId, sessionUser.id), eq(comparisons.isArchived, false)))
        .orderBy(desc(comparisons.createdAt))
        .limit(50);

    return rows.map<IComparisonHistoryEntry>((r) => ({
        id: r.id,
        roleName: r.roleName,
        candidateCount: r.candidateCount,
        provider: r.provider as IComparisonHistoryEntry['provider'],
        createdAt: r.createdAt.toISOString(),
    }));
});
