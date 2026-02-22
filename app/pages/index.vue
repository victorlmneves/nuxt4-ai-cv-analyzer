<script setup lang="ts">
import { useAnalyser } from '~/composables/useAnalyser';
import type { TProvider, IHistoryEntry, ISkill, TQuestionCategory } from '~/composables/types';

// ── Composable ────────────────────────────────────────────────────────────────
const {
    result,
    isLoading,
    error,
    progress,
    history,
    analyse,
    reset,
    restoreFromHistory,
    deleteFromHistory,
    clearHistory,
    providerLabel,
    fitScoreColor,
} = useAnalyser();

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
        const response = await $fetch<{ text: string }>('/api/extract-text', {
            method: 'POST',
            body: form,
        });

        cvText.value = response.text;
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
    if (verdict === 'strong fit') return 'var(--green)';
    if (verdict === 'good fit') return 'var(--accent)';
    if (verdict === 'partial fit') return 'var(--amber)';

    return 'var(--red)';
}

function hasAnyTechStack(): boolean {
    if (!result.value) return false;

    const { techStack } = result.value;

    return Object.values(techStack).some((arr) => arr.length > 0);
}

function techStackEntries(): [string, ISkill[]][] {
    if (!result.value) return [];

    return Object.entries(result.value.techStack).filter(([, skills]) => skills.length > 0) as [string, ISkill[]][];
}

function loadEntry(entry: IHistoryEntry): void {
    restoreFromHistory(entry);
    showHistory.value = false;
}
</script>

