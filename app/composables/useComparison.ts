import type { IComparisonResult, IComparisonHistoryEntry, TProvider } from '../types';

// ── Shared state ──────────────────────────────────────────────────────────────
const result = ref<(IComparisonResult & { id: string }) | null>(null);
const isLoading = ref(false);
const isHistoryLoading = ref(false);
const error = ref<string | null>(null);
const progress = ref(0);
const history = ref<IComparisonHistoryEntry[]>([]);

// ── Progress simulation ───────────────────────────────────────────────────────
let progressTimer: ReturnType<typeof setInterval> | null = null;

function startProgress(): void {
    progress.value = 0;
    progressTimer = setInterval(() => {
        if (progress.value < 80) {
            // Comparisons are slower (N+1 AI calls) so tick slower
            const increment = progress.value < 30 ? 2 : progress.value < 60 ? 0.8 : 0.3;

            progress.value = Math.min(80, progress.value + increment);
        }
    }, 200);
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

// ── History ───────────────────────────────────────────────────────────────────
async function loadHistory(): Promise<void> {
    isHistoryLoading.value = true;

    try {
        const rows = await $fetch<IComparisonHistoryEntry[]>('/api/comparisons');

        history.value = rows;
    } catch (err) {
        console.error('[comparison history] load failed:', err);

        history.value = [];
    } finally {
        isHistoryLoading.value = false;
    }
}

async function deleteFromHistory(id: string): Promise<void> {
    try {
        await $fetch(`/api/comparisons/${id}`, { method: 'DELETE' });
        history.value = history.value.filter((e) => e.id !== id);

        if (result.value?.id === id) {
            result.value = null;
            resetProgress();
        }
    } catch (err: unknown) {
        console.error('[comparison history] delete failed:', err instanceof Error ? err.message : err);
    }
}

// ── Compare ───────────────────────────────────────────────────────────────────
async function compare(cvTexts: string[], jobDescription: string, provider: TProvider): Promise<void> {
    isLoading.value = true;
    error.value = null;
    result.value = null;
    startProgress();

    try {
        const response = await $fetch<IComparisonResult & { id: string }>('/api/compare', {
            method: 'POST',
            body: { cvTexts, jobDescription, provider },
        });

        finishProgress();
        result.value = response;

        // Prepend to history
        const entry: IComparisonHistoryEntry = {
            id: response.id,
            roleName: response.roleName,
            candidateCount: response.candidates.length,
            provider: response.provider,
            createdAt: response.comparedAt,
        };

        history.value.unshift(entry);
    } catch (err: unknown) {
        finishProgress();
        error.value = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
    } finally {
        isLoading.value = false;
    }
}

// ── Load a saved comparison ───────────────────────────────────────────────────
async function loadComparison(id: string): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
        const row = await $fetch<{ id: string; result: IComparisonResult }>(`/api/comparisons/${id}`);

        result.value = { id: row.id, ...row.result };
        finishProgress();
    } catch (err: unknown) {
        error.value = err instanceof Error ? err.message : 'Failed to load comparison.';
    } finally {
        isLoading.value = false;
    }
}

function reset(): void {
    result.value = null;
    error.value = null;
    resetProgress();
}

// ── Export ────────────────────────────────────────────────────────────────────
export function useComparison() {
    onMounted(async () => {
        await loadHistory();
    });

    return {
        result,
        isLoading,
        isHistoryLoading,
        error,
        progress,
        history,
        compare,
        loadComparison,
        reset,
        deleteFromHistory,
    };
}
