<script setup lang="ts">
import { useAnalyser } from '~/composables/useAnalyser';
import type { TProvider, IHistoryEntry, ISkill, TQuestionCategory } from '~/types/index';

interface IExtendedUser {
    role?: string;
    name?: string;
}

// ── Composable ────────────────────────────────────────────────────────────────
const {
    result,
    isLoading,
    isHistoryLoading,
    error,
    progress,
    history,
    analyse,
    loadAnalysis,
    reset,
    deleteFromHistory,
    clearHistory,
    providerLabel,
    fitScoreColor,
} = useAnalyser();

// ── Auth ──────────────────────────────────────────────────────────────────────
const { user } = useUserSession();

const extendedUser = computed(() => user.value as IExtendedUser | null);

// ── Input state ───────────────────────────────────────────────────────────────
const cvText = ref('');
const jobDescription = ref('');
const provider = ref<TProvider>('gemini');
const cvInputMode = ref<'paste' | 'upload'>('paste');
const showHistory = ref(false);
const uploadedFileName = ref<string | null>(null);
const isDraggingOver = ref(false);

// ── File upload ───────────────────────────────────────────────────────────────
async function handleFile(file: File): Promise<void> {
    uploadedFileName.value = file.name;

    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        cvText.value = await file.text();

        return;
    }

    // For PDF/DOCX, send to server for extraction
    const form = new FormData();

    form.append('file', file);

    try {
        const response = await fetch('/api/extract-text', {
            method: 'POST',
            body: form,
        });

        if (!response.ok) {
            throw new Error('Failed to extract text');
        }

        const data = (await response.json()) as { text: string };

        cvText.value = data.text;
    } catch {
        cvText.value = '';
        uploadedFileName.value = null;

        alert('Could not extract text from this file. Please paste the CV text directly.');
    }
}

function onDrop(e: DragEvent): void {
    isDraggingOver.value = false;

    const file = e.dataTransfer?.files[0];

    if (file) {
        handleFile(file);
    }
}

function onFileInput(e: Event): void {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];

    if (file) {
        handleFile(file);
    }
}

