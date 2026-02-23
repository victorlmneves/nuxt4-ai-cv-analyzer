<script setup lang="ts">
import { useComparison } from '~/composables/useComparison';
import type { TProvider } from '~/types/index';

interface IExtendedUser {
    role?: string;
    name?: string;
}

const { user } = useUserSession();
const extendedUser = computed(() => user.value as IExtendedUser | null);

const { result, isLoading, isHistoryLoading, error, progress, history, compare, loadComparison, reset, deleteFromHistory } =
    useComparison();

// ── Input state ───────────────────────────────────────────────────────────────
const cvTexts = ref<string[]>(['', '']);
const fileNames = ref<(string | null)[]>([null, null]);
const jobDescription = ref('');
const provider = ref<TProvider>('gemini');
const showHistory = ref(false);

const providers = ['anthropic', 'openai', 'gemini'] as const;

const providerLabel = (p: TProvider) => ({ anthropic: 'Claude', openai: 'GPT-4o', gemini: 'Gemini' })[p];

// ── CV slot management ────────────────────────────────────────────────────────
function addSlot() {
    if (cvTexts.value.length < 3) {
        cvTexts.value.push('');
        fileNames.value.push(null);
    }
}

function removeSlot(i: number) {
    if (cvTexts.value.length > 2) {
        cvTexts.value.splice(i, 1);
        fileNames.value.splice(i, 1);
    }
}

// ── File upload ───────────────────────────────────────────────────────────────
async function handleFile(file: File, index: number): Promise<void> {
    fileNames.value[index] = file.name;

    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        cvTexts.value[index] = await file.text();

        return;
    }

    const form = new FormData();

    form.append('file', file);

    try {
        const res = await fetch('/api/extract-text', { method: 'POST', body: form });

        if (!res.ok) {
            throw new Error('Failed to extract text');
        }

        const data = (await res.json()) as { text: string };

        cvTexts.value[index] = data.text;
    } catch {
        cvTexts.value[index] = '';
        fileNames.value[index] = null;

        alert('Could not extract text from this file. Please paste the CV text directly.');
    }
}

function onFileInput(e: Event, index: number): void {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];

    if (file) {
        handleFile(file, index);
    }
}

// ── Submit ────────────────────────────────────────────────────────────────────
const canSubmit = computed(() => !isLoading.value && cvTexts.value.every((t: string) => t.trim()) && jobDescription.value.trim());

async function submit(): Promise<void> {
    await compare(cvTexts.value, jobDescription.value, provider.value);
}

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

function integrationColor(ease: string): string {
    if (ease === 'easy') {
        return 'var(--green)';
    }

    if (ease === 'moderate') {
        return 'var(--amber)';
    }

    return 'var(--red)';
}

function scoreColor(s: number): string {
    if (s >= 80) {
        return 'var(--green)';
    }

    if (s >= 60) {
        return 'var(--accent)';
    }

    if (s >= 40) {
        return 'var(--amber)';
    }

    return 'var(--red)';
}

const { formatDate } = useDateFormat();

function bestScore(values: number[]): number {
    return Math.max(...values);
}

function fewestFlags(values: number[]): number {
    return Math.min(...values);
}

async function loadEntry(id: string): Promise<void> {
    showHistory.value = false;
    await loadComparison(id);
}

defineOptions({ name: 'ComparePage' });
</script>

