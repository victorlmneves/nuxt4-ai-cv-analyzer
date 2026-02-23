<script setup lang="ts">
withDefaults(
    defineProps<{
        value: string | number;
        label: string;
        valueColor?: string;
    }>(),
    {
        valueColor: undefined,
    }
);
</script>

<template>
    <div class="kpi-card">
        <span class="kpi-card__value font-serif" :style="valueColor ? { color: valueColor } : {}">
            {{ value }}
        </span>
        <span class="kpi-card__label">{{ label }}</span>
    </div>
</template>

<style scoped lang="scss">
@use '~/assets/scss/mixins' as *;

.kpi-card {
    @include card;
    padding: 1.25rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;

    &__value {
        font-size: 2rem;
        font-weight: 500;
        line-height: 1;
        color: var(--ink);
    }

    &__label {
        font-size: 0.75rem;
        color: var(--ink-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
}
</style>
