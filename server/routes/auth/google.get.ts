import { createError, type H3Event } from 'h3';
import { useDb } from '#server/db/client';
import { users } from '#server/db/schema';

// ── Google OAuth callback ─────────────────────────────────────────────────────
// nuxt-auth-utils calls this handler after Google redirects back.
// We upsert the user in our DB and store a minimal session payload.
export default defineOAuthGoogleEventHandler({
    async onSuccess(event: H3Event, { user: googleUser }) {
        const db = useDb();

        const email = googleUser.email as string;
        const name = (googleUser.name ?? email.split('@')[0]) as string;
        const avatarUrl = (googleUser.picture ?? null) as string | null;

        // Upsert — create on first login, update name/avatar on subsequent logins
        const [dbUser] = await db
            .insert(users)
            .values({
                email,
                name,
                avatarUrl,
                lastSeenAt: new Date(),
            })
            .onConflictDoUpdate({
                target: users.email,
                set: {
                    name,
                    avatarUrl,
                    lastSeenAt: new Date(),
                },
            })
            .returning();

        if (!dbUser) {
            throw createError({ statusCode: 500, statusMessage: 'Failed to upsert user.' });
        }

        // Store only what we need in the encrypted session cookie
        await setUserSession(event, {
            user: {
                id: dbUser.id,
                email: dbUser.email,
                name: dbUser.name,
                avatarUrl: dbUser.avatarUrl,
                role: dbUser.role,
            },
        });

        return sendRedirect(event, '/');
    },

    onError(event, error) {
        console.error('[auth] Google OAuth error:', error);

        return sendRedirect(event, '/auth/login?error=oauth');
    },
});
