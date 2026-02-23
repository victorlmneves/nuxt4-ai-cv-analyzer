<script setup lang="ts">
import { useJDGenerator } from '~/composables/useJDGenerator';
import type { TProvider } from '~/types/index';

interface IExtendedUser {
    role?: string;
    name?: string;
}

const { user } = useUserSession();
const extendedUser = computed(() => user.value as IExtendedUser | null);

const { result, isLoading, error, generate, useAsJD, copyToClipboard } = useJDGenerator();

// ── State ─────────────────────────────────────────────────────────────────────
const notes = ref('');
const provider = ref<TProvider>('gemini');
const showCopied = ref(false);

const providers = ['anthropic', 'openai', 'gemini'] as const;
const providerLabel = (p: TProvider) => ({ anthropic: 'Claude', openai: 'GPT-4o', gemini: 'Gemini' })[p];

const canSubmit = computed(() => !isLoading.value && notes.value.trim().length > 0);

// ── Generate ──────────────────────────────────────────────────────────────────
async function submit(): Promise<void> {
    await generate(notes.value, provider.value);
}

// ── Copy ──────────────────────────────────────────────────────────────────────
async function handleCopy(): Promise<void> {
    if (!result.value) {
        return;
    }

    const ok = await copyToClipboard(result.value.fullText);

    if (ok) {
        showCopied.value = true;
        setTimeout(() => {
            showCopied.value = false;
        }, 2500);
    }
}

// ── Use as JD ─────────────────────────────────────────────────────────────────
function handleUseAsJD(): void {
    if (!result.value) {
        return;
    }

    useAsJD(result.value.fullText);
}

defineOptions({ name: 'JDGeneratorPage' });
</script>

<template>
    <div class="jdgen-shell">
        <!-- Header -->
        <AppHeader tag="jd generator">
            <NuxtLink v-if="extendedUser?.role === 'admin'" to="/admin" class="nav-btn">▤ Admin</NuxtLink>
            <NuxtLink to="/" class="nav-btn">Analyser</NuxtLink>
            <NuxtLink to="/compare" class="nav-btn">Compare CVs</NuxtLink>
            <div class="user-chip">
                <span class="user-chip__name">{{ extendedUser?.name?.split(' ')[0] }}</span>
                <a href="/auth/logout" class="user-chip__signout" title="Sign out">⎋</a>
            </div>
        </AppHeader>

        <main class="jdgen-main">
            <!-- Intro -->
            <div class="jdgen-intro">
                <h1 class="jdgen-intro__title font-serif">
                    JD Generator
                    <br />
                    <em>from free-form notes</em>
                </h1>
                <p class="jdgen-intro__subtitle">
                    Describe what you need in plain language. The AI generates a complete, inclusive job description — ready to copy or use
                    directly in the CV analyser.
                </p>
            </div>

            <!-- Error -->
            <div v-if="error" class="jdgen-error">{{ error }}</div>

            <!-- Two-column layout -->
            <div class="jdgen-layout">
                <!-- Left: input -->
                <div class="jdgen-input">
                    <div>
                        <label class="jdgen-input__label">Your notes</label>
                        <textarea
                            v-model="notes"
                            class="jdgen-input__area"
                            placeholder="e.g. Looking for a senior backend engineer fluent in Node and Postgres, worked in fintech before, no need for cloud expertise but nice to have. Fully remote, around 60k. Company culture is casual, async-first. Need good communication skills for client calls."
                        />
                    </div>
                    <div class="jdgen-input__footer">
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
                        <button class="submit-btn" :disabled="!canSubmit" @click="submit">Generate JD</button>
                    </div>
                </div>

                <!-- Right: output -->
                <div class="jdgen-output">
                    <!-- Empty state -->
                    <div v-if="!result && !isLoading" class="jdgen-output__empty">
                        <p>Your generated job description will appear here.</p>
                    </div>

                    <!-- Loading -->
                    <div v-else-if="isLoading" class="jdgen-output__loading">
                        <p class="jdgen-output__loading-label">Generating job description…</p>
                        <div class="jdgen-output__loading-bar-wrap">
                            <div class="jdgen-output__loading-bar" />
                        </div>
                    </div>

                    <!-- Result -->
                    <div v-else-if="result" class="jd-card">
                        <div class="jd-card__header">
                            <h2 class="jd-card__title">{{ result.title }}</h2>
                            <div class="jd-card__actions">
                                <button class="jd-card__copy-btn" @click="handleCopy">📋 Copy</button>
                                <button class="jd-card__use-btn" @click="handleUseAsJD">→ Use as JD</button>
                            </div>
                        </div>
                        <div class="jd-card__body">
                            <div class="jd-card__section">
                                <div class="jd-card__section-title">Summary</div>
                                <p class="jd-card__section-text">{{ result.sections.summary }}</p>
                            </div>
                            <div class="jd-card__section">
                                <div class="jd-card__section-title">Responsibilities</div>
                                <p class="jd-card__section-text">{{ result.sections.responsibilities }}</p>
                            </div>
                            <div class="jd-card__section">
                                <div class="jd-card__section-title">Requirements</div>
                                <p class="jd-card__section-text">{{ result.sections.requirements }}</p>
                            </div>
                            <div v-if="result.sections.niceToHave" class="jd-card__section">
                                <div class="jd-card__section-title">Nice to Have</div>
                                <p class="jd-card__section-text">{{ result.sections.niceToHave }}</p>
                            </div>
                            <div class="jd-card__section">
                                <div class="jd-card__section-title">What We Offer</div>
                                <p class="jd-card__section-text">{{ result.sections.offer }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <!-- Copy toast -->
        <Transition name="toast">
            <div v-if="showCopied" class="copy-toast">✓ Copied to clipboard</div>
        </Transition>
    </div>
</template>

<style lang="scss">
@use './jd-generator.scss';
</style>