// ── Submit ────────────────────────────────────────────────────────────────────
async function submit(): Promise<void> {
    await analyse({
        cvText: cvText.value,
        jobDescription: jobDescription.value,
        provider: provider.value,
    });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function skillLevelWidth(level: ISkill['level']): string {
    const widths: Record<ISkill['level'], string> = {
        beginner: '25%',
        intermediate: '50%',
        advanced: '75%',
        expert: '100%',
    };

    return widths[level];
}

function categoryColor(category: TQuestionCategory): string {
    const colors: Record<TQuestionCategory, string> = {
        technical: 'var(--blue)',
        behavioural: 'var(--green)',
        situational: 'var(--accent)',
        cultural: 'var(--amber)',
    };

    return colors[category];
}

function categoryBg(category: TQuestionCategory): string {
    const bgs: Record<TQuestionCategory, string> = {
        technical: 'var(--blue-pale)',
        behavioural: 'var(--green-pale)',
        situational: 'var(--accent-pale)',
        cultural: 'var(--amber-pale)',
    };

    return bgs[category];
}

function severityColor(severity: 'low' | 'medium' | 'high'): string {
    const colors = { low: 'var(--amber)', medium: 'var(--accent)', high: 'var(--red)' };

    return colors[severity];
}

function severityBg(severity: 'low' | 'medium' | 'high'): string {
    const bgs = { low: 'var(--amber-pale)', medium: 'var(--accent-pale)', high: 'var(--red-pale)' };

    return bgs[severity];
}

function confidenceDot(confidence: 'low' | 'medium' | 'high'): string {
    const colors = { low: 'var(--ink-muted)', medium: 'var(--accent)', high: 'var(--green)' };

    return colors[confidence];
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

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

function hasAnyTechStack(): boolean {
    if (!result.value) {
        return false;
    }

    const { techStack } = result.value;

    return Object.values(techStack).some((arr) => (arr as ISkill[]).length > 0);
}

function techStackEntries(): [string, ISkill[]][] {
    if (!result.value) {
        return [];
    }

    return Object.entries(result.value.techStack).filter(([, skills]) => (skills as ISkill[]).length > 0) as [string, ISkill[]][];
}

async function loadEntry(entry: IHistoryEntry): Promise<void> {
    showHistory.value = false;
    await loadAnalysis(entry.id);
}

async function editEntry(entry: IHistoryEntry): Promise<void> {
    showHistory.value = false;
    await loadAnalysis(entry.id);
    if (result.value) {
        cvText.value = result.value.cvText || '';
        jobDescription.value = result.value.jobDescription || '';
        provider.value = result.value.provider;
        result.value = null;
    }
}

function getFitScoreValue(key: 'technical' | 'experience' | 'softSkills'): number {
    if (!result.value) {
        return 0;
    }

    return result.value.fitScore[key];
}

const providers = ['anthropic', 'openai', 'gemini'] as const;
</script>

<template>
    <div class="app-shell">
        <!-- ── Header ──────────────────────────────────────────────── -->
        <header class="app-header">
            <div class="app-header__inner">
                <div class="app-header__brand">
                    <span class="brand__mark font-serif">CV</span>
                    <span class="brand__name font-serif">Analyst</span>
                    <span class="brand__tag font-mono">by recruitr</span>
                </div>

                <nav class="app-header__nav">
                    <NuxtLink v-if="extendedUser?.role === 'admin'" to="/admin" class="nav-btn">▤ Admin</NuxtLink>

                    <button class="nav-btn" :class="{ 'nav-btn--active': showHistory }" @click="showHistory = !showHistory">
                        History
                        <span v-if="history.length > 0" class="nav-btn__badge">{{ history.length }}</span>
                    </button>

                    <div class="user-chip">
                        <span class="user-chip__name">{{ extendedUser?.name?.split(' ')[0] }}</span>
                        <a href="/auth/logout" class="user-chip__signout" title="Sign out">⎋</a>
                    </div>
                </nav>
            </div>
        </header>

        <!-- ── History sidebar ────────────────────────────────────── -->
        <Transition name="slide">
            <aside v-if="showHistory" class="history-sidebar">
                <div class="history-sidebar__header">
                    <h3 class="font-serif">Previous Analyses</h3>

                    <div class="history-sidebar__actions">
                        <button v-if="history.length > 0" class="text-btn text-btn--danger" @click="clearHistory">Clear all</button>
                        <button class="history-sidebar__close" @click="showHistory = false">✕</button>
                    </div>
                </div>

                <div v-if="isHistoryLoading" class="history-sidebar__loading">
                    <div v-for="i in 3" :key="i" class="history-sidebar__skeleton-row">
                        <div class="skeleton skeleton--name" />
                        <div class="skeleton skeleton--meta" />
                    </div>
                </div>

                <div v-else-if="history.length === 0" class="history-sidebar__empty">
                    <p>No analyses yet.</p>
                </div>

                <ul v-else class="history-list">
                    <li v-for="entry in history" :key="entry.id" class="history-list__item" @click="loadEntry(entry)">
                        <div class="history-list__item-body">
                            <strong class="history-list__candidate">{{ entry.candidateName }}</strong>
                            <span class="history-list__role">{{ entry.roleName }}</span>
                        </div>

                        <div class="history-list__item-meta">
                            <span class="history-list__score font-mono" :style="{ color: fitScoreColor(entry.overallScore) }">
                                {{ entry.overallScore }}%
                            </span>
                            <span class="history-list__date font-mono">{{ formatDate(entry.createdAt) }}</span>
                            <button class="history-list__edit" title="Edit analysis inputs" @click.stop="editEntry(entry)">✎</button>
                            <button class="history-list__delete" title="Delete analysis" @click.stop="deleteFromHistory(entry.id)">✕</button>
                        </div>
                    </li>
                </ul>
            </aside>
        </Transition>

        <Transition name="fade">
            <div v-if="showHistory" class="history-sidebar__backdrop" @click="showHistory = false" />
        </Transition>

        <!-- ── Main ───────────────────────────────────────────────── -->
        <main class="main-content">
            <!-- Input panel — shown when no result -->
            <section v-if="!result && !isLoading" class="input-panel animate-fade-up">
                <div class="input-panel__intro">
                    <h1 class="input-panel__title font-serif">
                        CV Intelligence
                        <br />
                        <em>for modern recruiters</em>
                    </h1>
                    <p class="input-panel__subtitle">
                        Paste a CV and a job description. Get fit scores, tech stack analysis, red flags, and tailored interview questions —
                        in seconds.
                    </p>
                </div>

                <div class="input-panel__grid">
                    <!-- CV input -->
                    <div class="input-card">
                        <div class="input-card__header">
                            <label class="input-card__label">Candidate CV</label>
                            <div class="input-card__tabs">
                                <button class="tab-btn" :class="{ 'tab-btn--active': cvInputMode === 'paste' }" @click="cvInputMode = 'paste'">
                                    Paste
                                </button>
                                <button class="tab-btn" :class="{ 'tab-btn--active': cvInputMode === 'upload' }" @click="cvInputMode = 'upload'">
                                    Upload
                                </button>
                            </div>
                        </div>

                        <textarea
                            v-if="cvInputMode === 'paste'"
                            v-model="cvText"
                            class="text-input font-mono"
                            placeholder="Paste the candidate's CV here…"
                            rows="14"
                        />

                        <div
                            v-else
                            class="dropzone"
                            :class="{ 'dropzone--drag-over': isDraggingOver }"
                            @dragover.prevent="isDraggingOver = true"
                            @dragleave="isDraggingOver = false"
                            @drop.prevent="onDrop"
                        >
                            <input id="cv-file" type="file" accept=".txt,.pdf,.docx" class="dropzone__file-input" @change="onFileInput" />

                            <label for="cv-file" class="dropzone__label">
                                <span class="dropzone__icon">↑</span>
                                <span v-if="uploadedFileName" class="dropzone__filename font-mono">
                                    {{ uploadedFileName }}
                                </span>
                                <span v-else>
                                    Drop a file or
                                    <u>browse</u>
                                    <br />
                                    <small>.txt · .pdf · .docx</small>
                                </span>
                            </label>
                        </div>
                    </div>

                    <!-- JD input -->
                    <div class="input-card">
                        <div class="input-card__header">
                            <label class="input-card__label">Job Description</label>
                        </div>

                        <textarea
                            v-model="jobDescription"
                            class="text-input font-mono"
                            placeholder="Paste the job description or role requirements here…"
                            rows="14"
                        />
                    </div>
                </div>

                <!-- Provider selector -->
                <div class="provider-row">
                    <span class="provider-row__label">AI provider</span>

                    <div class="provider-row__toggle">
                        <button
                            v-for="p in providers"
                            :key="p"
                            class="provider-row__btn"
                            :class="{ 'provider-btn--active': provider === p }"
                            @click="provider = p"
                        >
                            {{ providerLabel(p) }}
                        </button>
                    </div>

                    <button class="provider-row__submit" :disabled="!cvText.trim() || !jobDescription.trim()" @click="submit">
                        Analyse candidate →
                    </button>
                </div>

                <p v-if="error" class="error-msg">{{ error }}</p>
            </section>

            <!-- Loading state -->
            <section v-if="isLoading" class="loading-panel animate-fade-in">
                <div class="loading-panel__inner">
                    <div class="loading-panel__icon font-serif">⟳</div>
                    <h2 class="loading-panel__title font-serif">Analysing candidate…</h2>
                    <p class="loading-panel__sub">Reading CV, scoring fit, generating questions</p>

                    <div class="progress-bar">
                        <div class="progress-bar__fill" :style="{ width: progress + '%' }" />
                    </div>

                    <span class="progress-bar__label font-mono">{{ Math.round(progress) }}%</span>
                </div>
            </section>

            <!-- Results -->
            <section v-if="result && !isLoading" class="results-panel animate-fade-up">
                <!-- Results header -->
                <div class="results-panel__header">
                    <button class="results-panel__back" @click="reset">← New analysis</button>

                    <div class="results-panel__meta">
                        <span class="results-panel__meta-provider font-mono">{{ providerLabel(result.provider) }}</span>
                        <span class="results-panel__meta-date font-mono">{{ formatDate(result.analysedAt) }}</span>
                    </div>
                </div>

                <!-- Candidate + fit score hero -->
                <div class="hero-card">
                    <div class="hero-card__left">
                        <div class="candidate__avatar font-serif">
                            {{ result.candidate.name?.charAt(0) ?? '?' }}
                        </div>

                        <div class="candidate__info">
                            <h2 class="candidate__name font-serif">
                                {{ result.candidate.name ?? 'Unknown Candidate' }}
                            </h2>
                            <p class="candidate__role">{{ result.candidate.currentRole }}</p>

                            <div class="candidate__chips">
                                <span v-if="result.candidate.totalExperience" class="candidate__chip font-mono">
                                    {{ result.candidate.totalExperience }}
                                </span>
                                <span v-if="result.candidate.location" class="candidate__chip font-mono">
                                    {{ result.candidate.location }}
                                </span>
                                <span v-if="result.candidate.education" class="candidate__chip font-mono">
                                    {{ result.candidate.education }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="hero-card__score">
                        <div class="score-ring" :style="{ '--score-color': fitScoreColor(result.fitScore.overall) }">
                            <span class="score-ring__number font-serif">{{ result.fitScore.overall }}</span>
                            <span class="score-ring__unit font-mono">/ 100</span>
                        </div>

                        <span
                            class="verdict-badge font-mono"
                            :style="{
                                color: verdictColor(result.fitScore.verdict),
                                background: verdictColor(result.fitScore.verdict) + '18',
                            }"
                        >
                            {{ result.fitScore.verdict }}
                        </span>
                    </div>
                </div>

                <!-- Score breakdown -->
                <div class="score-breakdown">
                    <div
                        v-for="(label, key) in { technical: 'Technical', experience: 'Experience', softSkills: 'Soft Skills' }"
                        :key="key"
                        class="score-breakdown__row"
                    >
                        <span class="score-breakdown__label">{{ label }}</span>
                        <div class="score-breakdown__track">
                            <div
                                class="score-breakdown__fill"
                                :style="{
                                    width: getFitScoreValue(key) + '%',
                                    background: fitScoreColor(getFitScoreValue(key)),
                                }"
                            />
                        </div>
                        <span class="score-breakdown__value font-mono">{{ getFitScoreValue(key) }}%</span>
                    </div>
                </div>

                <!-- Summary -->
                <div class="result-card">
                    <h3 class="result-card__title font-serif">Verdict</h3>
                    <p class="result-card__verdict-summary">{{ result.fitScore.summary }}</p>
                </div>

                <!-- Strengths & Gaps -->
                <div class="two-col">
                    <div class="result-card">
                        <h3 class="result-card__title font-serif">Strengths</h3>
                        <ul class="bullet-list bullet-list--green">
                            <li v-for="(s, i) in result.strengths" :key="i">{{ s }}</li>
                        </ul>
                    </div>

                    <div class="result-card">
                        <h3 class="result-card__title font-serif">Gaps</h3>
                        <ul class="bullet-list bullet-list--red">
                            <li v-for="(g, i) in result.gaps" :key="i">{{ g }}</li>
                        </ul>
                    </div>
                </div>

                <!-- Red flags -->
                <div v-if="result.redFlags.length > 0" class="result-card">
                    <h3 class="result-card__title font-serif">
                        Red Flags
                        <span class="result-card__count font-mono">{{ result.redFlags.length }}</span>
                    </h3>

                    <div class="flags-list">
                        <div
                            v-for="(flag, i) in result.redFlags"
                            :key="i"
                            class="flag-item"
                            :style="{
                                borderLeftColor: severityColor(flag.severity),
                                background: severityBg(flag.severity),
                            }"
                        >
                            <div class="flag-item__header">
                                <strong class="flag-item__title">{{ flag.title }}</strong>
                                <span
                                    class="severity-badge font-mono"
                                    :style="{
                                        color: severityColor(flag.severity),
                                        background: severityColor(flag.severity) + '18',
                                    }"
                                >
                                    {{ flag.severity }}
                                </span>
                            </div>
                            <p class="flag-item__desc">{{ flag.description }}</p>
                        </div>
                    </div>
                </div>

                <!-- Tech stack -->
                <div v-if="hasAnyTechStack()" class="result-card">
                    <h3 class="result-card__title font-serif">Tech Stack</h3>

                    <div class="tech-grid">
                        <div v-for="[category, skills] in techStackEntries()" :key="category" class="tech-category">
                            <h4 class="tech-category__title font-mono">{{ category }}</h4>

                            <div class="tech-category__skills">
                                <div v-for="(skill, i) in skills" :key="i" class="skill">
                                    <div class="skill__header">
                                        <span class="skill__name">{{ skill.name }}</span>
                                        <span class="skill__level font-mono">{{ skill.level }}</span>
                                    </div>
                                    <div class="skill__bar">
                                        <div class="skill__bar-fill" :style="{ width: skillLevelWidth(skill.level) }" />
                                    </div>
                                    <div v-if="skill.yearsOfExperience || skill.lastUsed" class="skill__meta font-mono">
                                        <span v-if="skill.yearsOfExperience">{{ skill.yearsOfExperience }}y</span>
                                        <span v-if="skill.lastUsed">last: {{ skill.lastUsed }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Soft skills -->
                <div v-if="result.softSkills.length > 0" class="result-card">
                    <h3 class="result-card__title font-serif">Soft Skills</h3>

                    <div class="soft-skills-grid">
                        <div v-for="(skill, i) in result.softSkills" :key="i" class="soft-skill">
                            <div class="soft-skill__header">
                                <span class="soft-skill__dot" :style="{ background: confidenceDot(skill.confidence) }" />
                                <strong class="soft-skill__name">{{ skill.name }}</strong>
                                <span class="soft-skill__confidence font-mono">{{ skill.confidence }}</span>
                            </div>
                            <p class="soft-skill__evidence">{{ skill.evidence }}</p>
                        </div>
                    </div>
                </div>

                <!-- Interview questions -->
                <div v-if="result.interviewQuestions.length > 0" class="result-card">
                    <h3 class="result-card__title font-serif">
                        Interview Questions
                        <span class="result-card__count font-mono">{{ result.interviewQuestions.length }}</span>
                    </h3>

                    <div class="questions-list">
                        <div v-for="(q, i) in result.interviewQuestions" :key="i" class="question">
                            <div class="question__header">
                                <span class="question__num font-mono">{{ String(i + 1).padStart(2, '0') }}</span>
                                <span
                                    class="question__category font-mono"
                                    :style="{
                                        color: categoryColor(q.category),
                                        background: categoryBg(q.category),
                                    }"
                                >
                                    {{ q.category }}
                                </span>
                                <span class="question__target font-mono">{{ q.targetSkill }}</span>
                            </div>
                            <p class="question__text">{{ q.question }}</p>
                            <p class="question__rationale">{{ q.rationale }}</p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    </div>