<template>
    <div class="app-shell">
        <!-- ── Header ──────────────────────────────────────────────── -->
        <header class="app-header">
            <div class="header-inner">
                <div class="brand">
                    <span class="brand-mark font-serif">CV</span>
                    <span class="brand-name font-serif">Analyst</span>
                    <span class="brand-tag font-mono">by recruitr</span>
                </div>

                <nav class="header-nav">
                    <button
                        class="nav-btn"
                        :class="{ active: showHistory }"
                        @click="showHistory = !showHistory"
                    >
                        History
                        <span v-if="history.length > 0" class="badge">{{ history.length }}</span>
                    </button>
                </nav>
            </div>
        </header>

        <!-- ── History sidebar ────────────────────────────────────── -->
        <Transition name="slide">
            <aside v-if="showHistory" class="history-sidebar">
                <div class="sidebar-header">
                    <h3 class="font-serif">Previous Analyses</h3>

                    <div class="sidebar-actions">
                        <button v-if="history.length > 0" class="text-btn danger" @click="clearHistory">
                            Clear all
                        </button>
                        <button class="close-btn" @click="showHistory = false">✕</button>
                    </div>
                </div>

                <div v-if="history.length === 0" class="sidebar-empty">
                    <p>No analyses yet.</p>
                </div>

                <ul v-else class="history-list">
                    <li
                        v-for="entry in history"
                        :key="entry.id"
                        class="history-item"
                        @click="loadEntry(entry)"
                    >
                        <div class="history-item-main">
                            <strong class="history-candidate">{{ entry.candidateName }}</strong>
                            <span class="history-role">{{ entry.roleName }}</span>
                        </div>

                        <div class="history-item-meta">
                            <span
                                class="score-pill font-mono"
                                :style="{ color: fitScoreColor(entry.result.fitScore.overall) }"
                            >
                                {{ entry.result.fitScore.overall }}%
                            </span>
                            <span class="history-date font-mono">{{ formatDate(entry.createdAt) }}</span>
                            <button
                                class="delete-btn"
                                @click.stop="deleteFromHistory(entry.id)"
                            >
                                ✕
                            </button>
                        </div>
                    </li>
                </ul>
            </aside>
        </Transition>

        <Transition name="fade">
            <div v-if="showHistory" class="sidebar-backdrop" @click="showHistory = false" />
        </Transition>

        <!-- ── Main ───────────────────────────────────────────────── -->
        <main class="main-content">

            <!-- Input panel — shown when no result -->
            <section v-if="!result && !isLoading" class="input-panel animate-fade-up">
                <div class="panel-intro">
                    <h1 class="panel-title font-serif">
                        CV Intelligence<br />
                        <em>for modern recruiters</em>
                    </h1>
                    <p class="panel-subtitle">
                        Paste a CV and a job description. Get fit scores, tech stack analysis,
                        red flags, and tailored interview questions — in seconds.
                    </p>
                </div>

                <div class="input-grid">
                    <!-- CV input -->
                    <div class="input-card">
                        <div class="input-card-header">
                            <label class="input-label">Candidate CV</label>
                            <div class="input-tabs">
                                <button
                                    class="tab-btn"
                                    :class="{ active: cvInputMode === 'paste' }"
                                    @click="cvInputMode = 'paste'"
                                >
                                    Paste
                                </button>
                                <button
                                    class="tab-btn"
                                    :class="{ active: cvInputMode === 'upload' }"
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
                            :class="{ 'drag-over': isDraggingOver }"
                            @dragover.prevent="isDraggingOver = true"
                            @dragleave="isDraggingOver = false"
                            @drop.prevent="onDrop"
                        >
                            <input
                                id="cv-file"
                                type="file"
                                accept=".txt,.pdf,.docx"
                                class="file-input"
                                @change="onFileInput"
                            />

                            <label for="cv-file" class="dropzone-label">
                                <span class="dropzone-icon">↑</span>
                                <span v-if="uploadedFileName" class="dropzone-filename font-mono">
                                    {{ uploadedFileName }}
                                </span>
                                <span v-else>
                                    Drop a file or <u>browse</u><br />
                                    <small>.txt · .pdf · .docx</small>
                                </span>
                            </label>
                        </div>
                    </div>

                    <!-- JD input -->
                    <div class="input-card">
                        <div class="input-card-header">
                            <label class="input-label">Job Description</label>
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
                    <span class="provider-label">AI provider</span>

                    <div class="provider-toggle">
                        <button
                            v-for="p in (['anthropic', 'openai', 'gemini'] as TProvider[])"
                            :key="p"
                            class="provider-btn"
                            :class="{ active: provider === p }"
                            @click="provider = p"
                        >
                            {{ providerLabel(p) }}
                        </button>
                    </div>

                    <button
                        class="submit-btn"
                        :disabled="!cvText.trim() || !jobDescription.trim()"
                        @click="submit"
                    >
                        Analyse candidate →
                    </button>
                </div>

                <p v-if="error" class="error-msg">{{ error }}</p>
            </section>

            <!-- Loading state -->
            <section v-if="isLoading" class="loading-panel animate-fade-in">
                <div class="loading-inner">
                    <div class="loading-icon font-serif">⟳</div>
                    <h2 class="loading-title font-serif">Analysing candidate…</h2>
                    <p class="loading-sub">Reading CV, scoring fit, generating questions</p>

                    <div class="progress-bar">
                        <div class="progress-fill" :style="{ width: progress + '%' }" />
                    </div>

                    <span class="progress-label font-mono">{{ Math.round(progress) }}%</span>
                </div>
            </section>

            <!-- Results -->
            <section v-if="result && !isLoading" class="results-panel animate-fade-up">

                <!-- Results header -->
                <div class="results-header">
                    <button class="back-btn" @click="reset">← New analysis</button>

                    <div class="results-meta">
                        <span class="meta-provider font-mono">{{ providerLabel(result.provider) }}</span>
                        <span class="meta-date font-mono">{{ formatDate(result.analysedAt) }}</span>
                    </div>
                </div>

                <!-- Candidate + fit score hero -->
                <div class="hero-card">
                    <div class="hero-left">
                        <div class="candidate-avatar font-serif">
                            {{ result.candidate.name?.charAt(0) ?? '?' }}
                        </div>

                        <div class="candidate-info">
                            <h2 class="candidate-name font-serif">
                                {{ result.candidate.name ?? 'Unknown Candidate' }}
                            </h2>
                            <p class="candidate-role">{{ result.candidate.currentRole }}</p>

                            <div class="candidate-chips">
                                <span v-if="result.candidate.totalExperience" class="chip">
                                    {{ result.candidate.totalExperience }}
                                </span>
                                <span v-if="result.candidate.location" class="chip">
                                    {{ result.candidate.location }}
                                </span>
                                <span v-if="result.candidate.education" class="chip">
                                    {{ result.candidate.education }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="hero-score">
                        <div
                            class="score-ring"
                            :style="{ '--score-color': fitScoreColor(result.fitScore.overall) }"
                        >
                            <span class="score-number font-serif">{{ result.fitScore.overall }}</span>
                            <span class="score-unit font-mono">/ 100</span>
                        </div>

                        <span
                            class="verdict-badge"
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
                        class="score-bar-row"
                    >
                        <span class="score-bar-label">{{ label }}</span>
                        <div class="score-bar-track">
                            <div
                                class="score-bar-fill"
                                :style="{
                                    width: result.fitScore[key as 'technical' | 'experience' | 'softSkills'] + '%',
                                    background: fitScoreColor(result.fitScore[key as 'technical' | 'experience' | 'softSkills']),
                                }"
                            />
                        </div>
                        <span class="score-bar-value font-mono">
                            {{ result.fitScore[key as 'technical' | 'experience' | 'softSkills'] }}%
                        </span>
                    </div>
                </div>

                <!-- Summary -->
                <div class="result-card">
                    <h3 class="card-title font-serif">Verdict</h3>
                    <p class="verdict-summary">{{ result.fitScore.summary }}</p>
                </div>

                <!-- Strengths & Gaps -->
                <div class="two-col">
                    <div class="result-card">
                        <h3 class="card-title font-serif">Strengths</h3>
                        <ul class="bullet-list green">
                            <li v-for="(s, i) in result.strengths" :key="i">{{ s }}</li>
                        </ul>
                    </div>

                    <div class="result-card">
                        <h3 class="card-title font-serif">Gaps</h3>
                        <ul class="bullet-list red">
                            <li v-for="(g, i) in result.gaps" :key="i">{{ g }}</li>
                        </ul>
                    </div>
                </div>

                <!-- Red flags -->
                <div v-if="result.redFlags.length > 0" class="result-card">
                    <h3 class="card-title font-serif">
                        Red Flags
                        <span class="card-count font-mono">{{ result.redFlags.length }}</span>
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
                            <div class="flag-header">
                                <strong class="flag-title">{{ flag.title }}</strong>
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
                            <p class="flag-desc">{{ flag.description }}</p>
                        </div>
                    </div>
                </div>

                <!-- Tech stack -->
                <div v-if="hasAnyTechStack()" class="result-card">
                    <h3 class="card-title font-serif">Tech Stack</h3>

                    <div class="tech-grid">
                        <div
                            v-for="([category, skills]) in techStackEntries()"
                            :key="category"
                            class="tech-category"
                        >
                            <h4 class="tech-category-title font-mono">{{ category }}</h4>

                            <div class="skill-list">
                                <div v-for="(skill, i) in skills" :key="i" class="skill-item">
                                    <div class="skill-header">
                                        <span class="skill-name">{{ skill.name }}</span>
                                        <span class="skill-level font-mono">{{ skill.level }}</span>
                                    </div>
                                    <div class="skill-bar">
                                        <div
                                            class="skill-bar-fill"
                                            :style="{ width: skillLevelWidth(skill.level) }"
                                        />
                                    </div>
                                    <div v-if="skill.yearsOfExperience || skill.lastUsed" class="skill-meta font-mono">
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
                    <h3 class="card-title font-serif">Soft Skills</h3>

                    <div class="soft-skills-grid">
                        <div
                            v-for="(skill, i) in result.softSkills"
                            :key="i"
                            class="soft-skill-item"
                        >
                            <div class="soft-skill-header">
                                <span
                                    class="confidence-dot"
                                    :style="{ background: confidenceDot(skill.confidence) }"
                                />
                                <strong class="soft-skill-name">{{ skill.name }}</strong>
                                <span class="soft-confidence font-mono">{{ skill.confidence }}</span>
                            </div>
                            <p class="soft-evidence">{{ skill.evidence }}</p>
                        </div>
                    </div>
                </div>

                <!-- Interview questions -->
                <div v-if="result.interviewQuestions.length > 0" class="result-card">
                    <h3 class="card-title font-serif">
                        Interview Questions
                        <span class="card-count font-mono">{{ result.interviewQuestions.length }}</span>
                    </h3>

                    <div class="questions-list">
                        <div
                            v-for="(q, i) in result.interviewQuestions"
                            :key="i"
                            class="question-item"
                        >
                            <div class="question-header">
                                <span class="question-num font-mono">{{ String(i + 1).padStart(2, '0') }}</span>
                                <span
                                    class="question-category font-mono"
                                    :style="{
                                        color: categoryColor(q.category),
                                        background: categoryBg(q.category),
                                    }"
                                >
                                    {{ q.category }}
                                </span>
                                <span class="question-target font-mono">{{ q.targetSkill }}</span>
                            </div>
                            <p class="question-text">{{ q.question }}</p>
                            <p class="question-rationale">{{ q.rationale }}</p>
                        </div>
                    </div>
                </div>

            </section>
        </main>
    </div>
