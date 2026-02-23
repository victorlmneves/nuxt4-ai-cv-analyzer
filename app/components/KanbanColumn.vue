<script setup lang="ts">
interface IAnalysis {
    id: string;
    candidateName: string;
    roleName: string;
    overallScore: number;
}

const props = defineProps<{ status: { key: string; label: string }; analyses: IAnalysis[] }>();

const emit = defineEmits(['move']);
let draggingId: string | null = null;

function onDragStart(id: string) {
    draggingId = id;
}

function onDragEnd() {
    draggingId = null;
}

function onDrop() {
    if (draggingId) {
        emit('move', draggingId, props.status.key);
        draggingId = null;
    }
}
</script>

<template>
    <div class="kanban-column" :data-status="status.key">
        <h2 class="kanban-column__title">{{ status.label }}</h2>
        <div class="kanban-column__list">
            <div
                v-for="analysis in analyses"
                :key="analysis.id"
                class="kanban-card"
                draggable="true"
                @dragstart="onDragStart(analysis.id)"
                @dragend="onDragEnd"
            >
                <div class="kanban-card__name">{{ analysis.candidateName }}</div>
                <div class="kanban-card__role">{{ analysis.roleName }}</div>
                <div class="kanban-card__score">Score: {{ analysis.overallScore }}</div>
            </div>
        </div>
        <div class="kanban-column__dropzone" @dragover.prevent @drop="onDrop">
            <span>Drag and drop here to move</span>
        </div>
    </div>
</template>

<style lang="scss">
.kanban-column {
    background: var(--white);
    border-radius: 8px;
    box-shadow: 0 2px 8px #0001;
    min-width: 220px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
}

.kanban-column__title {
    font-weight: 500;
    margin-bottom: 1rem;
}

.kanban-column__list {
    flex: 1;
    min-height: 120px;
}

.kanban-card {
    background: var(--paper-warm);
    border-radius: 6px;
    margin-bottom: 0.5rem;
    padding: 0.75rem;
    cursor: grab;
    box-shadow: 0 1px 4px #0001;
    border-left: 6px solid var(--accent);
    transition: border-color 0.2s;
    &:last-child {
        margin-bottom: 0;
    }
}

.kanban-card__name {
    font-weight: 500;
}

.kanban-card__role {
    font-size: 0.9em;
    color: #64748b;
}

.kanban-card__score {
    font-size: 0.85em;
    color: #334155;
}

.kanban-column__dropzone {
    margin-top: 1rem;
    padding: 0.5rem;
    background: #e2e8f0;
    border-radius: 6px;
    text-align: center;
    color: #475569;
}

/* Kanban status color coding */
.kanban-column[data-status='in_process'] .kanban-card {
    border-left-color: var(--blue);
}
.kanban-column[data-status='interview'] .kanban-card {
    border-left-color: var(--amber);
}
.kanban-column[data-status='offer'] .kanban-card {
    border-left-color: var(--green);
}
.kanban-column[data-status='placed'] .kanban-card {
    border-left-color: var(--accent);
}
.kanban-column[data-status='rejected'] .kanban-card {
    border-left-color: var(--red);
}
</style>
