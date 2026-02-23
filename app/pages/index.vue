<script setup lang="ts">
import { useAnalyser } from '~/composables/useAnalyser';
import { useJDGenerator } from '~/composables/useJDGenerator';
import { usePDFExport } from '~/composables/usePDFExport';
import type { TProvider, IHistoryEntry, ISkill } from '~/types/index';

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

function confidenceDot(confidence: 'low' | 'medium' | 'high'): string {
    const colors = { low: 'var(--ink-muted)', medium: 'var(--accent)', high: 'var(--green)' };

    return colors[confidence];
}

import { useDateFormat } from '~/composables/useDateFormat';
const { formatDate } = useDateFormat();

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

// ── JD Generator integration ──────────────────────────────────────────────────
const { pendingJD } = useJDGenerator();

onMounted(() => {
    if (pendingJD.value) {
        jobDescription.value = pendingJD.value;
        pendingJD.value = '';
    }
});

// ── PDF export ────────────────────────────────────────────────────────────────
const { isExporting, exportAnalysis } = usePDFExport();

defineOptions({
    name: 'AnalysisPage',
});
</script>

<template>
    <div class="app-shell">
        <!-- ── Header ──────────────────────────────────────────────── -->
        <AppHeader>
            <NuxtLink v-if="extendedUser?.role === 'admin'" to="/admin" class="nav-btn">▤ Admin</NuxtLink>
            <NuxtLink to="/pipeline" class="nav-btn">Pipeline</NuxtLink>
            <NuxtLink to="/compare" class="nav-btn">Compare CVs</NuxtLink>
            <NuxtLink to="/jd-generator" class="nav-btn">JD Generator</NuxtLink>

            <button class="nav-btn" :class="{ 'nav-btn--active': showHistory }" @click="showHistory = !showHistory">
                History
                <span v-if="history.length > 0" class="nav-btn__badge">{{ history.length }}</span>
            </button>

            <div class="user-chip">
                <span class="user-chip__name">{{ extendedUser?.name?.split(' ')[0] }}</span>
                <a href="/auth/logout" class="user-chip__signout" title="Sign out">⎋</a>
            </div>
        </AppHeader>

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
                            <button class="history-list__delete" title="Delete analysis" @click.stop="deleteFromHistory(entry.id)">
                                ✕
                            </button>
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
                                <button
                                    class="tab-btn"
                                    :class="{ 'tab-btn--active': cvInputMode === 'paste' }"
                                    @click="cvInputMode = 'paste'"
                                >
                                    Paste
                                </button>
                                <button
                                    class="tab-btn"
                                    :class="{ 'tab-btn--active': cvInputMode === 'upload' }"
                                    @click="cvInputMode = 'upload'"
                                >
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

                    <div class="results-panel__header-actions">
                        <button class="nav-btn" :disabled="isExporting" @click="exportAnalysis(result)">
                            {{ isExporting ? 'Exporting…' : '↓ Export PDF' }}
                        </button>
                    </div>

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
                        <RedFlagItem v-for="(flag, i) in result.redFlags" :key="i" :flag="flag" />
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
                        <InterviewQuestion v-for="(q, i) in result.interviewQuestions" :key="i" :question="q" :index="i" />
                    </div>
                </div>
            </section>
        </main>
    </div>
</template>

<style scoped lang="scss" src="./index.scss"></style>