</template>

<style scoped lang="scss">
@use '~/assets/scss/mixins' as *;

/* ── Shell ───────────────────────────────────────────────────── */
.app-shell {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

/* header, brand, nav-btn → global in assets/scss/_shared.scss */

/* ── User chip ───────────────────────────────────────────────── */
.user-chip {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.3rem 0.75rem;
    border: 1px solid var(--paper-dark);
    border-radius: var(--radius);
    background: var(--paper-warm);

    &__name {
        font-size: 0.8rem;
        color: var(--ink-soft);
    }

    &__signout {
        font-size: 0.85rem;
        color: var(--ink-muted);
        text-decoration: none;
        line-height: 1;
        transition: color 0.15s;

        &:hover { color: var(--red); }
    }
}

/* ── Text button ─────────────────────────────────────────────── */
.text-btn {
    @include ghost-btn;
    font-size: 0.78rem;
    color: var(--ink-muted);
    padding: 0;

    &--danger:hover { color: var(--red); }
}

/* ── History sidebar ─────────────────────────────────────────── */
.history-sidebar {
    position: fixed;
    top: 60px;
    right: 0;
    bottom: 0;
    width: 340px;
    background: var(--paper);
    border-left: 1px solid var(--paper-dark);
    z-index: 200;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-lg);

    &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid var(--paper-dark);

        h3 {
            font-size: 1rem;
            font-weight: 500;
        }
    }

    &__actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    &__close {
        @include ghost-btn;
        font-size: 1rem;
        color: var(--ink-muted);

        &:hover { color: var(--ink); }
    }

    &__loading { padding: 0.5rem 0; }

    &__skeleton-row {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--paper-warm);
    }

    &__empty {
        padding: 2rem 1.5rem;
        color: var(--ink-muted);
        font-size: 0.875rem;
    }
}

