import { useDb } from '#server/db/client';
import { comparisons } from '#server/db/schema';
import { requireAuth } from '#server/utils/auth';
import { eq, and } from 'drizzle-orm';
import type { IComparisonResult } from '~/types';

export default defineEventHandler(async (event) => {
    const sessionUser = await requireAuth(event);
    const id = getRouterParam(event, 'id');

    if (!id) {
        throw createError({ statusCode: 400, statusMessage: 'Comparison ID is required.' });
    }

    const db = useDb();

    const rows = await db
        .select()
        .from(comparisons)
        .where(and(eq(comparisons.id, id), eq(comparisons.userId, sessionUser.id), eq(comparisons.isArchived, false)))
        .limit(1);

    if (!rows.length) {
        throw createError({ statusCode: 404, statusMessage: 'Comparison not found.' });
    }

    const row = rows[0]!;

    return {
        id: row.id,
        result: row.result as IComparisonResult,
    };
});
