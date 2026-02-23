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
            <div class="header-inner">
                <div class="brand">
                    <span class="brand-mark font-serif">CV</span>
                    <span class="brand-name font-serif">Analyst</span>
                    <span class="brand-tag font-mono">admin</span>
                </div>

                <nav class="header-nav">
                    <NuxtLink to="/" class="nav-btn">← Analyser</NuxtLink>
                    <a href="/auth/logout" class="nav-btn">Sign out</a>
                </nav>
            </div>
        </header>

        <main class="admin-content">
            <div class="page-intro">
                <h1 class="page-title font-serif">Team Dashboard</h1>
                <p class="page-sub">Aggregate metrics across all recruiters.</p>
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
                        <span class="kpi-value font-serif">{{ totalAnalyses() }}</span>
                        <span class="kpi-label">Total analyses</span>
                    </div>

                    <div class="kpi-card">
                        <span class="kpi-value font-serif">{{ avgScore() }}</span>
                        <span class="kpi-label">Avg fit score</span>
                    </div>

                    <div class="kpi-card">
                        <span class="kpi-value font-serif">{{ stats.byRecruiter.length }}</span>
                        <span class="kpi-label">Recruiters</span>
                    </div>

                    <div class="kpi-card">
                        <span class="kpi-value font-serif" :style="{ color: 'var(--green)' }">
                            {{ verdictCount('strong fit') + verdictCount('good fit') }}
                        </span>
                        <span class="kpi-label">Strong / Good fits</span>
                    </div>
                </div>

                <div class="two-col">
                    <!-- Verdict breakdown -->
                    <div class="stat-card">
                        <h3 class="card-title font-serif">Verdict breakdown</h3>

                        <div class="verdict-list">
                            <div
                                v-for="verdict in ['strong fit', 'good fit', 'partial fit', 'weak fit']"
                                :key="verdict"
                                class="verdict-row"
                            >
                                <span class="verdict-dot" :style="{ background: verdictColor(verdict) }" />
                                <span class="verdict-name">{{ verdict }}</span>
                                <span class="verdict-count font-mono">{{ verdictCount(verdict) }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Provider usage -->
                    <div class="stat-card">
                        <h3 class="card-title font-serif">Provider usage</h3>

                        <div class="provider-list">
                            <div v-for="p in ['anthropic', 'openai', 'gemini']" :key="p" class="provider-row">
                                <span class="provider-name">{{ providerLabel(p) }}</span>
                                <div class="mini-bar-track">
                                    <div
                                        class="mini-bar-fill"
                                        :style="{
                                            width: (providerCount(p) / maxProviderCount()) * 100 + '%',
                                        }"
                                    />
                                </div>
                                <span class="provider-count font-mono">{{ providerCount(p) }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recruiters table -->
                <div class="stat-card">
                    <h3 class="card-title font-serif">Recruiter activity</h3>

                    <div class="recruiters-list">
                        <div v-for="r in stats.byRecruiter" :key="r.userId" class="recruiter-row">
                            <div class="recruiter-avatar font-serif">
                                {{ r.name.charAt(0).toUpperCase() }}
                            </div>

                            <div class="recruiter-info">
                                <strong class="recruiter-name">{{ r.name }}</strong>
                                <span class="recruiter-email font-mono">{{ r.email }}</span>
                            </div>

                            <div class="recruiter-stats">
                                <div class="mini-bar-track wide">
                                    <div
                                        class="mini-bar-fill"
                                        :style="{
                                            width: (r.analysisCount / maxRecruiterCount()) * 100 + '%',
                                        }"
                                    />
                                </div>
                                <span class="recruiter-count font-mono">{{ r.analysisCount }} analyses</span>
                            </div>

                            <div class="recruiter-meta">
                                <span class="recruiter-score font-mono">avg {{ r.avgScore ? Number(r.avgScore).toFixed(0) : '—' }}</span>
                                <span class="recruiter-date font-mono">last seen {{ formatDate(r.lastSeenAt) }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recent analyses -->
                <div class="stat-card">
                    <h3 class="card-title font-serif">Recent analyses</h3>

                    <div class="recent-list">
                        <div v-for="a in stats.recent" :key="a.id" class="recent-row">
                            <div class="recent-candidate">
                                <strong>{{ a.candidateName }}</strong>
                                <span class="recent-role">{{ a.roleName }}</span>
                            </div>

                            <div class="recent-meta">
                                <span class="verdict-mini font-mono" :style="{ color: verdictColor(a.verdict) }">
                                    {{ a.verdict }}
                                </span>
                                <span class="score-mini font-mono">{{ a.overallScore }}%</span>
                                <span class="recruiter-mini">by {{ a.recruiterName }}</span>
                                <span class="date-mini font-mono">{{ formatDate(a.createdAt) }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </main>
    </div>
</template>

<style scoped>
.admin-shell {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

/* Header — same as index.vue */
.app-header {
    position: sticky;
    top: 0;
    z-index: 100;
    background: var(--paper);
    border-bottom: 1px solid var(--paper-dark);
}

.header-inner {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 2rem;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.brand {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
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

.brand-tag {
    font-size: 0.65rem;
    color: var(--ink-muted);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-left: 0.25rem;
    font-family: 'DM Mono', monospace;
}

.header-nav {
    display: flex;
    gap: 0.5rem;
}

.nav-btn {
    display: flex;
    align-items: center;
    padding: 0.35rem 0.9rem;
    border: 1px solid var(--paper-dark);
    border-radius: var(--radius);
    background: transparent;
    color: var(--ink-soft);
    font-size: 0.82rem;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.15s;
}

.nav-btn:hover {
    border-color: var(--ink-soft);
    color: var(--ink);
}

/* Content */
.admin-content {
    max-width: 1100px;
    width: 100%;
    margin: 0 auto;
    padding: 3rem 2rem 4rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.page-title {
    font-size: 2rem;
    font-weight: 300;
    color: var(--ink);
    margin-bottom: 0.25rem;
}

.page-sub {
    font-size: 0.875rem;
    color: var(--ink-muted);
}

.loading-state,
.error-state {
    font-size: 0.875rem;
    color: var(--ink-muted);
    padding: 3rem 0;
    text-align: center;
}

/* KPI row */
.kpi-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
}

@media (width <= 700px) {
    .kpi-row {
        grid-template-columns: repeat(2, 1fr);
    }
}

.kpi-card {
    background: #fff;
    border: 1px solid var(--paper-dark);
    border-radius: var(--radius);
    padding: 1.25rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    box-shadow: var(--shadow);
}

.kpi-value {
    font-size: 2rem;
    font-weight: 500;
    line-height: 1;
    color: var(--ink);
}

.kpi-label {
    font-size: 0.75rem;
    color: var(--ink-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

/* Two col */
.two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
}

@media (width <= 600px) {
    .two-col {
        grid-template-columns: 1fr;
    }
}

/* Stat card */
.stat-card {
    background: #fff;
    border: 1px solid var(--paper-dark);
    border-radius: var(--radius);
    padding: 1.5rem;
    box-shadow: var(--shadow);
}

.card-title {
    font-size: 1rem;
    font-weight: 500;
    color: var(--ink);
    margin-bottom: 1.25rem;
}

/* Verdict list */
.verdict-list {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}

.verdict-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
}

.verdict-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
}

.verdict-name {
    flex: 1;
    font-size: 0.875rem;
    color: var(--ink-soft);
    text-transform: capitalize;
}

.verdict-count {
    font-size: 0.8rem;
    color: var(--ink-muted);
}

/* Provider list */
.provider-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.provider-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.provider-name {
    width: 65px;
    font-size: 0.82rem;
    color: var(--ink-soft);
    flex-shrink: 0;
}

.mini-bar-track {
    flex: 1;
    height: 5px;
    background: var(--paper-warm);
    border-radius: 3px;
    overflow: hidden;
}

.mini-bar-track.wide {
    min-width: 80px;
}

.mini-bar-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 3px;
    transition: width 0.5s ease;
}

.provider-count {
    font-size: 0.75rem;
    color: var(--ink-muted);
    flex-shrink: 0;
}

/* Recruiters */
.recruiters-list {
    display: flex;
    flex-direction: column;
    gap: 0;
}

.recruiter-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.875rem 0;
    border-bottom: 1px solid var(--paper-warm);
}

.recruiter-row:last-child {
    border-bottom: none;
}

.recruiter-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--paper-warm);
    border: 1px solid var(--paper-dark);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--ink-soft);
    flex-shrink: 0;
}