/* ── Skeleton ───────────────────────────────────────────────── */
.skeleton {
    border-radius: var(--radius);
    background: linear-gradient(90deg, var(--paper-warm) 25%, var(--paper-dark) 50%, var(--paper-warm) 75%);
    background-size: 200% auto;
    animation: shimmer 1.4s linear infinite;

    &--name { height: 13px; width: 70%; }
    &--meta { height: 10px; width: 45%; }
}

/* ── History list ────────────────────────────────────────────── */
.history-list {
    list-style: none;
    overflow-y: auto;
    flex: 1;

    &__item {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--paper-warm);
        cursor: pointer;
        transition: background 0.15s;

        &:hover {
            background: var(--paper-warm);

            .history-list__edit,
            .history-list__delete { opacity: 1; }
        }
    }

    &__item-body {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        overflow: hidden;
    }

    &__candidate {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--ink);
        @include truncate;
    }

    &__role {
        font-size: 0.75rem;
        color: var(--ink-muted);
        @include truncate;
    }

    &__item-meta {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
    }

    &__score {
        font-size: 0.75rem;
        font-weight: 500;
    }

    &__date {
        font-size: 0.7rem;
        color: var(--ink-muted);
    }

    &__edit,
    &__delete {
        @include ghost-btn;
        font-size: 0.85rem;
        color: var(--ink-muted);
        opacity: 0;
        padding: 0.2rem;
    }

    &__edit:hover { color: var(--accent); }
    &__delete:hover { color: var(--red); }
}

