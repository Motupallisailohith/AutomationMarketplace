import { Request, Response, NextFunction } from 'express';
import { Delete, Get, Patch, Post, RestController } from '@/decorators';
import { Container } from '@n8n/di';
import { ExtensionService } from '../services/extension.service';

@RestController('/extensions')
export class ExtensionsController {
  /**
   * GET /api/extensions
   * Get all installed extensions
   */
  @Get('/')
  async getAll(req: Request, res: Response) {
    try {
      const extensionService = Container.get(ExtensionService);
      const extensions = extensionService.getAll();

      res.json({
        extensions: extensions.map(ext => ({
          name: ext.manifest.name,
          displayName: ext.manifest.displayName,
          description: ext.manifest.description,
          version: ext.manifest.version,
          publisher: ext.manifest.publisher,
          categories: ext.manifest.categories,
          enabled: ext.enabled,
          permissions: ext.manifest.permissions,
        })),
      });
    } catch (error) {
      console.error('Failed to get extensions:', error);
      res.status(500).json({
        error: 'Failed to get extensions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/extensions/:name
   * Get a specific extension by name
   */
  @Get('/:name')
  async getByName(req: Request, res: Response) {
    try {
      const extensionService = Container.get(ExtensionService);
      const extension = extensionService.get(req.params.name);

      if (!extension) {
        return res.status(404).json({ error: 'Extension not found' });
      }

      res.json({
        name: extension.manifest.name,
        displayName: extension.manifest.displayName,
        description: extension.manifest.description,
        version: extension.manifest.version,
        publisher: extension.manifest.publisher,
        categories: extension.manifest.categories,
        enabled: extension.enabled,
        permissions: extension.manifest.permissions,
        events: extension.manifest.events,
        extends: extension.manifest.extends,
      });
    } catch (error) {
      console.error('Failed to get extension:', error);
      res.status(500).json({
        error: 'Failed to get extension',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/extensions/:name/enable
   * Enable an extension
   */
  @Post('/:name/enable')
  async enable(req: Request, res: Response) {
    try {
      const extensionService = Container.get(ExtensionService);
      await extensionService.enable(req.params.name);

      res.json({
        message: 'Extension enabled successfully',
      });
    } catch (error) {
      console.error('Failed to enable extension:', error);
      res.status(500).json({
        error: 'Failed to enable extension',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/extensions/:name/disable
   * Disable an extension
   */
  @Post('/:name/disable')
  async disable(req: Request, res: Response) {
    try {
      const extensionService = Container.get(ExtensionService);
      await extensionService.disable(req.params.name);

      res.json({
        message: 'Extension disabled successfully',
      });
    } catch (error) {
      console.error('Failed to disable extension:', error);
      res.status(500).json({
        error: 'Failed to disable extension',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * DELETE /api/extensions/:name
   * Uninstall an extension
   */
  @Delete('/:name')
  async uninstall(req: Request, res: Response) {
    try {
      const extensionService = Container.get(ExtensionService);
      await extensionService.uninstall(req.params.name);

      res.json({
        message: 'Extension uninstalled successfully',
      });
    } catch (error) {
      console.error('Failed to uninstall extension:', error);
      res.status(500).json({
        error: 'Failed to uninstall extension',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/extensions/validate
   * Validate an extension manifest
   */
  @Post('/validate')
  async validate(req: Request, res: Response) {
    try {
      const extensionService = Container.get(ExtensionService);
      const manifest = extensionService.validateManifest(req.body);

      res.json({
        valid: true,
        manifest,
      });
    } catch (error) {
      res.status(400).json({
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid manifest',
      });
    }
  }
}
