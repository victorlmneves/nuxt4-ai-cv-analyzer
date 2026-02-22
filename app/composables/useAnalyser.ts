import type { IAnalysisInput, IAnalysisResult, IHistoryEntry, TProvider } from './types';

// ── Constants ─────────────────────────────────────────────────────────────────
const HISTORY_KEY = 'cv-analyzer:history';
const MAX_HISTORY = 20;

// ── State ─────────────────────────────────────────────────────────────────────
const result = ref<IAnalysisResult | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);
const progress = ref(0);
const history = ref<IHistoryEntry[]>([]);

// ── History helpers ───────────────────────────────────────────────────────────
function loadHistory(): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        const raw = localStorage.getItem(HISTORY_KEY);

        history.value = raw ? (JSON.parse(raw) as IHistoryEntry[]) : [];
    } catch {
        history.value = [];
    }
}

function saveHistory(): void {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value));
}

function addToHistory(entry: IHistoryEntry): void {
    history.value.unshift(entry);

    if (history.value.length > MAX_HISTORY) {
        history.value = history.value.slice(0, MAX_HISTORY);
    }

    saveHistory();
}

function deleteFromHistory(id: string): void {
    history.value = history.value.filter((e) => e.id !== id);
    saveHistory();
}

function clearHistory(): void {
    history.value = [];
    saveHistory();
}

// ── Progress simulation ───────────────────────────────────────────────────────
// Simulates progress while waiting for the API response
let progressTimer: ReturnType<typeof setInterval> | null = null;

function startProgress(): void {
    progress.value = 0;
    progressTimer = setInterval(() => {
        if (progress.value < 85) {
            // Slow down as it approaches 85%
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
        const response = await $fetch<IAnalysisResult>('/api/analyse', {
            method: 'POST',
            body: input,
        });

        finishProgress();
        result.value = response;

        // Persist to history
        const entry: IHistoryEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            result: response,
            candidateName: response.candidate.name ?? 'Unknown Candidate',
            roleName: extractRoleName(input.jobDescription),
            createdAt: new Date().toISOString(),
        };

        addToHistory(entry);
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

// ── Helpers ───────────────────────────────────────────────────────────────────
// Extracts a short role name from the job description (first line or first 40 chars)
function extractRoleName(jd: string): string {
    if (!jd.trim()) {
        return 'Unknown Role';
    }

    const firstLine = jd.trim().split('\n')[0] ?? '';

    return firstLine.length > 50 ? firstLine.slice(0, 47) + '...' : firstLine;
}

function restoreFromHistory(entry: IHistoryEntry): void {
    result.value = entry.result;
}

function reset(): void {
    result.value = null;
    error.value = null;
    resetProgress();
}

// ── Provider label ────────────────────────────────────────────────────────────
function providerLabel(provider: TProvider): string {
    const labels: Record<TProvider, string> = {
        anthropic: 'Claude',
        openai: 'GPT-4o',
        gemini: 'Gemini',
    };

    return labels[provider];
}

// ── Fit score colour ──────────────────────────────────────────────────────────
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
    onMounted(() => {
        loadHistory();
    });

    return {
        // State
        result,
        isLoading,
        error,
        progress,
        history,
        // Actions
        analyse,
        reset,
        restoreFromHistory,
        deleteFromHistory,
        clearHistory,
        // Helpers
        providerLabel,
        fitScoreColor,
        extractRoleName,
    };
}