/* ── Sidebar transitions ─────────────────────────────────────── */
.slide-enter-active,
.slide-leave-active {
    transition: transform 0.25s ease;
}

.slide-enter-from,
.slide-leave-to {
    transform: translateX(100%);
}

.history-sidebar__backdrop {
    position: fixed;
    inset: 0;
    z-index: 150;
    background: rgb(15 14 13 / 20%);
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

/* ── Main content ────────────────────────────────────────────── */
.main-content {
    flex: 1;
    max-width: 1100px;
    width: 100%;
    margin: 0 auto;
    padding: 3rem 2rem 4rem;
}

/* ── Input panel ─────────────────────────────────────────────── */
.input-panel {
    display: flex;
    flex-direction: column;
    gap: 2rem;

    &__intro { max-width: 600px; }

    &__title {
        font-size: 2.5rem;
        font-weight: 300;
        line-height: 1.2;
        color: var(--ink);
        margin-bottom: 0.75rem;

        em { color: var(--accent); font-style: italic; }
    }

    &__subtitle {
        color: var(--ink-muted);
        font-size: 0.95rem;
        line-height: 1.7;
    }

    &__grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;

        @media (width <= 700px) { grid-template-columns: 1fr; }
    }
}

/* ── Input card ──────────────────────────────────────────────── */
.input-card {
    @include card;
    overflow: hidden;

    &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.875rem 1rem;
        border-bottom: 1px solid var(--paper-warm);
    }

    &__label {
        font-size: 0.78rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--ink-muted);
    }

    &__tabs { display: flex; gap: 0.25rem; }
}

