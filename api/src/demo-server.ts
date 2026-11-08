import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';

type ExecutionStatus = 'running' | 'completed' | 'failed';

interface DemoExecution {
  id: string;
  workflowName: string;
  status: ExecutionStatus;
  steps: string[];
  completedSteps: string[];
  currentStep?: string;
  startedAt: string;
  completedAt?: string;
  audit: Array<{ at: string; event: string; step?: string }>;
}

const app = express();
const executions = new Map<string, DemoExecution>();
const port = Number(process.env.DEMO_PORT || 3002);

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'sandbox-executor' }));

app.post('/api/demo/executions', (req, res) => {
  const { workflowName, steps } = req.body as { workflowName?: string; steps?: string[] };
  if (!workflowName || !Array.isArray(steps) || steps.length === 0 || steps.some((step) => typeof step !== 'string')) {
    return res.status(400).json({ message: 'workflowName and a non-empty string step list are required' });
  }

  const execution: DemoExecution = {
    id: randomUUID(), workflowName, steps, completedSteps: [], status: 'running', startedAt: new Date().toISOString(),
    audit: [{ at: new Date().toISOString(), event: 'execution.started' }],
  };
  executions.set(execution.id, execution);

  steps.forEach((step, index) => {
    setTimeout(() => {
      if (execution.status !== 'running') return;
      execution.currentStep = step;
      execution.audit.push({ at: new Date().toISOString(), event: 'activity.started', step });
    }, index * 800);
    setTimeout(() => {
      if (execution.status !== 'running') return;
      execution.completedSteps.push(step);
      execution.audit.push({ at: new Date().toISOString(), event: 'activity.completed', step });
      if (index === steps.length - 1) {
        execution.status = 'completed';
        execution.completedAt = new Date().toISOString();
        execution.audit.push({ at: execution.completedAt, event: 'execution.completed' });
      }
    }, index * 800 + 620);
  });

  res.status(202).json(execution);
});

app.get('/api/demo/executions/:id', (req, res) => {
  const execution = executions.get(req.params.id);
  if (!execution) return res.status(404).json({ message: 'Execution not found' });
  res.json(execution);
});

app.listen(port, () => console.log(`Sandbox executor listening on http://localhost:${port}`));