</template>

<style scoped>
/* ── Shell ───────────────────────────────────────────────────── */
.app-shell {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

/* ── Header ──────────────────────────────────────────────────── */
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
    letter-spacing: -0.02em;
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
}

/* ── Nav ─────────────────────────────────────────────────────── */
.header-nav {
    display: flex;
    gap: 0.5rem;
}

.nav-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.9rem;
    border: 1px solid var(--paper-dark);
    border-radius: var(--radius);
    background: transparent;
    color: var(--ink-soft);
    font-size: 0.82rem;
    cursor: pointer;
    transition: all 0.15s;
}

.nav-btn:hover,
.nav-btn.active {
    border-color: var(--ink-soft);
    color: var(--ink);
}

.badge {
    background: var(--accent);
    color: #fff;
    font-size: 0.65rem;
    font-family: 'DM Mono', monospace;
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
    line-height: 1.4;
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
}

.sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--paper-dark);
}

.sidebar-header h3 {
    font-size: 1rem;
    font-weight: 500;
}

.sidebar-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.text-btn {
    background: none;
    border: none;
    font-size: 0.78rem;
    cursor: pointer;
    color: var(--ink-muted);
    padding: 0;
}

.text-btn.danger:hover {
    color: var(--red);
}

.close-btn {
    background: none;
    border: none;
    font-size: 1rem;
    cursor: pointer;
    color: var(--ink-muted);
    line-height: 1;
}

