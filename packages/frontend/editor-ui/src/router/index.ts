import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/workflows',
    },
    {
      path: '/workflows',
      name: 'workflows',
      component: () => import('@/views/WorkflowsList.vue'),
    },
    {
      path: '/workflow/:id?',
      name: 'workflow-editor',
      component: () => import('@/views/WorkflowEditor.vue'),
      meta: {
        nodeView: true,
      },
    },
    {
      path: '/workflow/new',
      name: 'workflow-new',
      component: () => import('@/views/WorkflowEditor.vue'),
      meta: {
        nodeView: true,
      },
    },
  ],
});

export default router;