<template>
    <div class="compare-shell">
        <!-- Header -->
        <AppHeader tag="compare">
            <NuxtLink v-if="extendedUser?.role === 'admin'" to="/admin" class="nav-btn">▤ Admin</NuxtLink>
            <NuxtLink to="/" class="nav-btn">Analyser</NuxtLink>
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

        <!-- History sidebar -->
        <Transition name="slide">
            <aside v-if="showHistory" class="history-sidebar">
                <div class="history-sidebar__header">
                    <h3 class="font-serif">Previous Comparisons</h3>
                    <button class="history-sidebar__close" @click="showHistory = false">✕</button>
                </div>
                <div v-if="isHistoryLoading" class="history-sidebar__empty">
                    <p>Loading…</p>
                </div>
                <div v-else-if="history.length === 0" class="history-sidebar__empty">
                    <p>No comparisons yet.</p>
                </div>
                <ul v-else class="history-list">
                    <li v-for="entry in history" :key="entry.id" class="history-list__item" @click="loadEntry(entry.id)">
                        <div class="history-list__item-body">
                            <strong class="history-list__candidate">{{ entry.roleName }}</strong>
                            <span class="history-list__role">
                                {{ entry.candidateCount }} candidates · {{ providerLabel(entry.provider) }}
                            </span>
                        </div>
                        <div class="history-list__item-meta">
                            <span class="history-list__date font-mono">{{ formatDate(entry.createdAt) }}</span>
                            <button class="history-list__delete" title="Delete" @click.stop="deleteFromHistory(entry.id)">✕</button>
                        </div>
                    </li>
                </ul>
            </aside>
        </Transition>
        <Transition name="fade">
            <div v-if="showHistory" class="history-sidebar__backdrop" @click="showHistory = false" />
        </Transition>

        <!-- Main -->
        <main class="compare-main">
            <!-- Error -->
            <div v-if="error && !isLoading" class="compare-error">
                <span>{{ error }}</span>
                <button class="compare-error__reset" @click="reset">Try again</button>
            </div>

            <!-- Loading -->
            <div v-if="isLoading" class="compare-loading">
                <p class="compare-loading__label">Analysing {{ cvTexts.length }} candidates…</p>
                <div class="compare-loading__bar-wrap">
                    <div class="compare-loading__bar" :style="{ width: progress + '%' }" />
                </div>
                <p class="compare-loading__note">Running {{ cvTexts.length + 1 }} AI calls — this may take a moment</p>
            </div>

            <!-- Input panel -->
            <div v-else-if="!result" class="compare-input">
                <div class="compare-input__intro">
                    <h1 class="compare-input__title font-serif">
                        Candidate
                        <br />
                        <em>Comparison</em>
                    </h1>
                    <p class="compare-input__subtitle">
                        Analyse 2–3 CVs for the same role side by side. See who has the best tech stack, fewest red flags, and would be
                        easiest to integrate.
                    </p>
                </div>

                <!-- CV slots -->
                <div class="compare-input__grid">
                    <div v-for="(_, i) in cvTexts" :key="i" class="cv-slot">
                        <div class="cv-slot__header">
                            <span class="cv-slot__label">Candidate {{ i + 1 }}</span>
                            <button v-if="cvTexts.length > 2" class="cv-slot__remove" @click="removeSlot(i)">✕</button>
                        </div>
                        <textarea v-model="cvTexts[i]" class="cv-slot__area" :placeholder="`Paste CV ${i + 1} text here…`" />
                        <div class="cv-slot__upload">
                            <label :for="`cv-file-${i}`" class="cv-slot__file-btn">Upload PDF / DOCX</label>
                            <input
                                :id="`cv-file-${i}`"
                                type="file"
                                accept=".pdf,.docx,.txt"
                                style="display: none"
                                @change="onFileInput($event, i)"
                            />
                            <span v-if="fileNames[i]" class="cv-slot__file-name">{{ fileNames[i] }}</span>
                        </div>
                    </div>
                </div>

                <button v-if="cvTexts.length < 3" class="add-cv-btn" @click="addSlot">+ Add third candidate</button>

                <!-- JD -->
                <div class="compare-input__jd input-field">
                    <label class="input-field__label">Job Description</label>
                    <textarea
                        v-model="jobDescription"
                        class="input-field__textarea"
                        placeholder="Paste the job description here…"
                        rows="5"
                    />
                </div>

                <!-- Footer: provider + submit -->
                <div class="compare-input__footer">
                    <div class="provider-picker">
                        <button
                            v-for="p in providers"
                            :key="p"
                            class="provider-picker__btn"
                            :class="{ 'provider-picker__btn--active': provider === p }"
                            @click="provider = p"
                        >
                            {{ providerLabel(p) }}
                        </button>
                    </div>
                    <button class="submit-btn" :disabled="!canSubmit" @click="submit">Compare Candidates</button>
                </div>
            </div>

            <!-- Results -->
            <div v-else class="compare-results">
                <div class="compare-results__header">
                    <div>
                        <h2 class="compare-results__title font-serif">Comparison</h2>
                        <p class="compare-results__subtitle">
                            {{ result.roleName }} · {{ providerLabel(result.provider) }} · {{ formatDate(result.comparedAt) }}
                        </p>
                    </div>
                    <div class="compare-results__actions">
                        <button class="compare-results__new-btn" @click="reset">← New comparison</button>
                    </div>
                </div>

                <!-- Recommendation -->
                <div class="recommendation-banner">
                    <div class="recommendation-banner__label">AI Recommendation</div>
                    <p class="recommendation-banner__text">{{ result.recommendation }}</p>
                    <div class="recommendation-banner__winner">★ Recommended: {{ result.winner }}</div>
                </div>

                <!-- Comparison table -->
                <div class="compare-table-wrap">
                    <table class="compare-table">
                        <thead>
                            <tr>
                                <th class="compare-table__row-label">Metric</th>
                                <th v-for="(c, i) in result.candidates" :key="i">
                                    {{ c.name }}
                                    <span v-if="c.name === result.winner" class="compare-table__winner-badge">★ Top Pick</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Overall score -->
                            <tr>
                                <td class="compare-table__row-label">Overall</td>
                                <td
                                    v-for="(c, i) in result.candidates"
                                    :key="i"
                                    :class="{
                                        'compare-table__best': c.overallScore === bestScore(result.candidates.map((x) => x.overallScore)),
                                    }"
                                >
                                    <span class="compare-table__score" :style="{ color: scoreColor(c.overallScore) }">
                                        {{ c.overallScore }}
                                    </span>
                                </td>
                            </tr>
                            <!-- Technical -->
                            <tr>
                                <td class="compare-table__row-label">Technical</td>
                                <td
                                    v-for="(c, i) in result.candidates"
                                    :key="i"
                                    :class="{
                                        'compare-table__best':
                                            c.technicalScore === bestScore(result.candidates.map((x) => x.technicalScore)),
                                    }"
                                >
                                    <span class="compare-table__score" :style="{ color: scoreColor(c.technicalScore) }">
                                        {{ c.technicalScore }}
                                    </span>
                                </td>
                            </tr>
                            <!-- Experience -->
                            <tr>
                                <td class="compare-table__row-label">Experience</td>
                                <td
                                    v-for="(c, i) in result.candidates"
                                    :key="i"
                                    :class="{
                                        'compare-table__best':
                                            c.experienceScore === bestScore(result.candidates.map((x) => x.experienceScore)),
                                    }"
                                >
                                    <span class="compare-table__score" :style="{ color: scoreColor(c.experienceScore) }">
                                        {{ c.experienceScore }}
                                    </span>
                                </td>
                            </tr>
                            <!-- Soft skills -->
                            <tr>
                                <td class="compare-table__row-label">Soft Skills</td>
                                <td
                                    v-for="(c, i) in result.candidates"
                                    :key="i"
                                    :class="{
                                        'compare-table__best':
                                            c.softSkillsScore === bestScore(result.candidates.map((x) => x.softSkillsScore)),
                                    }"
                                >
                                    <span class="compare-table__score" :style="{ color: scoreColor(c.softSkillsScore) }">
                                        {{ c.softSkillsScore }}
                                    </span>
                                </td>
                            </tr>
                            <!-- Verdict -->
                            <tr>
                                <td class="compare-table__row-label">Verdict</td>
                                <td v-for="(c, i) in result.candidates" :key="i">
                                    <span
                                        class="compare-table__pill"
                                        :style="{ background: verdictColor(c.verdict) + '20', color: verdictColor(c.verdict) }"
                                    >
                                        {{ c.verdict }}
                                    </span>
                                </td>
                            </tr>
                            <!-- Red flags -->
                            <tr>
                                <td class="compare-table__row-label">Red Flags</td>
                                <td
                                    v-for="(c, i) in result.candidates"
                                    :key="i"
                                    :class="{
                                        'compare-table__best': c.redFlagCount === fewestFlags(result.candidates.map((x) => x.redFlagCount)),
                                    }"
                                >
                                    <span
                                        :style="{
                                            color:
                                                c.redFlagCount === 0 ? 'var(--green)' : c.redFlagCount <= 2 ? 'var(--amber)' : 'var(--red)',
                                        }"
                                    >
                                        {{ c.redFlagCount }}
                                    </span>
                                </td>
                            </tr>
                            <!-- Integration ease -->
                            <tr>
                                <td class="compare-table__row-label">Integration</td>
                                <td v-for="(c, i) in result.candidates" :key="i">
                                    <div class="compare-table__ease">
                                        <span class="compare-table__ease-label" :style="{ color: integrationColor(c.integrationEase) }">
                                            {{ c.integrationEase }}
                                        </span>
                                        <span class="compare-table__ease-rationale">{{ c.integrationRationale }}</span>
                                    </div>
                                </td>
                            </tr>
                            <!-- Top strengths -->
                            <tr>
                                <td class="compare-table__row-label">Strengths</td>
                                <td v-for="(c, i) in result.candidates" :key="i">
                                    <div class="compare-table__tag-list">
                                        <span v-for="s in c.topStrengths" :key="s" class="compare-table__tag">{{ s }}</span>
                                    </div>
                                </td>
                            </tr>
                            <!-- Top gaps -->
                            <tr>
                                <td class="compare-table__row-label">Gaps</td>
                                <td v-for="(c, i) in result.candidates" :key="i">
                                    <div class="compare-table__tag-list">
                                        <span v-for="g in c.topGaps" :key="g" class="compare-table__tag compare-table__tag--gap">
                                            {{ g }}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                            <!-- Tech highlights -->
                            <tr>
                                <td class="compare-table__row-label">Tech Stack</td>
                                <td v-for="(c, i) in result.candidates" :key="i">
                                    <div class="compare-table__tag-list">
                                        <span v-for="t in c.techStackHighlights" :key="t" class="compare-table__tag">{{ t }}</span>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Ranked order -->
                <div class="recommendation-banner">
                    <div class="recommendation-banner__label">Ranking</div>
                    <p class="recommendation-banner__text">
                        <span v-for="(name, i) in result.rankedOrder" :key="name">
                            <strong>#{{ i + 1 }}</strong>
                            {{ name }}
                            <span v-if="i < result.rankedOrder.length - 1">&nbsp;→&nbsp;</span>
                        </span>
                    </p>
                </div>
            </div>
        </main>
    </div>
</template>

<style lang="scss">
@use './compare.scss';
</style>
