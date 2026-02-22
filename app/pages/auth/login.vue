<script setup lang="ts">
// Redirect to home if already authenticated
const { loggedIn } = useUserSession();

if (loggedIn.value) {
    await navigateTo('/');
}

const route = useRoute();
const hasError = computed(() => route.query.error === 'oauth');
</script>

<template>
    <div class="login-shell">
        <div class="login-card">
            <div class="login-brand">
                <span class="brand-mark font-serif">CV</span>
                <span class="brand-name font-serif">Analyst</span>
            </div>

            <h1 class="login-title font-serif">
                Sign in to<br /><em>your workspace</em>
            </h1>

            <p class="login-sub">
                AI-powered CV analysis for technical recruiters.<br />
                Sign in with your work account to continue.
            </p>

            <p v-if="hasError" class="login-error">
                Authentication failed. Please try again.
            </p>

            <div class="oauth-buttons">
                <a href="/auth/microsoft" class="oauth-btn microsoft-btn">
                    <svg class="oauth-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#F25022" d="M1 1h10v10H1z" />
                        <path fill="#7FBA00" d="M13 1h10v10H13z" />
                        <path fill="#00A4EF" d="M1 13h10v10H1z" />
                        <path fill="#FFB900" d="M13 13h10v10H13z" />
                    </svg>
                    Continue with Microsoft
                </a>

                <a href="/auth/google" class="oauth-btn google-btn">
                    <svg class="oauth-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    Continue with Google
                </a>
            </div>

            <p class="login-footer">
                By signing in you agree to use this tool responsibly.<br />
                Your data is scoped to your account only.
            </p>
        </div>
    </div>
</template>

<style scoped>
.login-shell {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--paper);
    padding: 2rem;
}

.login-card {
    width: 100%;
    max-width: 400px;
    background: #fff;
    border: 1px solid var(--paper-dark);
    border-radius: var(--radius);
    padding: 3rem 2.5rem;
    box-shadow: var(--shadow-lg);
    text-align: center;
    animation: fadeUp 0.4s ease both;
}

.login-brand {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 0.4rem;
    margin-bottom: 2rem;
}

.brand-mark {
    font-size: 1.5rem;
    font-weight: 500;
    color: var(--accent);
}

.brand-name {
    font-size: 1.1rem;
    font-weight: 300;
    color: var(--ink-soft);
}

.login-title {
    font-size: 1.75rem;
    font-weight: 300;
    line-height: 1.25;
    color: var(--ink);
    margin-bottom: 0.75rem;
}

.login-title em {
    color: var(--accent);
    font-style: italic;
}

.login-sub {
    font-size: 0.875rem;
    color: var(--ink-muted);
    line-height: 1.6;
    margin-bottom: 2rem;
}

.login-error {
    font-size: 0.825rem;
    color: var(--red);
    background: var(--red-pale);
    border: 1px solid var(--red);
    border-radius: var(--radius);
    padding: 0.6rem 1rem;
    margin-bottom: 1.25rem;
}

.oauth-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.oauth-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem 1.25rem;
    background: #fff;
    border: 1px solid var(--paper-dark);
    border-radius: var(--radius);
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--ink);
    text-decoration: none;
    cursor: pointer;
    transition: all 0.15s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    font-family: 'DM Sans', sans-serif;
}

.oauth-btn:hover {
    border-color: var(--ink-soft);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.oauth-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
}

.login-footer {
    margin-top: 1.5rem;
    font-size: 0.72rem;
    color: var(--ink-muted);
    line-height: 1.6;
}
</style>
