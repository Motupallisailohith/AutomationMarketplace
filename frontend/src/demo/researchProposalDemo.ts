import type { Edge, Node } from 'reactflow';

type DemoNode = Node<{ label: string; nodeType: string; parameters: Record<string, unknown> }>;

const node = (id: string, label: string, nodeType: string, x: number, y: number, parameters: Record<string, unknown> = {}): DemoNode => ({
  id, type: 'workflowNode', position: { x, y }, data: { label, nodeType, parameters },
});

export const researchProposalDemo = {
  name: 'Research Proposal Intelligence Pipeline',
  description: 'Deterministic sandbox pipeline for research-intake validation, evidence gathering, and review triage.',
  nodes: [
    node('intake', 'Proposal intake webhook', 'webhook', 40, 280, { endpoint: '/demo/proposals', auth: 'sandbox-token' }),
    node('validate', 'Validate research schema', 'code', 330, 280, { requiredFields: 'title, PI, discipline, abstract, budget' }),
    node('enrich', 'Enrich proposal metadata', 'http', 620, 280, { method: 'POST', url: 'sandbox://metadata-enrichment' }),
    node('originality', 'Originality evidence lookup', 'http', 930, 90, { method: 'POST', url: 'sandbox://repository-search', retry: '3 exponential attempts' }),
    node('funding', 'Funding-fit analysis', 'http', 930, 280, { method: 'POST', url: 'sandbox://funding-fit' }),
    node('capacity', 'Reviewer-capacity analysis', 'http', 930, 470, { method: 'POST', url: 'sandbox://reviewer-capacity' }),
    node('score', 'Evidence-weighted scoring', 'code', 1230, 280, { model: 'deterministic weighted rubric', threshold: '0.78' }),
    node('route', 'Priority & completeness gate', 'if', 1530, 280, { rule: 'score >= 0.78 AND completeness = true' }),
    node('priority', 'Create expedited review packet', 'database', 1830, 150, { destination: 'Sandbox Research Registry' }),
    node('notify', 'Notify review committee', 'slack', 2130, 150, { channel: '#research-review-sandbox' }),
    node('standard', 'Queue standard review', 'database', 1830, 430, { destination: 'Sandbox Review Queue' }),
  ],
  edges: [
    ['intake', 'validate'], ['validate', 'enrich'], ['enrich', 'originality'], ['enrich', 'funding'], ['enrich', 'capacity'],
    ['originality', 'score'], ['funding', 'score'], ['capacity', 'score'], ['score', 'route'], ['route', 'priority'], ['priority', 'notify'], ['route', 'standard'],
  ].map(([source, target]) => ({ id: `${source}-${target}`, source, target, type: 'smoothstep', animated: false } satisfies Edge)),
  executionOrder: ['intake', 'validate', 'enrich', 'originality', 'funding', 'capacity', 'score', 'route', 'priority', 'notify'],
  sampleInput: {
    title: 'Privacy-Preserving Multimodal Learning for Clinical Research',
    principalInvestigator: 'Dr. Maya Chen', discipline: 'Computer Science + Biomedical Informatics', budgetUsd: 420000,
    abstract: 'A federated-learning approach that enables multi-site clinical research without centralizing patient data.',
  },
};