/* ── Tab button ──────────────────────────────────────────────── */
.tab-btn {
    padding: 0.25rem 0.6rem;
    border: 1px solid transparent;
    border-radius: var(--radius);
    background: transparent;
    font-size: 0.75rem;
    cursor: pointer;
    color: var(--ink-muted);
    transition: all 0.15s;

    &--active {
        border-color: var(--paper-dark);
        color: var(--ink);
        background: var(--paper-warm);
    }
}

/* ── Text input ──────────────────────────────────────────────── */
.text-input {
    width: 100%;
    padding: 1rem;
    border: none;
    resize: vertical;
    font-size: 0.78rem;
    line-height: 1.7;
    color: var(--ink);
    background: #fff;
    font-family: 'DM Mono', monospace;
    font-weight: 300;
    outline: none;

    &::placeholder { color: var(--ink-muted); }
}

/* ── Dropzone ────────────────────────────────────────────────── */
.dropzone {
    position: relative;
    min-height: 220px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;

    &--drag-over { background: var(--accent-pale); }

    &__file-input {
        position: absolute;
        inset: 0;
        opacity: 0;
        cursor: pointer;
    }

    &__label {
        text-align: center;
        color: var(--ink-muted);
        font-size: 0.875rem;
        line-height: 1.8;
        cursor: pointer;
        pointer-events: none;
    }

    &__icon {
        display: block;
        font-size: 2rem;
        margin-bottom: 0.5rem;
        color: var(--paper-dark);
    }

    &__filename {
        font-size: 0.75rem;
        color: var(--green);
    }
}

