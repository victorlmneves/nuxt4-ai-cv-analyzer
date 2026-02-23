<script setup lang="ts">
import type { IRedFlag } from '~/types/index';

defineProps<{
    flag: IRedFlag;
}>();

function severityColor(severity: 'low' | 'medium' | 'high'): string {
    const colors = { low: 'var(--amber)', medium: 'var(--accent)', high: 'var(--red)' };

    return colors[severity];
}

function severityBg(severity: 'low' | 'medium' | 'high'): string {
    const bgs = { low: 'var(--amber-pale)', medium: 'var(--accent-pale)', high: 'var(--red-pale)' };

    return bgs[severity];
}
</script>

<template>
    <div
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
</template>

<style scoped lang="scss">
@use '~/assets/scss/mixins' as *;

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

.severity-badge {
    @include pill-badge;
    font-size: 0.65rem;
    padding: 0.15rem 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}
</style>