.close-btn:hover {
    color: var(--ink);
}

.sidebar-empty {
    padding: 2rem 1.5rem;
    color: var(--ink-muted);
    font-size: 0.875rem;
}

.history-list {
    list-style: none;
    overflow-y: auto;
    flex: 1;
}

.history-item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--paper-warm);
    cursor: pointer;
    transition: background 0.15s;
}

.history-item:hover {
    background: var(--paper-warm);
}

.history-item-main {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    overflow: hidden;
}

.history-candidate {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.history-role {
    font-size: 0.75rem;
    color: var(--ink-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.history-item-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
}

.score-pill {
    font-size: 0.75rem;
    font-weight: 500;
}

.history-date {
    font-size: 0.7rem;
    color: var(--ink-muted);
}

.delete-btn {
    background: none;
    border: none;
    font-size: 0.75rem;
    cursor: pointer;
    color: var(--ink-muted);
    opacity: 0;
    transition: opacity 0.15s;
}

.history-item:hover .delete-btn {
    opacity: 1;
}

.delete-btn:hover {
    color: var(--red);
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

.sidebar-backdrop {
    position: fixed;
    inset: 0;
    z-index: 150;
    background: rgba(15, 14, 13, 0.2);
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
}

.panel-intro {
    max-width: 600px;
}

.panel-title {
    font-size: 2.5rem;
    font-weight: 300;
    line-height: 1.2;
    color: var(--ink);
    margin-bottom: 0.75rem;
}

.panel-title em {
    color: var(--accent);
    font-style: italic;
}

.panel-subtitle {
    color: var(--ink-muted);
    font-size: 0.95rem;
    line-height: 1.7;
}

/* ── Input grid ──────────────────────────────────────────────── */
.input-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
}

@media (max-width: 700px) {
    .input-grid {
        grid-template-columns: 1fr;
    }
}

.input-card {
    background: #fff;
    border: 1px solid var(--paper-dark);
    border-radius: var(--radius);
    overflow: hidden;
    box-shadow: var(--shadow);
}

.input-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--paper-warm);
}

.input-label {
    font-size: 0.78rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-muted);
}

.input-tabs {
    display: flex;
    gap: 0.25rem;
}

.tab-btn {
    padding: 0.25rem 0.6rem;
    border: 1px solid transparent;
    border-radius: var(--radius);
    background: transparent;
    font-size: 0.75rem;
    cursor: pointer;
    color: var(--ink-muted);
    transition: all 0.15s;
}

.tab-btn.active {
    border-color: var(--paper-dark);
    color: var(--ink);
    background: var(--paper-warm);
}

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
}

.text-input::placeholder {
    color: var(--ink-muted);
}

/* ── Dropzone ────────────────────────────────────────────────── */
.dropzone {
    position: relative;
    min-height: 220px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
}

.dropzone.drag-over {
    background: var(--accent-pale);
}

.file-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
}

.dropzone-label {
    text-align: center;
    color: var(--ink-muted);
    font-size: 0.875rem;
    line-height: 1.8;
    cursor: pointer;
    pointer-events: none;
}

