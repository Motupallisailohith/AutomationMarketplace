/**
 * Controller Registry - Mirrors n8n's ControllerRegistry pattern
 * Automatically wires up controllers with decorator-based routing
 */

import { Container, Service } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import type { Application, RequestHandler, Request, Response } from 'express';
import { Router } from 'express';

@Service()
export class ControllerRegistry {
  private readonly logger = Container.get(Logger);
  private controllers: any[] = [];

  registerController(controllerClass: any) {
    this.controllers.push(controllerClass);
  }

  activate(app: Application, restEndpoint: string) {
    this.logger.info(`Activating ${this.controllers.length} controllers...`);
    
    for (const controllerClass of this.controllers) {
      this.activateController(app, controllerClass, restEndpoint);
    }
  }

  private activateController(app: Application, controllerClass: any, restEndpoint: string) {
    // Get controller metadata from decorators
    const basePath = Reflect.getMetadata('rest:basePath', controllerClass) || '';
    const routes = Reflect.getMetadata('rest:routes', controllerClass) || [];

    if (routes.length === 0) {
      this.logger.warn(`No routes found for controller ${controllerClass.name}`);
      return;
    }

    const router = Router({ mergeParams: true });
    const fullPath = `/${restEndpoint}/${basePath}`.replace(/\/+/g, '/').replace(/\/$/, '');
    
    app.use(fullPath === '' ? '/' : fullPath, router);

    const controller = Container.get(controllerClass);

    this.logger.info(`Registering controller at ${fullPath} with ${routes.length} routes`);

    // Register each route
    for (const route of routes) {
      const { method, path, handlerName, skipAuth } = route;
      
      const handler = async (req: Request, res: Response) => {
        try {
          const result = await controller[handlerName](req, res);
          if (!res.headersSent && result !== undefined) {
            res.json(result);
          }
        } catch (error: any) {
          if (!res.headersSent) {
            this.logger.error(`Error in ${controllerClass.name}.${handlerName}:`, error);
            res.status(error.httpStatusCode || 500).json({
              error: error.message || 'Internal server error'
            });
          }
        }
      };

      const middlewares: RequestHandler[] = [];
      // TODO: Add auth middleware if !skipAuth

      router[method](path, ...middlewares, handler);
      this.logger.debug(`  ${method.toUpperCase()} ${fullPath}${path} → ${handlerName}`);
    }
  }
}
