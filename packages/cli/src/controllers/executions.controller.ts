import { Router, Request, Response } from 'express';
import { container } from 'tsyringe';
import { ExecutionsService } from '../services';
import { authMiddleware, asyncHandler } from '../middleware';
import { AuthenticatedRequest } from '../types';

const router = Router();

/**
 * GET /api/executions - Get all executions
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user.id;
    const executionsService = container.resolve(ExecutionsService);

    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const workflowId = req.query.workflowId as string | undefined;

    const executions = await executionsService.getAll(userId, workflowId, limit);

    res.json(executions);
  })
);

/**
 * GET /api/executions/:id - Get execution by ID
 */
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const executionsService = container.resolve(ExecutionsService);

    const execution = await executionsService.getById(req.params.id);

    res.json(execution);
  })
);

/**
 * DELETE /api/executions/:id - Delete execution
 */
router.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const executionsService = container.resolve(ExecutionsService);

    await executionsService.delete(req.params.id);

    res.status(204).send();
  })
);

/**
 * POST /api/executions/:id/stop - Stop running execution
 */
router.post(
  '/:id/stop',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const executionsService = container.resolve(ExecutionsService);

    const execution = await executionsService.stop(req.params.id);

    res.json(execution);
  })
);

/**
 * GET /api/executions/statistics - Get execution statistics
 */
router.get(
  '/stats/overview',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const executionsService = container.resolve(ExecutionsService);

    const workflowId = req.query.workflowId as string | undefined;
    const statistics = await executionsService.getStatistics(workflowId);

    res.json(statistics);
  })
);

export default router;
