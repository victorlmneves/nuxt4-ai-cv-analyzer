import { useDb } from '~~/server/db/client';
import { analyses } from '~~/server/db/schema';
import { eq } from 'drizzle-orm';
// import { requireAuth } from '~~/server/utils/auth';

export default defineEventHandler(async (event) => {
    const db = useDb();
    const id = getRouterParam(event, 'id');
    const body = await readBody(event);

    if (!id) {
        console.error('[PATCH /api/analyses/[id]] missing id');

        throw createError({ statusCode: 400, statusMessage: 'Analysis ID is required.' });
    }

    if (!body.status) {
        console.error('[PATCH /api/analyses/[id]] missing status');

        throw createError({ statusCode: 400, statusMessage: 'Status is required.' });
    }

    const updated = await db
        .update(analyses)
        .set({ status: body.status })
        .where(eq(analyses.id, id))
        .returning({ id: analyses.id, status: analyses.status });

    if (!updated.length) {
        console.error('[PATCH /api/analyses/[id]] not found', { id });

        throw createError({ statusCode: 404, statusMessage: 'Analysis not found.' });
    }

    return updated[0];
});
