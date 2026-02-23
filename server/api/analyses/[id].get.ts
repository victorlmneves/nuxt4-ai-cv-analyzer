// PATCH /api/analyses/:id — update status (kanban)
import { eq, and } from 'drizzle-orm';
import { useDb } from '~~/server/db/client';
import { analyses } from '~~/server/db/schema';
import { requireAuth } from '~~/server/utils/auth';

// ── GET /api/analyses/:id ─────────────────────────────────────────────────────
export default defineEventHandler(async (event) => {
    if (event.req.method === 'PATCH') {
        const id = event.context.params.id;
        const body = await readBody(event);
        const db = useDb();

        await db.update(analyses).set({ status: body.status }).where(eq(analyses.id, id));

        return { success: true };
    }

    const sessionUser = await requireAuth(event);
    const id = getRouterParam(event, 'id');

    if (!id) {
        throw createError({ statusCode: 400, statusMessage: 'Analysis ID is required.' });
    }

    const db = useDb();

    const [row] = await db
        .select()
        .from(analyses)
        .where(and(eq(analyses.id, id), eq(analyses.userId, sessionUser.id)))
        .limit(1);

    if (!row) {
        throw createError({ statusCode: 404, statusMessage: 'Analysis not found.' });
    }

    return row;
});
