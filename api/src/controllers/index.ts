/**
 * Controller Registry and Auto-discovery
 * Registers all decorator-based controllers with Express
 */

import { Express } from 'express';
import { Container } from '@n8n/di';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { authMiddleware } from '../middleware/auth';

// Import all controllers
import { WorkflowsController } from './workflows.controller';
import { CredentialsController } from './credentials.controller';

const controllers = [
  WorkflowsController,
  CredentialsController,
];

/**
 * Register all controllers with Express app
 */
export function registerControllers(app: Express): void {
  const controllerRegistry = Container.get(ControllerRegistryMetadata);

  for (const ControllerClass of controllers) {
    // Get controller instance from DI container
    const controller = Container.get(ControllerClass as any) as any;
    
    // Get controller metadata (routes, middleware, etc.)
    const metadata = controllerRegistry.getControllerMetadata(ControllerClass as any);
    
    const basePath = metadata.basePath || '/';
    
    // Apply auth middleware to all controller routes
    app.use(basePath, authMiddleware);
    
    // Register all routes from controller
    for (const [methodName, routeMetadata] of Object.entries(metadata.routes || {})) {
      const route = (routeMetadata as any);
      const fullPath = `${basePath}${route.path}`.replace(/\/+/g, '/');
      const method = route.method.toLowerCase();
      
      // Bind controller method to Express route
      (app as any)[method](fullPath, async (req: any, res: any, next: any) => {
        try {
          await controller[methodName](req, res, next);
        } catch (error) {
          next(error);
        }
      });
      
      console.log(`Registered ${method.toUpperCase()} ${fullPath} -> ${ControllerClass.name}.${methodName}`);
    }
  }
}
