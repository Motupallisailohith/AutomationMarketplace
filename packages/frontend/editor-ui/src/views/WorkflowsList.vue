<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

interface WorkflowItem {
  id: string;
  name: string;
  active: boolean;
  updatedAt: Date;
}

const workflows = ref<WorkflowItem[]>([]);
const isLoading = ref(true);

onMounted(async () => {
  try {
    // TODO: Replace with actual API call
    workflows.value = [
      {
        id: '1',
        name: 'Sample Workflow',
        active: true,
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'Data Processing',
        active: false,
        updatedAt: new Date(),
      },
    ];
  } catch (error) {
    console.error('Failed to load workflows:', error);
  } finally {
    isLoading.value = false;
  }
});

function openWorkflow(id: string) {
  router.push(`/workflow/${id}`);
}

function createNewWorkflow() {
  router.push('/workflow/new');
}
</script>

<template>
  <div class="workflows-page">
    <header class="page-header">
      <h1>Workflows</h1>
      <button class="btn btn-primary" @click="createNewWorkflow">
        + New Workflow
      </button>
    </header>

    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <p>Loading workflows...</p>
    </div>

    <div v-else class="workflows-grid">
      <div
        v-for="workflow in workflows"
        :key="workflow.id"
        class="workflow-card"
        @click="openWorkflow(workflow.id)"
      >
        <div class="card-header">
          <h3>{{ workflow.name }}</h3>
          <span v-if="workflow.active" class="badge badge-success">Active</span>
          <span v-else class="badge">Inactive</span>
        </div>
        <div class="card-footer">
          <span class="text-muted">
            Updated {{ workflow.updatedAt.toLocaleDateString() }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.workflows-page {
  padding: var(--spacing--lg);
  min-height: 100vh;
  background: var(--color--background);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing--lg);

  h1 {
    margin: 0;
    font-size: 32px;
    font-weight: 700;
    color: var(--color--text--shade-1);
  }
}

.btn {
  padding: var(--spacing--sm) var(--spacing--lg);
  border: 1px solid var(--border-color);
  background: var(--color--background--light-3);
  color: var(--color--text);
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background: var(--color--background--light-2);
  }
}

.btn-primary {
  background: var(--color--primary);
  color: white;
  border-color: var(--color--primary);

  &:hover {
    background: var(--color--primary--shade-1);
  }
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing--2xl);
  gap: var(--spacing--md);

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--color--foreground--tint-1);
    border-top-color: var(--color--primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
}

.workflows-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing--lg);
}

.workflow-card {
  background: var(--color--background--light-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius--lg);
  padding: var(--spacing--lg);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: var(--shadow);
    border-color: var(--color--primary);
    transform: translateY(-2px);
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--spacing--sm);
  margin-bottom: var(--spacing--md);

  h3 {
    flex: 1;
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--color--text--shade-1);
  }
}

.badge {
  padding: 2px var(--spacing--xs);
  border-radius: var(--radius--sm);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  background: var(--color--background--light-2);
  color: var(--color--text--tint-1);
}

.badge-success {
  background: var(--color--success--tint-3);
  color: var(--color--success);
}

.card-footer {
  .text-muted {
    color: var(--color--text--tint-1);
    font-size: 12px;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