.dropzone-icon {
    display: block;
    font-size: 2rem;
    margin-bottom: 0.5rem;
    color: var(--paper-dark);
}

.dropzone-filename {
    font-size: 0.75rem;
    color: var(--green);
}

/* ── Provider row ────────────────────────────────────────────── */
.provider-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.provider-label {
    font-size: 0.78rem;
    color: var(--ink-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.provider-toggle {
    display: flex;
    border: 1px solid var(--paper-dark);
    border-radius: var(--radius);
    overflow: hidden;
}

.provider-btn {
    padding: 0.5rem 1rem;
    border: none;
    background: transparent;
    font-size: 0.82rem;
    cursor: pointer;
    color: var(--ink-muted);
    transition: all 0.15s;
    border-right: 1px solid var(--paper-dark);
}

.provider-btn:last-child {
    border-right: none;
}

.provider-btn.active {
    background: var(--ink);
    color: var(--paper);
}

.submit-btn {
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
}

.submit-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
}

.submit-btn:not(:disabled):hover {
    opacity: 0.88;
}

.error-msg {
    color: var(--red);
    font-size: 0.875rem;
    padding: 0.75rem 1rem;
    background: var(--red-pale);
    border-radius: var(--radius);
    border: 1px solid var(--red);
}

/* ── Loading ─────────────────────────────────────────────────── */
.loading-panel {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 50vh;
}

.loading-inner {
    text-align: center;
    max-width: 360px;
    width: 100%;
}

.loading-icon {
    font-size: 2.5rem;
    color: var(--accent);
    display: block;
    margin-bottom: 1rem;
    animation: pulse 2s infinite;
}

.loading-title {
    font-size: 1.5rem;
    font-weight: 300;
    margin-bottom: 0.4rem;
}

.loading-sub {
    font-size: 0.82rem;
    color: var(--ink-muted);
    margin-bottom: 1.5rem;
}

.progress-bar {
    height: 3px;
    background: var(--paper-dark);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 0.5rem;
}

.progress-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 2px;
    transition: width 0.3s ease;
}

.progress-label {
    font-size: 0.7rem;
    color: var(--ink-muted);
}

/* ── Results ─────────────────────────────────────────────────── */
.results-panel {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.results-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.back-btn {
    background: none;
    border: none;
    font-size: 0.875rem;
    color: var(--ink-muted);
    cursor: pointer;
    padding: 0;
    transition: color 0.15s;
}

.back-btn:hover {
    color: var(--ink);
}

.results-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.75rem;
    color: var(--ink-muted);
}

/* ── Hero card ───────────────────────────────────────────────── */
.hero-card {
    background: #fff;
    border: 1px solid var(--paper-dark);
    border-radius: var(--radius);
    padding: 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    box-shadow: var(--shadow);
}

.hero-left {
    display: flex;
    align-items: center;
    gap: 1.5rem;
}

.candidate-avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: var(--paper-warm);
    border: 2px solid var(--paper-dark);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: 500;
    color: var(--ink-soft);
    flex-shrink: 0;
}

.candidate-name {
    font-size: 1.4rem;
    font-weight: 500;
    color: var(--ink);
    margin-bottom: 0.2rem;
}

.candidate-role {
    font-size: 0.875rem;
    color: var(--ink-soft);
    margin-bottom: 0.6rem;
}

.candidate-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
}

.chip {
    font-size: 0.7rem;
    padding: 0.2rem 0.6rem;
    background: var(--paper-warm);
    border: 1px solid var(--paper-dark);
    border-radius: 999px;
    color: var(--ink-muted);
    font-family: 'DM Mono', monospace;
}

/* ── Score ring ──────────────────────────────────────────────── */
.hero-score {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
    flex-shrink: 0;
}