/* ── Provider row ────────────────────────────────────────────── */
.provider-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;

    &__label {
        font-size: 0.78rem;
        color: var(--ink-muted);
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }

    &__toggle {
        display: flex;
        border: 1px solid var(--paper-dark);
        border-radius: var(--radius);
        overflow: hidden;
    }

    &__btn {
        padding: 0.5rem 1rem;
        border: none;
        background: transparent;
        font-size: 0.82rem;
        cursor: pointer;
        color: var(--ink-muted);
        transition: all 0.15s;
        border-right: 1px solid var(--paper-dark);

        &:last-child { border-right: none; }

        &--active {
            background: var(--ink);
            color: var(--paper);
        }
    }

    &__submit {
        margin-left: auto;
        padding: 0.65rem 1.5rem;
        background: var(--accent);
        color: #fff;
        border: none;
        border-radius: var(--radius);
        font-size: 0.875rem;
        cursor: pointer;
        transition: opacity 0.15s;
        font-family: 'DM Sans', sans-serif;

        &:disabled { opacity: 0.35; cursor: not-allowed; }
        &:not(:disabled):hover { opacity: 0.88; }
    }
}

/* ── Error message ───────────────────────────────────────────── */
.error-msg {
    color: var(--red);
    font-size: 0.875rem;
    padding: 0.75rem 1rem;
    background: var(--red-pale);
    border-radius: var(--radius);
    border: 1px solid var(--red);
}

/* ── Loading panel ───────────────────────────────────────────── */
.loading-panel {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 50vh;

    &__inner {
        text-align: center;
        max-width: 360px;
        width: 100%;
    }

    &__icon {
        font-size: 2.5rem;
        color: var(--accent);
        display: block;
        margin-bottom: 1rem;
        animation: pulse 2s infinite;
    }

    &__title {
        font-size: 1.5rem;
        font-weight: 300;
        margin-bottom: 0.4rem;
    }

    &__sub {
        font-size: 0.82rem;
        color: var(--ink-muted);
        margin-bottom: 1.5rem;
    }
}

/* ── Progress bar ────────────────────────────────────────────── */
.progress-bar {
    @include bar-track(3px, var(--paper-dark));
    margin-bottom: 0.5rem;

    &__fill { @include bar-fill(var(--accent), 0.3s); }
    &__label { font-size: 0.7rem; color: var(--ink-muted); }
}

/* ── Results ─────────────────────────────────────────────────── */
.results-panel {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;

    &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    &__back {
        @include ghost-btn;
        font-size: 0.875rem;
        color: var(--ink-muted);
        padding: 0;

        &:hover { color: var(--ink); }
    }

    &__meta {
        display: flex;
        gap: 1rem;
        font-size: 0.75rem;
        color: var(--ink-muted);
    }
}

/* ── Hero card ───────────────────────────────────────────────── */
.hero-card {
    @include card;
    padding: 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;

    &__left {
        display: flex;
        align-items: center;
        gap: 1.5rem;
    }

    &__score {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.6rem;
        flex-shrink: 0;
    }
}

/* ── Candidate ───────────────────────────────────────────────── */
.candidate {
    &__avatar {
        @include avatar(60px, 2px);
        font-size: 1.5rem;
    }

    &__name {
        font-size: 1.4rem;
        font-weight: 500;
        color: var(--ink);
        margin-bottom: 0.2rem;
    }

    &__role {
        font-size: 0.875rem;
        color: var(--ink-soft);
        margin-bottom: 0.6rem;
    }

    &__chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
    }

    &__chip {
        @include pill-badge;
        font-size: 0.7rem;
        padding: 0.2rem 0.6rem;
        background: var(--paper-warm);
        border: 1px solid var(--paper-dark);
        color: var(--ink-muted);
    }
}

/* ── Score ring ──────────────────────────────────────────────── */
.score-ring {
    width: 90px;
    height: 90px;
    border-radius: 50%;
    border: 4px solid var(--score-color, var(--green));
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    &__number {
        font-size: 1.75rem;
        font-weight: 500;
        line-height: 1;
        color: var(--ink);
    }

    &__unit {
        font-size: 0.6rem;
        color: var(--ink-muted);
    }
}

/* ── Verdict badge ───────────────────────────────────────────── */
.verdict-badge {
    @include pill-badge;
    font-size: 0.72rem;
    font-weight: 500;
    padding: 0.25rem 0.75rem;
    text-transform: capitalize;
}

