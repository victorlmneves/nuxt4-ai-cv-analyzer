import { useDb } from '~~/server/db/client';
import { users } from '~~/server/db/schema';

// ── Microsoft OAuth callback ───────────────────────────────────────────────────
// nuxt-auth-utils calls this handler after Microsoft redirects back.
// The Microsoft user object exposes: mail, displayName, userPrincipalName, id.
export default defineOAuthMicrosoftEventHandler({
    async onSuccess(event, { user: msUser }) {
        const db = useDb();

        // Microsoft uses `mail` for personal accounts and `userPrincipalName`
        // (which is always an email) as the fallback for Azure AD accounts.
        const email = (msUser.mail ?? msUser.userPrincipalName) as string;
        const name = (msUser.displayName ?? email.split('@')[0]) as string;

        // Microsoft does not expose an avatar URL in the basic profile scope —
        // fetching it requires an extra Graph API call, so we leave it null here.
        const avatarUrl: string | null = null;

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
                    lastSeenAt: new Date(),
                },
            })
            .returning();

        if (!dbUser) {
            throw createError({ statusCode: 500, statusMessage: 'Failed to upsert user.' });
        }

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
        console.error('[auth] Microsoft OAuth error:', error);

        return sendRedirect(event, '/auth/login?error=oauth');
    },
});
