import { useDb } from '~~/server/db/client';
import { analyses } from '~~/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '~~/server/utils/auth';

// ── DELETE /api/analyses/:id ──────────────────────────────────────────────────
// Soft-deletes by setting isArchived = true.
// Only the owning user can archive their own analyses.
export default defineEventHandler(async (event) => {
    const sessionUser = await requireAuth(event);
    const id = getRouterParam(event, 'id');

    if (!id) {
        throw createError({ statusCode: 400, statusMessage: 'Analysis ID is required.' });
    }

    const db = useDb();

    const [updated] = await db
        .update(analyses)
        .set({ isArchived: true })
        .where(and(eq(analyses.id, id), eq(analyses.userId, sessionUser.id)))
        .returning({ id: analyses.id });

    if (!updated) {
        throw createError({ statusCode: 404, statusMessage: 'Analysis not found.' });
    }

    return { success: true };
});
