<script setup lang="ts">
withDefaults(
    defineProps<{
        tag?: string;
    }>(),
    {
        tag: 'by recruitr',
    }
);
</script>

<template>
    <header class="app-header">
        <div class="app-header__inner">
            <div class="app-header__brand">
                <span class="brand__mark font-serif">CV</span>
                <span class="brand__name font-serif">Analyst</span>
                <span class="brand__tag font-mono">{{ tag }}</span>
            </div>

            <nav class="app-header__nav">
                <slot />
            </nav>
        </div>
    </header>
</template>
