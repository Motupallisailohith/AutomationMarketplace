/**
 * Credentials Routes - MIRRORED FROM n8n
 * Path: n8n/packages/cli/src/credentials/credentials.controller.ts
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Container } from '@n8n/di';
import { CredentialsService } from '../services/credentials.service';
import { Logger } from '@n8n/backend-common';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import type { User } from '@n8n/db';

// Simple auth middleware (temporary - use proper auth later)
const authMiddleware = (req: Request & { user?: User }, res: Response, next: NextFunction) => {
  // For now, create a mock user - replace with real auth
  req.user = { id: 'temp-user-id', email: 'temp@example.com' } as User;
  next();
};

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get all credentials for authenticated user
router.get('/', async (req, res) => {
  try {
    const user = (req as any).user;
    const credentialsService = Container.get(CredentialsService);
    const logger = Container.get(Logger);
    
    const credentials = await credentialsService.getAllCredentials();
    
    logger.info('Credentials retrieved', { userId: user.id, count: credentials.length });
    
    res.json({
      success: true,
      data: credentials.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (error: any) {
    const logger = Container.get(Logger);
    logger.error('Failed to retrieve credentials:', { error: error?.message || error });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve credentials' 
    });
  }
});

// Get single credential by ID
router.get('/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const includeData = req.query.includeData === 'true';
    
    const credentialsService = Container.get(CredentialsService);
    const logger = Container.get(Logger);
    
    const credential = await credentialsService.getOne(user, id, includeData);
    
    logger.info('Credential retrieved', { credentialId: id, userId: user.id });
    
    // Decrypt if requested
    let data: ICredentialDataDecryptedObject | undefined;
    if (includeData) {
      data = credentialsService.decrypt(credential, true);
    }
    
    res.json({
      success: true,
      data: {
        id: credential.id,
        name: credential.name,
        type: credential.type,
        createdAt: credential.createdAt,
        updatedAt: credential.updatedAt,
        data,
      }
    });
  } catch (error: any) {
    const logger = Container.get(Logger);
    logger.error('Failed to retrieve credential:', { 
      credentialId: req.params.id, 
      error: error?.message || error 
    });
    
    if (error.name === 'NotFoundError') {
      res.status(404).json({
        success: false,
        error: 'Credential not found'
      });
      return;
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve credential' 
    });
  }
});

// Create new credential - MIRRORED FROM n8n
router.post('/', async (req, res) => {
  try {
    const user = (req as any).user;
    const { name, type, data } = req.body;
    
    if (!name || !type || !data) {
      res.status(400).json({
        success: false,
        error: 'Name, type, and data are required'
      });
      return;
    }
    
    const credentialsService = Container.get(CredentialsService);
    const logger = Container.get(Logger);
    
    // Use n8n's createUnmanagedCredential method
    const newCredential = await credentialsService.createUnmanagedCredential(
      {
        name,
        type,
        data: data as ICredentialDataDecryptedObject,
      },
      user,
    );
    
    logger.info('Credential created', { 
      credentialId: newCredential.id,
      name: newCredential.name,
      type: newCredential.type,
      userId: user.id,
    });
    
    res.status(201).json({
      success: true,
      data: {
        id: newCredential.id,
        name: newCredential.name,
        type: newCredential.type,
        createdAt: newCredential.createdAt,
        updatedAt: newCredential.updatedAt,
      },
      message: 'Credential created successfully',
    });
  } catch (error: any) {
    const logger = Container.get(Logger);
    logger.error('Failed to create credential:', { error: error?.message || error });
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to create credential' 
    });
  }
});

// Update credential - MIRRORED FROM n8n
router.patch('/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { name, type, data } = req.body;
    
    const credentialsService = Container.get(CredentialsService);
    const logger = Container.get(Logger);
    
    // Get existing credential and decrypt it
    const credential = await credentialsService.getOne(user, id);
    const decryptedData = credentialsService.decrypt(credential, true);
    
    // Prepare update data (handles unredacting)
    const preparedData = await credentialsService.prepareUpdateData(
      { name, type, data: data as ICredentialDataDecryptedObject },
      decryptedData,
    );
    
    // Create encrypted data
    const newCredentialData = credentialsService.createEncryptedData({
      id: credential.id,
      name: preparedData.name || credential.name,
      type: preparedData.type || credential.type,
      data: preparedData.data || decryptedData,
    });
    
    // Update
    const responseData = await credentialsService.update(id, newCredentialData);
    
    if (!responseData) {
      res.status(404).json({
        success: false,
        error: `Credential ID "${id}" could not be found to be updated.`
      });
      return;
    }
    
    logger.debug('Credential updated', { credentialId: id });
    
    res.json({
      success: true,
      data: {
        id: responseData.id,
        name: responseData.name,
        type: responseData.type,
        updatedAt: responseData.updatedAt,
      },
    });
  } catch (error: any) {
    const logger = Container.get(Logger);
    logger.error('Failed to update credential:', { 
      credentialId: req.params.id, 
      error: error?.message || error 
    });
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to update credential' 
    });
  }
});

// Delete credential - MIRRORED FROM n8n
router.delete('/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    
    const credentialsService = Container.get(CredentialsService);
    const logger = Container.get(Logger);
    
    await credentialsService.delete(user, id);
    
    logger.info('Credential deleted', { credentialId: id, userId: user.id });
    
    res.json({
      success: true,
      message: 'Credential deleted successfully',
    });
  } catch (error: any) {
    const logger = Container.get(Logger);
    logger.error('Failed to delete credential:', { 
      credentialId: req.params.id, 
      error: error?.message || error 
    });
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to delete credential' 
    });
  }
});

export default router;