import type { IGeneratedJD, TProvider } from '../types';

// ── State ─────────────────────────────────────────────────────────────────────
const result = ref<IGeneratedJD | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

// pendingJD is moved inside the composable function below (needs Nuxt context).
// ── Generate ──────────────────────────────────────────────────────────────────
async function generate(notes: string, provider: TProvider): Promise<void> {
    isLoading.value = true;
    error.value = null;
    result.value = null;

    try {
        const response = await $fetch<IGeneratedJD>('/api/generate-jd', {
            method: 'POST',
            body: { notes, provider },
        });

        result.value = response;
    } catch (err: unknown) {
        error.value = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
    } finally {
        isLoading.value = false;
    }
}

// ── Use as JD in the analyser ─────────────────────────────────────────────────
// (defined inside the composable below so it has access to pendingJD)

// ── Copy to clipboard ─────────────────────────────────────────────────────────
async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);

        return true;
    } catch {
        return false;
    }
}

function reset(): void {
    result.value = null;
    error.value = null;
}

// ── Export ────────────────────────────────────────────────────────────────────
export function useJDGenerator() {
    // useState must run inside a Nuxt context (setup fn / plugin)
    const pendingJD = useState<string>('pendingJD', () => '');

    function useAsJD(text: string): void {
        pendingJD.value = text;
        navigateTo('/');
    }

    return {
        result,
        isLoading,
        error,
        pendingJD,
        generate,
        useAsJD,
        copyToClipboard,
        reset,
    };
}
