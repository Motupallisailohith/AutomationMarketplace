import { Router, Request, Response } from 'express';
import { container } from 'tsyringe';
import { z } from 'zod';
import { WorkflowsService } from '../services';
import { authMiddleware, asyncHandler, validateBody } from '../middleware';
import { AuthenticatedRequest } from '../types';

const router = Router();

// Validation schemas
const createWorkflowSchema = z.object({
  name: z.string().min(1).max(255),
  nodes: z.array(z.any()).optional(),
  connections: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional(),
  active: z.boolean().optional(),
});

const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  nodes: z.array(z.any()).optional(),
  connections: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional(),
  active: z.boolean().optional(),
});

/**
 * GET /api/workflows - Get all workflows
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user.id;
    const workflowsService = container.resolve(WorkflowsService);

    const workflows = await workflowsService.getAllForUser(userId);

    res.json(workflows);
  })
);

/**
 * POST /api/workflows - Create new workflow
 */
router.post(
  '/',
  authMiddleware,
  validateBody(createWorkflowSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user.id;
    const workflowsService = container.resolve(WorkflowsService);

    const workflow = await workflowsService.create(req.body, userId);

    res.status(201).json(workflow);
  })
);

/**
 * GET /api/workflows/:id - Get workflow by ID
 */
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user.id;
    const workflowsService = container.resolve(WorkflowsService);

    const workflow = await workflowsService.getById(req.params.id, userId);

    res.json(workflow);
  })
);

/**
 * PATCH /api/workflows/:id - Update workflow
 */
router.patch(
  '/:id',
  authMiddleware,
  validateBody(updateWorkflowSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user.id;
    const workflowsService = container.resolve(WorkflowsService);

    const workflow = await workflowsService.update(req.params.id, req.body, userId);

    res.json(workflow);
  })
);

/**
 * DELETE /api/workflows/:id - Delete workflow
 */
router.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user.id;
    const workflowsService = container.resolve(WorkflowsService);

    await workflowsService.delete(req.params.id, userId);

    res.status(204).send();
  })
);

/**
 * POST /api/workflows/:id/activate - Activate workflow
 */
router.post(
  '/:id/activate',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user.id;
    const workflowsService = container.resolve(WorkflowsService);

    const workflow = await workflowsService.activate(req.params.id, userId);

    res.json(workflow);
  })
);

/**
 * POST /api/workflows/:id/deactivate - Deactivate workflow
 */
router.post(
  '/:id/deactivate',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user.id;
    const workflowsService = container.resolve(WorkflowsService);

    const workflow = await workflowsService.deactivate(req.params.id, userId);

    res.json(workflow);
  })
);

/**
 * POST /api/workflows/:id/duplicate - Duplicate workflow
 */
router.post(
  '/:id/duplicate',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user.id;
    const workflowsService = container.resolve(WorkflowsService);

    const workflow = await workflowsService.duplicate(req.params.id, userId, req.body.name);

    res.status(201).json(workflow);
  })
);

/**
 * GET /api/workflows/:id/executions - Get workflow executions
 */
router.get(
  '/:id/executions',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user.id;
    const workflowsService = container.resolve(WorkflowsService);

    const workflow = await workflowsService.getWithExecutions(req.params.id, userId);

    res.json(workflow.executions);
  })
);

/**
 * GET /api/workflows/statistics - Get workflow statistics
 */
router.get(
  '/stats/overview',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user.id;
    const workflowsService = container.resolve(WorkflowsService);

    const statistics = await workflowsService.getStatistics(userId);

    res.json(statistics);
  })
);

export default router;
