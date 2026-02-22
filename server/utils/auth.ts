import type { H3Event } from 'h3';

// ── Shared session user type ──────────────────────────────────────────────────
export interface ISessionUser {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    role: 'admin' | 'recruiter';
}

// ── requireAuth ───────────────────────────────────────────────────────────────
// Call at the top of any API route that needs the current user.
// Throws 401 if unauthenticated — the middleware already handles this for most
// routes, but calling this explicitly gives a typed user object back.
export async function requireAuth(event: H3Event): Promise<ISessionUser> {
    const session = await getUserSession(event);

    if (!session?.user) {
        throw createError({ statusCode: 401, statusMessage: 'Authentication required.' });
    }

    return session.user as ISessionUser;
}

// ── requireAdmin ──────────────────────────────────────────────────────────────
// Like requireAuth but also enforces admin role.
export async function requireAdmin(event: H3Event): Promise<ISessionUser> {
    const user = await requireAuth(event);

    if (user.role !== 'admin') {
        throw createError({ statusCode: 403, statusMessage: 'Admin access required.' });
    }

    return user;
}
