<script setup lang="ts">
import type { IInterviewQuestion, TQuestionCategory } from '~/types/index';

defineProps<{
    question: IInterviewQuestion;
    index: number;
}>();

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
</script>

<template>
    <div class="question">
        <div class="question__header">
            <span class="question__num font-mono">{{ String(index + 1).padStart(2, '0') }}</span>
            <span
                class="question__category font-mono"
                :style="{
                    color: categoryColor(question.category),
                    background: categoryBg(question.category),
                }"
            >
                {{ question.category }}
            </span>
            <span class="question__target font-mono">{{ question.targetSkill }}</span>
        </div>
        <p class="question__text">{{ question.question }}</p>
        <p class="question__rationale">{{ question.rationale }}</p>
    </div>
</template>

<style scoped lang="scss">
@use '~/assets/scss/mixins' as *;

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
