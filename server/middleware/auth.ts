// ── Auth guard for API routes ─────────────────────────────────────────────────
// All /api/* routes require an authenticated session.
// Public routes (OAuth callbacks, login page assets) are excluded.
export default defineEventHandler(async (event) => {
    const path = getRequestURL(event).pathname;

    // Only guard /api/* routes — let Nuxt pages and OAuth routes through
    if (!path.startsWith('/api/')) {
        return;
    }

    // Allow the session introspection endpoint used by useUserSession()
    if (path === '/api/_auth/session') {
        return;
    }

    const session = await getUserSession(event);

    if (!session?.user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Authentication required.',
        });
    }
});
