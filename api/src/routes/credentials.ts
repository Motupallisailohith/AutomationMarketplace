import { Router } from 'express';
import { credentialService } from '../services/credential';
import { logger } from '../shared/logger';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get all credentials for authenticated user
router.get('/', async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    
    const credentials = await credentialService.getCredentials(userId);
    
    logger.info('Credentials retrieved', { userId, count: credentials.length });
    
    res.json({
      success: true,
      data: credentials,
    });
  } catch (error: any) {
    logger.error('Failed to retrieve credentials:', { error: error?.message || error });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve credentials' 
    });
  }
});

// Get specific credential (without decrypted data)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    
    const credential = await credentialService.getCredential(id, userId);
    
    if (!credential) {
      res.status(404).json({
        success: false,
        error: 'Credential not found'
      });
      return;
    }
    
    logger.info('Credential retrieved', { credentialId: id, userId });
    
    res.json({
      success: true,
      data: credential,
    });
  } catch (error: any) {
    logger.error('Failed to retrieve credential:', { 
      credentialId: req.params.id, 
      error: error?.message || error 
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve credential' 
    });
  }
});

// Create new credential
router.post('/', async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { name, type, description, data } = req.body;
    
    if (!name || !type || !data) {
      res.status(400).json({
        success: false,
        error: 'Name, type, and data are required'
      });
      return;
    }
    
    // Validate credential data based on type
    if (!credentialService.validateCredentialData(type, data)) {
      res.status(400).json({
        success: false,
        error: `Invalid data format for credential type: ${type}`
      });
      return;
    }
    
    const credential = await credentialService.createCredential({
      name,
      type,
      description,
      data,
      userId,
    });
    
    logger.info('Credential created', { 
      credentialId: credential.id,
      name: credential.name,
      type: credential.type,
      userId 
    });
    
    res.status(201).json({
      success: true,
      data: credential,
      message: 'Credential created successfully',
    });
  } catch (error: any) {
    logger.error('Failed to create credential:', { error: error?.message || error });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create credential' 
    });
  }
});

// Get supported credential types
router.get('/types/supported', async (_req, res) => {
  try {
    const types = credentialService.getSupportedCredentialTypes();
    
    res.json({
      success: true,
      data: types,
    });
  } catch (error: any) {
    logger.error('Failed to get credential types:', { error: error?.message || error });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get credential types' 
    });
  }
});

export default router;