.recruiter-info {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 140px;
}

.recruiter-name {
    font-size: 0.875rem;
    font-weight: 500;
}

.recruiter-email {
    font-size: 0.7rem;
    color: var(--ink-muted);
}

.recruiter-stats {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.recruiter-count {
    font-size: 0.72rem;
    color: var(--ink-muted);
    white-space: nowrap;
}

.recruiter-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.1rem;
    flex-shrink: 0;
}

.recruiter-score {
    font-size: 0.75rem;
    color: var(--ink-soft);
}

.recruiter-date {
    font-size: 0.68rem;
    color: var(--ink-muted);
}

/* Recent analyses */
.recent-list {
    display: flex;
    flex-direction: column;
}

.recent-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--paper-warm);
}

.recent-row:last-child {
    border-bottom: none;
}

.recent-candidate {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
}

.recent-candidate strong {
    font-size: 0.875rem;
    font-weight: 500;
}

.recent-role {
    font-size: 0.75rem;
    color: var(--ink-muted);
}

.recent-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
}

.verdict-mini {
    font-size: 0.7rem;
    text-transform: capitalize;
}

.score-mini {
    font-size: 0.75rem;
    color: var(--ink-soft);
}

.recruiter-mini {
    font-size: 0.75rem;
    color: var(--ink-muted);
}

.date-mini {
    font-size: 0.7rem;
    color: var(--ink-muted);
}
</style>
