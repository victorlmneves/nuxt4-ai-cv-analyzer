import type { IAnalysisInput, IAnalysisResult, IHistoryEntry, TProvider } from '../types';

// ── State ─────────────────────────────────────────────────────────────────────
const result = ref<IAnalysisResult | null>(null);
const isLoading = ref(false);
const isHistoryLoading = ref(false);
const error = ref<string | null>(null);
const progress = ref(0);
const history = ref<IHistoryEntry[]>([]);

// ── History — backed by Supabase via Drizzle API routes ───────────────────────
async function loadHistory(): Promise<void> {
    isHistoryLoading.value = true;

    try {
        const rows = await $fetch<IHistoryEntry[]>('/api/analyses');

        history.value = rows;
    } catch (err) {
        console.error('[history] load failed:', err);

        history.value = [];
    } finally {
        isHistoryLoading.value = false;
    }
}

async function deleteFromHistory(id: string): Promise<void> {
    try {
        await $fetch(`/api/analyses/${id}`, { method: 'DELETE' });

        history.value = history.value.filter((e) => e.id !== id);
    } catch (err) {
        console.error('[history] delete failed:', err);
    }
}

async function clearHistory(): Promise<void> {
    // Archive all visible entries in parallel
    await Promise.allSettled(
        history.value.map((e) => $fetch(`/api/analyses/${e.id}`, { method: 'DELETE' })),
    );

    history.value = [];
}

// ── Progress simulation ───────────────────────────────────────────────────────
let progressTimer: ReturnType<typeof setInterval> | null = null;

function startProgress(): void {
    progress.value = 0;
    progressTimer = setInterval(() => {
        if (progress.value < 85) {
            const increment = progress.value < 40 ? 3 : progress.value < 70 ? 1.5 : 0.5;

            progress.value = Math.min(85, progress.value + increment);
        }
    }, 120);
}

function finishProgress(): void {
    if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
    }

    progress.value = 100;
}

function resetProgress(): void {
    if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
    }

    progress.value = 0;
}

// ── Analyse ───────────────────────────────────────────────────────────────────
async function analyse(input: IAnalysisInput): Promise<void> {
    isLoading.value = true;
    error.value = null;
    result.value = null;
    startProgress();

    try {
        const response = await $fetch<IAnalysisResult & { id: string }>('/api/analyse', {
            method: 'POST',
            body: input,
        });

        finishProgress();
        result.value = response;

        // Optimistically prepend the summary row to history
        // The full result is already in `result` for the current view
        const entry: IHistoryEntry = {
            id: response.id,
            result: response,
            candidateName: response.candidate.name ?? 'Unknown Candidate',
            candidateRole: response.candidate.currentRole ?? null,
            roleName: extractRoleName(input.jobDescription),
            overallScore: response.fitScore.overall,
            technicalScore: response.fitScore.technical,
            experienceScore: response.fitScore.experience,
            softSkillsScore: response.fitScore.softSkills,
            verdict: response.fitScore.verdict,
            redFlagCount: response.redFlags.length,
            provider: response.provider,
            createdAt: response.analysedAt,
        };

        history.value.unshift(entry);
    } catch (err: unknown) {
        finishProgress();

        if (err instanceof Error) {
            error.value = err.message;
        } else {
            error.value = 'An unexpected error occurred. Please try again.';
        }
    } finally {
        isLoading.value = false;
    }
}

// ── Load a full analysis from the API ─────────────────────────────────────────
async function loadAnalysis(id: string): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
        const row = await $fetch<{ result: IAnalysisResult }>(`/api/analyses/${id}`);

        result.value = row.result;
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load analysis.';
    } finally {
        isLoading.value = false;
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function extractRoleName(jd: string): string {
    if (!jd.trim()) {
        return 'Unknown Role';
    }

    const firstLine = jd.trim().split('\n')[0] ?? '';

    return firstLine.length > 50 ? firstLine.slice(0, 47) + '...' : firstLine;
}

function reset(): void {
    result.value = null;
    error.value = null;
    resetProgress();
}

function providerLabel(provider: TProvider): string {
    const labels: Record<TProvider, string> = {
        anthropic: 'Claude',
        openai: 'GPT-4o',
        gemini: 'Gemini',
    };

    return labels[provider];
}

function fitScoreColor(score: number): string {
    if (score >= 80) {
        return 'var(--green)';
    }

    if (score >= 60) {
        return 'var(--accent)';
    }

    if (score >= 40) {
        return 'var(--amber)';
    }

    return 'var(--red)';
}

// ── Export ────────────────────────────────────────────────────────────────────
export function useAnalyser() {
    onMounted(async () => {
        await loadHistory();
    });

    return {
        // State
        result,
        isLoading,
        isHistoryLoading,
        error,
        progress,
        history,
        // Actions
        analyse,
        loadAnalysis,
        reset,
        deleteFromHistory,
        clearHistory,
        // Helpers
        providerLabel,
        fitScoreColor,
        extractRoleName,
    };
}
