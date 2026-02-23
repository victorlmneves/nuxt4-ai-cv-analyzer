<script setup lang="ts">
type TAnalysis = {
    id: string;
    status: string;
};

const statuses = [
    { key: 'in_process', label: 'In Process' },
    { key: 'interview', label: 'Interview' },
    { key: 'offer', label: 'Offer' },
    { key: 'placed', label: 'Placed' },
    { key: 'rejected', label: 'Rejected' },
];

const analyses = ref<TAnalysis[]>([]);

function analysesByStatus(status: string) {
    return analyses.value.filter((a: TAnalysis) => a.status === status);
}

async function fetchAnalyses() {
    analyses.value = await $fetch('/api/analyses');
}

async function moveAnalysis(id: string, newStatus: string) {
    await $fetch(`/api/analyses/${id}`, {
        method: 'PATCH',
        body: { status: newStatus },
    });

    await fetchAnalyses();
}

onMounted(fetchAnalyses);

defineOptions({ name: 'PipelinePage' });
</script>

<template>
    <div class="pipeline-shell">
        <AppHeader tag="pipeline">
            <NuxtLink to="/" class="nav-btn">Analyser</NuxtLink>
            <NuxtLink to="/compare" class="nav-btn">Compare CVs</NuxtLink>
            <NuxtLink to="/jd-generator" class="nav-btn">JD Generator</NuxtLink>
            <NuxtLink to="/admin" class="nav-btn">Admin</NuxtLink>
        </AppHeader>
        <main class="pipeline-main">
            <div class="pipeline-container">
                <h1 class="pipeline-title font-serif">Candidates Pipeline</h1>
                <p class="pipeline-sub">Kanban: In Process → Interview → Offer → Placed → Rejected</p>
                <div class="kanban-board">
                    <KanbanColumn
                        v-for="status in statuses"
                        :key="status.key"
                        :status="status"
                        :analyses="analysesByStatus(status.key)"
                        @move="moveAnalysis"
                    />
                </div>
            </div>
        </main>
    </div>
</template>

<style lang="scss">
.pipeline-shell {
    min-height: 100vh;
    background: #f8fafc;
}

.pipeline-main {
    flex: 1;
}

.pipeline-container {
    max-width: var(--width-app-max);
    width: 100%;
    margin: 0 auto;
    padding: var(--space-6xl) var(--space-4xl) var(--space-7xl);
    overflow-x: hidden;
}

.pipeline-title {
    margin-top: 2rem;
}

.pipeline-sub {
    margin-bottom: var(--space-xl);
}

.pipeline-board {
    display: flex;
    flex-direction: row;
    gap: 1.5rem;
    margin-top: 2rem;
    min-width: 900px;
}

.kanban-board {
    display: flex;
    flex-direction: row;
    gap: 1.5rem;
    margin-top: 2rem;
    min-width: 900px;
    padding-bottom: 1rem;
    overflow-x: auto;
}
</style>
