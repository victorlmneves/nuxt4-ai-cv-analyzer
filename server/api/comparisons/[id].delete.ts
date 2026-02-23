import { useDb } from '#server/db/client';
import { comparisons } from '#server/db/schema';
import { requireAuth } from '#server/utils/auth';
import { eq, and } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
    const sessionUser = await requireAuth(event);
    const id = getRouterParam(event, 'id');

    if (!id) {
        throw createError({ statusCode: 400, statusMessage: 'Comparison ID is required.' });
    }

    const db = useDb();

    const rows = await db
        .update(comparisons)
        .set({ isArchived: true })
        .where(and(eq(comparisons.id, id), eq(comparisons.userId, sessionUser.id)))
        .returning({ id: comparisons.id });

    if (!rows.length) {
        throw createError({ statusCode: 404, statusMessage: 'Comparison not found.' });
    }

    return { success: true };
});