/* ── Score breakdown ─────────────────────────────────────────── */
.score-breakdown {
    @include card;
    padding: 1.25rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;

    &__row {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    &__label {
        width: 90px;
        font-size: 0.8rem;
        color: var(--ink-soft);
        flex-shrink: 0;
    }

    &__track {
        @include bar-track(6px);
        flex: 1;
    }

    &__fill {
        @include bar-fill(var(--accent), 0.6s);
    }

    &__value {
        width: 38px;
        font-size: 0.75rem;
        color: var(--ink-soft);
        text-align: right;
        flex-shrink: 0;
    }
}

/* ── Result card ─────────────────────────────────────────────── */
.result-card {
    @include card;
    padding: 1.5rem;

    &__title {
        font-size: 1.1rem;
        font-weight: 500;
        color: var(--ink);
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.6rem;
    }

    &__count {
        @include pill-badge;
        font-size: 0.7rem;
        color: var(--ink-muted);
        background: var(--paper-warm);
        padding: 0.1rem 0.5rem;
    }

    &__verdict-summary {
        font-size: 0.925rem;
        line-height: 1.75;
        color: var(--ink-soft);
    }
}

/* ── Two col ─────────────────────────────────────────────────── */
.two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;

    @media (width <= 600px) { grid-template-columns: 1fr; }
}

/* ── Bullet list ─────────────────────────────────────────────── */
.bullet-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;

    li {
        font-size: 0.875rem;
        color: var(--ink-soft);
        padding-left: 1.2rem;
        position: relative;
        line-height: 1.5;

        &::before {
            content: '→';
            position: absolute;
            left: 0;
            font-size: 0.7rem;
            top: 0.15em;
        }
    }

    &--green li::before { color: var(--green); }
    &--red li::before { color: var(--red); }
}

/* ── Red flags ───────────────────────────────────────────────── */
.flags-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.flag-item {
    border-left: 3px solid;
    border-radius: 0 var(--radius) var(--radius) 0;
    padding: 0.875rem 1rem;

    &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.35rem;
    }

    &__title {
        font-size: 0.875rem;
        font-weight: 500;
    }

    &__desc {
        font-size: 0.825rem;
        color: var(--ink-soft);
        line-height: 1.5;
    }
}

/* ── Severity badge ──────────────────────────────────────────── */
.severity-badge {
    @include pill-badge;
    font-size: 0.65rem;
    padding: 0.15rem 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

/* ── Tech stack ──────────────────────────────────────────────── */
.tech-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1.5rem;
}

.tech-category {
    &__title {
        font-size: 0.65rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--ink-muted);
        margin-bottom: 0.75rem;
        border-bottom: 1px solid var(--paper-warm);
        padding-bottom: 0.4rem;
    }

    &__skills {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
}

.skill {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;

    &__header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
    }

    &__name {
        font-size: 0.82rem;
        font-weight: 500;
        color: var(--ink);
    }

    &__level {
        font-size: 0.65rem;
        color: var(--ink-muted);
    }

    &__bar {
        @include bar-track(3px);
    }

    &__bar-fill {
        @include bar-fill;
    }

    &__meta {
        display: flex;
        gap: 0.75rem;
        font-size: 0.65rem;
        color: var(--ink-muted);
    }
}

/* ── Soft skills ─────────────────────────────────────────────── */
.soft-skills-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
}

.soft-skill {
    border: 1px solid var(--paper-warm);
    border-radius: var(--radius);
    padding: 0.875rem;
    background: var(--paper);

    &__header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.4rem;
    }

    &__dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    &__name {
        font-size: 0.875rem;
        font-weight: 500;
        flex: 1;
    }

    &__confidence {
        font-size: 0.65rem;
        color: var(--ink-muted);
    }

    &__evidence {
        font-size: 0.78rem;
        color: var(--ink-muted);
        line-height: 1.5;
        font-style: italic;
    }
}

/* ── Interview questions ─────────────────────────────────────── */
.questions-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.question {
    border: 1px solid var(--paper-warm);
    border-radius: var(--radius);
    padding: 1rem 1.125rem;
    background: var(--paper);

    &__header {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        margin-bottom: 0.5rem;
    }

    &__num {
        font-size: 0.65rem;
        color: var(--ink-muted);
        min-width: 24px;
    }

    &__category {
        @include pill-badge;
        font-size: 0.65rem;
        padding: 0.15rem 0.5rem;
        text-transform: capitalize;
    }

    &__target {
        font-size: 0.65rem;
        color: var(--ink-muted);
        margin-left: auto;
    }

    &__text {
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--ink);
        line-height: 1.5;
        margin-bottom: 0.4rem;
    }

    &__rationale {
        font-size: 0.78rem;
        color: var(--ink-muted);
        line-height: 1.5;
    }
}
</style>
