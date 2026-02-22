// ── Global auth middleware ────────────────────────────────────────────────────
// Runs on every client-side navigation and on the initial SSR render.
// Unauthenticated users are redirected to /auth/login.
export default defineNuxtRouteMiddleware((to) => {
    const { loggedIn } = useUserSession();

    if (loggedIn.value) {
        return;
    }

    // Allow the login page itself through to avoid redirect loops
    if (to.path.startsWith('/auth/')) {
        return;
    }

    return navigateTo('/auth/login');
});