.score-ring {
    width: 90px;
    height: 90px;
    border-radius: 50%;
    border: 4px solid var(--score-color, var(--green));
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.score-number {
    font-size: 1.75rem;
    font-weight: 500;
    line-height: 1;
    color: var(--ink);
}

.score-unit {
    font-size: 0.6rem;
    color: var(--ink-muted);
}

.verdict-badge {
    font-size: 0.72rem;
    font-weight: 500;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    text-transform: capitalize;
    font-family: 'DM Mono', monospace;
}

/* ── Score breakdown ─────────────────────────────────────────── */
.score-breakdown {
    background: #fff;
    border: 1px solid var(--paper-dark);
    border-radius: var(--radius);
    padding: 1.25rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    box-shadow: var(--shadow);
}

.score-bar-row {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.score-bar-label {
    width: 90px;
    font-size: 0.8rem;
    color: var(--ink-soft);
    flex-shrink: 0;
}

.score-bar-track {
    flex: 1;
    height: 6px;
    background: var(--paper-warm);
    border-radius: 3px;
    overflow: hidden;
}

.score-bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.6s ease;
}

.score-bar-value {
    width: 38px;
    font-size: 0.75rem;
    color: var(--ink-soft);
    text-align: right;
    flex-shrink: 0;
}

/* ── Result cards ────────────────────────────────────────────── */
.result-card {
    background: #fff;
    border: 1px solid var(--paper-dark);
    border-radius: var(--radius);
    padding: 1.5rem;
    box-shadow: var(--shadow);
}

.card-title {
    font-size: 1.1rem;
    font-weight: 500;
    color: var(--ink);
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
}

.card-count {
    font-size: 0.7rem;
    color: var(--ink-muted);
    background: var(--paper-warm);
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
}

.verdict-summary {
    font-size: 0.925rem;
    line-height: 1.75;
    color: var(--ink-soft);
}

/* ── Two col ─────────────────────────────────────────────────── */
.two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
}

@media (max-width: 600px) {
    .two-col {
        grid-template-columns: 1fr;
    }
}

/* ── Bullet list ─────────────────────────────────────────────── */
.bullet-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}

.bullet-list li {
    font-size: 0.875rem;
    color: var(--ink-soft);
    padding-left: 1.2rem;
    position: relative;
    line-height: 1.5;
}

.bullet-list li::before {
    content: '→';
    position: absolute;
    left: 0;
    font-size: 0.7rem;
    top: 0.15em;
}

.bullet-list.green li::before {
    color: var(--green);
}

.bullet-list.red li::before {
    color: var(--red);
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
}

.flag-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.35rem;
}

.flag-title {
    font-size: 0.875rem;
    font-weight: 500;
}

.severity-badge {
    font-size: 0.65rem;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.flag-desc {
    font-size: 0.825rem;
    color: var(--ink-soft);
    line-height: 1.5;
}

/* ── Tech stack ──────────────────────────────────────────────── */
.tech-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1.5rem;
}

.tech-category-title {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ink-muted);
    margin-bottom: 0.75rem;
    border-bottom: 1px solid var(--paper-warm);
    padding-bottom: 0.4rem;
}

.skill-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.skill-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.skill-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
}

.skill-name {
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--ink);
}

.skill-level {
    font-size: 0.65rem;
    color: var(--ink-muted);
}

.skill-bar {
    height: 3px;
    background: var(--paper-warm);
    border-radius: 2px;
    overflow: hidden;
}

.skill-bar-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 2px;
    transition: width 0.5s ease;
}

.skill-meta {
    display: flex;
    gap: 0.75rem;
    font-size: 0.65rem;
    color: var(--ink-muted);
}

/* ── Soft skills ─────────────────────────────────────────────── */
.soft-skills-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
}

.soft-skill-item {
    border: 1px solid var(--paper-warm);
    border-radius: var(--radius);
    padding: 0.875rem;
    background: var(--paper);
}

.soft-skill-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.4rem;
}

.confidence-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
}

.soft-skill-name {
    font-size: 0.875rem;
    font-weight: 500;
    flex: 1;
}

.soft-confidence {
    font-size: 0.65rem;
    color: var(--ink-muted);
}

.soft-evidence {
    font-size: 0.78rem;
    color: var(--ink-muted);
    line-height: 1.5;
    font-style: italic;
}

/* ── Interview questions ─────────────────────────────────────── */
.questions-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.question-item {
    border: 1px solid var(--paper-warm);
    border-radius: var(--radius);
    padding: 1rem 1.125rem;
    background: var(--paper);
}

.question-header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.5rem;
}

.question-num {
    font-size: 0.65rem;
    color: var(--ink-muted);
    min-width: 24px;
}

.question-category {
    font-size: 0.65rem;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    text-transform: capitalize;
}

.question-target {
    font-size: 0.65rem;
    color: var(--ink-muted);
    margin-left: auto;
}

.question-text {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--ink);
    line-height: 1.5;
    margin-bottom: 0.4rem;
}

.question-rationale {
    font-size: 0.78rem;
    color: var(--ink-muted);
    line-height: 1.5;
}
</style>
