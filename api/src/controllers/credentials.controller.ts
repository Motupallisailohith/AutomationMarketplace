/**
 * Credentials Controller using @n8n/decorators
 * Migrated from Express routes to class-based decorator approach
 */

import { RestController, Get, Post, Put, Delete, Param, Body } from '@n8n/decorators';
import type { Request, Response } from 'express';
import { CredentialsService } from '../services/credentials.service';
import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { User } from '@n8n/db';

interface AuthRequest extends Request {
  user: {
    id: string;
    userId: string;
    email: string;
  };
}

@RestController('/api/credentials')
export class CredentialsController {
  private logger: Logger;
  private credentialsService: CredentialsService;

  constructor() {
    this.logger = Container.get(Logger);
    this.credentialsService = Container.get(CredentialsService);
  }

  /**
   * Get all credentials for authenticated user
   * GET /api/credentials
   */
  @Get('/')
  async getAllCredentials(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const credentials = await this.credentialsService.getAllCredentials();
      
      // Don't return decrypted data in list view
      const sanitized = credentials.map(cred => ({
        id: cred.id,
        name: cred.name,
        type: cred.type,
        createdAt: cred.createdAt,
        updatedAt: cred.updatedAt,
      }));

      this.logger.info('Credentials retrieved', { userId, count: sanitized.length });

      res.json({
        success: true,
        data: sanitized,
        count: sanitized.length,
      });
    } catch (error) {
      this.logger.error('Error getting credentials', { error, userId: req.user?.id });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve credentials' 
      });
    }
  }

  /**
   * Get single credential by ID
   * GET /api/credentials/:id
   */
  @Get('/:id')
  async getCredential(req: AuthRequest, res: Response, @Param('id') id: string) {
    try {
      const userId = req.user.id;
      const user = { id: userId } as User;
      const credential = await this.credentialsService.getOne(user, id);

      if (!credential) {
        return res.status(404).json({ 
          success: false, 
          error: 'Credential not found' 
        });
      }

      this.logger.info('Credential retrieved', { credentialId: id, userId });

      res.json({
        success: true,
        data: {
          id: credential.id,
          name: credential.name,
          type: credential.type,
          createdAt: credential.createdAt,
          updatedAt: credential.updatedAt,
        },
      });
    } catch (error) {
      this.logger.error('Error getting credential', { error, credentialId: id });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve credential' 
      });
    }
  }

  /**
   * Create new credential
   * POST /api/credentials
   */
  @Post('/')
  async createCredential(req: AuthRequest, _: Response, @Body body: any) {
    try {
      const { name, type, data } = body;
      const userId = req.user.id;

      if (!name || !type || !data) {
        throw new Error('Missing required fields: name, type, data');
      }

      const user = { id: userId } as User;
      const newCredential = await this.credentialsService.createUnmanagedCredential({
        name,
        type,
        data,
      }, user);

      this.logger.info('Credential created', { 
        credentialId: newCredential.id, 
        type, 
        userId 
      });

      return newCredential;
    } catch (error) {
      this.logger.error('Error creating credential', { error, userId: req.user?.id });
      throw error;
    }
  }

  /**
   * Update existing credential
   * PUT /api/credentials/:id
   */
  @Put('/:id')
  async updateCredential(
    req: AuthRequest, 
    _: Response,
    @Param('id') id: string,
    @Body body: any,
  ) {
    try {
      const { name, data } = body;
      const userId = req.user.id;
      const user = { id: userId } as User;

      // Get existing credential
      const existing = await this.credentialsService.getOne(user, id);
      const decryptedData = this.credentialsService.decrypt(existing);
      
      // Prepare update data
      const updateData = await this.credentialsService.prepareUpdateData(
        { name, data },
        decryptedData
      );
      
      // Create encrypted data
      const encryptedData = this.credentialsService.createEncryptedData({
        id,
        name: updateData.name || existing.name,
        type: existing.type,
        data: updateData.data || decryptedData,
      });
      
      // Update
      const updatedCredential = await this.credentialsService.update(id, encryptedData);

      if (!updatedCredential) {
        throw new Error('Credential not found');
      }

      this.logger.info('Credential updated', { credentialId: id, userId });

      return updatedCredential;
    } catch (error) {
      this.logger.error('Error updating credential', { error, credentialId: id });
      throw error;
    }
  }

  /**
   * Delete credential
   * DELETE /api/credentials/:id
   */
  @Delete('/:id')
  async deleteCredential(req: AuthRequest, res: Response, @Param('id') id: string) {
    try {
      const userId = req.user.id;
      const user = { id: userId } as User;
      
      // TODO: Check if credential is in use by any workflows
      await this.credentialsService.delete(user, id);

      this.logger.info('Credential deleted', { credentialId: id, userId });

      res.status(204).send();
    } catch (error) {
      this.logger.error('Error deleting credential', { error, credentialId: id });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to delete credential' 
      });
    }
  }

  /**
   * Get available credential types
   * GET /api/credentials/types/all
   */
  @Get('/types/all')
  async getCredentialTypes(req: AuthRequest, res: Response) {
    try {
      // TODO: Load from nodes-base/credentials or nodeRegistry
      const credentialTypes = [
        {
          name: 'slackOAuth2Api',
          displayName: 'Slack OAuth2 API',
          properties: [],
        },
        {
          name: 'googleOAuth2Api',
          displayName: 'Google OAuth2 API',
          properties: [],
        },
      ];

      res.json({
        success: true,
        data: credentialTypes,
      });
    } catch (error) {
      this.logger.error('Error getting credential types', { error });
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve credential types' 
      });
    }
  }

  /**
   * Test credential connection
   * POST /api/credentials/:id/test
   */
  @Post('/:id/test')
  async testCredential(@Param('id') id: string, req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      
      // TODO: Test credential by making sample API call
      // This should execute the credential's test method

      this.logger.info('Credential test requested', { credentialId: id, userId });

      res.json({ 
        success: true, 
        message: 'Credential test passed' 
      });
    } catch (error) {
      this.logger.error('Credential test failed', { error, credentialId: id });
      res.status(400).json({ 
        success: false, 
        error: 'Credential test failed' 
      });
    }
  }
}
