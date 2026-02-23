<script setup lang="ts">
import type { IAdminStats } from '~/types/index';

// ── Guard — admin only ────────────────────────────────────────────────────────
const { user } = useUserSession();

if (!user.value || (user.value as ISessionUser)?.role !== 'admin') {
    await navigateTo('/');
}

// ── Data ──────────────────────────────────────────────────────────────────────
const { data: stats, pending, error } = await useFetch<IAdminStats>('/api/admin/stats');

// ── Helpers ───────────────────────────────────────────────────────────────────
function verdictColor(verdict: string): string {
    if (verdict === 'strong fit') {
        return 'var(--green)';
    }

    if (verdict === 'good fit') {
        return 'var(--accent)';
    }

    if (verdict === 'partial fit') {
        return 'var(--amber)';
    }

    return 'var(--red)';
}

function providerLabel(p: string): string {
    const labels: Record<string, string> = { anthropic: 'Claude', openai: 'GPT-4o', gemini: 'Gemini' };

    return labels[p] ?? p;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function totalAnalyses(): number {
    return Number(stats.value?.totals?.totalAnalyses ?? 0);
}

function avgScore(): string {
    const v = stats.value?.totals?.avgScore;

    return v ? Number(v).toFixed(1) : '—';
}

function verdictCount(verdict: string): number {
    return stats.value?.byVerdict.find((r) => r.verdict === verdict)?.count ?? 0;
}

function providerCount(provider: string): number {
    return stats.value?.byProvider.find((r) => r.provider === provider)?.count ?? 0;
}

function maxProviderCount(): number {
    return Math.max(...(stats.value?.byProvider.map((r) => r.count) ?? [1]), 1);
}

function maxRecruiterCount(): number {
    return Math.max(...(stats.value?.byRecruiter.map((r) => r.analysisCount) ?? [1]), 1);
}
</script>

<template>
    <div class="admin-shell">
        <!-- Header -->
        <header class="app-header">
            <div class="app-header__inner">
                <div class="app-header__brand">
                    <span class="brand__mark font-serif">CV</span>
                    <span class="brand__name font-serif">Analyst</span>
                    <span class="brand__tag font-mono">admin</span>
                </div>

                <nav class="app-header__nav">
                    <NuxtLink to="/" class="nav-btn">← Analyser</NuxtLink>
                    <a href="/auth/logout" class="nav-btn">Sign out</a>
                </nav>
            </div>
        </header>

        <main class="admin-content">
            <div class="admin-page__intro">
                <h1 class="admin-page__title font-serif">Team Dashboard</h1>
                <p class="admin-page__sub">Aggregate metrics across all recruiters.</p>
            </div>

            <div v-if="pending" class="loading-state">
                <p class="font-mono">Loading stats…</p>
            </div>

            <div v-else-if="error" class="error-state">
                <p>Failed to load stats. Make sure you have admin access.</p>
            </div>

            <template v-else-if="stats">
                <!-- KPI row -->
                <div class="kpi-row">
                    <div class="kpi-card">
                        <span class="kpi-card__value font-serif">{{ totalAnalyses() }}</span>
                        <span class="kpi-card__label">Total analyses</span>
                    </div>

                    <div class="kpi-card">
                        <span class="kpi-card__value font-serif">{{ avgScore() }}</span>
                        <span class="kpi-card__label">Avg fit score</span>
                    </div>

                    <div class="kpi-card">
                        <span class="kpi-card__value font-serif">{{ stats.byRecruiter.length }}</span>
                        <span class="kpi-card__label">Recruiters</span>
                    </div>

                    <div class="kpi-card">
                        <span class="kpi-card__value font-serif" :style="{ color: 'var(--green)' }">
                            {{ verdictCount('strong fit') + verdictCount('good fit') }}
                        </span>
                        <span class="kpi-card__label">Strong / Good fits</span>
                    </div>
                </div>

                <div class="two-col">
                    <!-- Verdict breakdown -->
                    <div class="stat-card">
                        <h3 class="stat-card__title font-serif">Verdict breakdown</h3>

                        <div class="verdict-list">
                            <div
                                v-for="verdict in ['strong fit', 'good fit', 'partial fit', 'weak fit']"
                                :key="verdict"
                                class="verdict-list__row"
                            >
                                <span class="verdict-list__dot" :style="{ background: verdictColor(verdict) }" />
                                <span class="verdict-list__name">{{ verdict }}</span>
                                <span class="verdict-list__count font-mono">{{ verdictCount(verdict) }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Provider usage -->
                    <div class="stat-card">
                        <h3 class="stat-card__title font-serif">Provider usage</h3>

                        <div class="provider-usage">
                            <div v-for="p in ['anthropic', 'openai', 'gemini']" :key="p" class="provider-usage__row">
                                <span class="provider-usage__name">{{ providerLabel(p) }}</span>
                                <div class="mini-bar">
                                    <div
                                        class="mini-bar__fill"
                                        :style="{
                                            width: (providerCount(p) / maxProviderCount()) * 100 + '%',
                                        }"
                                    />
                                </div>
                                <span class="provider-usage__count font-mono">{{ providerCount(p) }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recruiters table -->
                <div class="stat-card">
                    <h3 class="stat-card__title font-serif">Recruiter activity</h3>

                    <div class="recruiter-list">
                        <div v-for="r in stats.byRecruiter" :key="r.userId" class="recruiter-list__row">
                            <div class="recruiter-list__avatar font-serif">
                                {{ r.name.charAt(0).toUpperCase() }}
                            </div>

                            <div class="recruiter-list__info">
                                <strong class="recruiter-list__name">{{ r.name }}</strong>
                                <span class="recruiter-list__email font-mono">{{ r.email }}</span>
                            </div>

                            <div class="recruiter-list__stats">
                                <div class="mini-bar mini-bar--wide">
                                    <div
                                        class="mini-bar__fill"
                                        :style="{
                                            width: (r.analysisCount / maxRecruiterCount()) * 100 + '%',
                                        }"
                                    />
                                </div>
                                <span class="recruiter-list__count font-mono">{{ r.analysisCount }} analyses</span>
                            </div>

                            <div class="recruiter-list__meta">
                                <span class="recruiter-list__score font-mono">avg {{ r.avgScore ? Number(r.avgScore).toFixed(0) : '—' }}</span>
                                <span class="recruiter-list__date font-mono">last seen {{ formatDate(r.lastSeenAt) }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recent analyses -->
                <div class="stat-card">
                    <h3 class="stat-card__title font-serif">Recent analyses</h3>

                    <div class="recent-list">
                        <div v-for="a in stats.recent" :key="a.id" class="recent-list__row">
                            <div class="recent-list__candidate">
                                <strong>{{ a.candidateName }}</strong>
                                <span class="recent-list__role">{{ a.roleName }}</span>
                            </div>

                            <div class="recent-list__meta">
                                <span class="recent-list__verdict font-mono" :style="{ color: verdictColor(a.verdict) }">
                                    {{ a.verdict }}
                                </span>
                                <span class="recent-list__score font-mono">{{ a.overallScore }}%</span>
                                <span class="recent-list__recruiter">by {{ a.recruiterName }}</span>
                                <span class="recent-list__date font-mono">{{ formatDate(a.createdAt) }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </main>
    </div>
</template>

<style scoped lang="scss">
@use '~/assets/scss/mixins' as *;

// ─── Shell ────────────────────────────────────────────────────────────────────
.admin-shell {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

// ─── Content ──────────────────────────────────────────────────────────────────
.admin-content {
    max-width: 1100px;
    width: 100%;
    margin: 0 auto;
    padding: 3rem 2rem 4rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

// ─── Page intro ───────────────────────────────────────────────────────────────
.admin-page {
    &__title {
        font-size: 2rem;
        font-weight: 300;
        color: var(--ink);
        margin-bottom: 0.25rem;
    }

    &__sub {
        font-size: 0.875rem;
        color: var(--ink-muted);
    }
}

// ─── States ───────────────────────────────────────────────────────────────────
.loading-state,
.error-state {
    font-size: 0.875rem;
    color: var(--ink-muted);
    padding: 3rem 0;
    text-align: center;
}

// ─── KPI row ──────────────────────────────────────────────────────────────────
.kpi-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;

    @media (width <= 700px) {
        grid-template-columns: repeat(2, 1fr);
    }
}

.kpi-card {
    @include card;
    padding: 1.25rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;

    &__value {
        font-size: 2rem;
        font-weight: 500;
        line-height: 1;
        color: var(--ink);
    }

    &__label {
        font-size: 0.75rem;
        color: var(--ink-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
}

// ─── Two-col layout ───────────────────────────────────────────────────────────
.two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;

    @media (width <= 600px) {
        grid-template-columns: 1fr;
    }
}

// ─── Stat card ────────────────────────────────────────────────────────────────
.stat-card {
    @include card;
    padding: 1.5rem;

    &__title {
        font-size: 1rem;
        font-weight: 500;
        color: var(--ink);
        margin-bottom: 1.25rem;
    }
}

// ─── Verdict list ─────────────────────────────────────────────────────────────
.verdict-list {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;

    &__row {
        display: flex;
        align-items: center;
        gap: 0.6rem;
    }

    &__dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    &__name {
        flex: 1;
        font-size: 0.875rem;
        color: var(--ink-soft);
        text-transform: capitalize;
    }

    &__count {
        font-size: 0.8rem;
        color: var(--ink-muted);
    }
}

// ─── Provider usage ───────────────────────────────────────────────────────────
.provider-usage {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;

    &__row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    &__name {
        width: 65px;
        font-size: 0.82rem;
        color: var(--ink-soft);
        flex-shrink: 0;
    }

    &__count {
        font-size: 0.75rem;
        color: var(--ink-muted);
        flex-shrink: 0;
    }
}

// ─── Mini bar ─────────────────────────────────────────────────────────────────
.mini-bar {
    @include bar-track(5px, var(--paper-warm));
    flex: 1;

    &--wide {
        min-width: 80px;
    }

    &__fill {
        @include bar-fill(var(--accent), 0.5s);
        height: 100%;
    }
}

// ─── Recruiter list ───────────────────────────────────────────────────────────
.recruiter-list {
    display: flex;
    flex-direction: column;

    &__row {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.875rem 0;
        border-bottom: 1px solid var(--paper-warm);

        &:last-child {
            border-bottom: none;
        }
    }

    &__avatar {
        @include avatar(36px, 1px);
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--ink-soft);
    }

    &__info {
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
        min-width: 140px;
    }

    &__name {
        font-size: 0.875rem;
        font-weight: 500;
    }

    &__email {
        font-size: 0.7rem;
        color: var(--ink-muted);
    }

    &__stats {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    &__count {
        font-size: 0.72rem;
        color: var(--ink-muted);
        white-space: nowrap;
    }

    &__meta {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.1rem;
        flex-shrink: 0;
    }

    &__score {
        font-size: 0.75rem;
        color: var(--ink-soft);
    }

    &__date {
        font-size: 0.68rem;
        color: var(--ink-muted);
    }
}

// ─── Recent list ──────────────────────────────────────────────────────────────
.recent-list {
    display: flex;
    flex-direction: column;

    &__row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.75rem 0;
        border-bottom: 1px solid var(--paper-warm);

        &:last-child {
            border-bottom: none;
        }
    }

    &__candidate {
        display: flex;
        flex-direction: column;
        gap: 0.1rem;

        strong {
            font-size: 0.875rem;
            font-weight: 500;
        }
    }

    &__role {
        font-size: 0.75rem;
        color: var(--ink-muted);
    }

    &__meta {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-shrink: 0;
    }

    &__verdict {
        font-size: 0.7rem;
        text-transform: capitalize;
    }

    &__score {
        font-size: 0.75rem;
        color: var(--ink-soft);
    }

    &__recruiter {
        font-size: 0.75rem;
        color: var(--ink-muted);
    }

    &__date {
        font-size: 0.7rem;
        color: var(--ink-muted);
    }
}
</style>
