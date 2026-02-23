<script setup lang="ts">
import type { IAdminStats } from '~/types/index';
import { useDateFormat } from '~/composables/useDateFormat';

// ── Guard — admin only ────────────────────────────────────────────────────────
const { user } = useUserSession();

if (!user.value || (user.value as ISessionUser)?.role !== 'admin') {
    await navigateTo('/');
}

const { formatDate } = useDateFormat();

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

// Placement rate helpers
function strongFitPlacementRate(): string {
    const s = stats.value?.strongFitPlacement;

    if (!s || s.rate == null) {
        return '—';
    }

    return (s.rate * 100).toFixed(0) + '%';
}

function strongFitPlacementTooltip(): string {
    const s = stats.value?.strongFitPlacement;

    if (!s) {
        return '';
    }

    return `Placed: ${s.placed} / ${s.total} strong fit candidates`;
}

defineOptions({
    name: 'AdminDashboard',
});
</script>

<template>
    <div class="admin-shell">
        <!-- Header -->
        <AppHeader tag="admin">
            <NuxtLink to="/" class="nav-btn">← Analyser</NuxtLink>
            <NuxtLink to="/compare" class="nav-btn">Compare CVs</NuxtLink>
            <NuxtLink to="/jd-generator" class="nav-btn">JD Generator</NuxtLink>
            <a href="/auth/logout" class="nav-btn">Sign out</a>
        </AppHeader>

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
                    <KpiCard :value="totalAnalyses()" label="Total analyses" />
                    <KpiCard :value="avgScore()" label="Avg fit score" />
                    <KpiCard :value="stats.byRecruiter.length" label="Recruiters" />
                    <KpiCard
                        :value="verdictCount('strong fit') + verdictCount('good fit')"
                        label="Strong / Good fits"
                        value-color="var(--green)"
                    />
                    <KpiCard
                        :value="strongFitPlacementRate()"
                        label="Strong fit placement rate"
                        value-color="var(--accent)"
                        :tooltip="strongFitPlacementTooltip()"
                    />
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
                                <span class="recruiter-list__score font-mono">
                                    avg {{ r.avgScore ? Number(r.avgScore).toFixed(0) : '—' }}
                                </span>
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

<style scoped lang="scss" src="./index.scss"></style>
