/**
 * OAuth2 Routes
 * 
 * Handles OAuth2 authorization flows for third-party integrations
 * Supports: Slack, Google, GitHub, Microsoft, Dropbox, etc.
 */

import { Router, Request, Response } from 'express';
import { oauth2Service } from '../services/oauth2.service';
import { credentialService } from '../services/credential';
import { logger } from '../shared/logger';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * GET /api/oauth2/providers
 * Get list of available OAuth2 providers
 */
router.get('/providers', async (_req: Request, res: Response) => {
  try {
    const providers = oauth2Service.getAllProviders();
    
    res.json({
      success: true,
      data: providers.map(p => ({
        name: p.name,
        displayName: p.displayName,
        authUrl: p.authUrl,
        scope: p.scope,
      })),
    });
  } catch (error: any) {
    logger.error('Failed to get OAuth2 providers', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get OAuth2 providers',
    });
  }
});

/**
 * POST /api/oauth2/auth/start
 * Start OAuth2 authorization flow
 * 
 * Body:
 * - credentialId: ID of credential being created/updated
 * - provider: OAuth2 provider name (e.g., 'slack', 'google')
 * - clientId: OAuth2 client ID
 */
router.post('/auth/start', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { credentialId, provider, clientId } = req.body;

    if (!credentialId || !provider || !clientId) {
      res.status(400).json({
        success: false,
        error: 'credentialId, provider, and clientId are required',
      });
      return;
    }

    // Verify provider exists
    const providerConfig = oauth2Service.getProvider(provider);
    if (!providerConfig) {
      res.status(400).json({
        success: false,
        error: `Unknown OAuth2 provider: ${provider}`,
      });
      return;
    }

    // Verify credential exists and belongs to user
    const credential = await credentialService.getCredential(credentialId, userId);
    if (!credential) {
      res.status(404).json({
        success: false,
        error: 'Credential not found',
      });
      return;
    }

    // Get clientSecret from credential data
    const credentialData = (credential as any).data || {};
    const clientSecret = credentialData?.clientSecret || '';

    // Generate authorization URL
    const authUrl = oauth2Service.generateAuthUrl(
      { credentialId, userId, provider },
      clientId,
      clientSecret
    );

    logger.info('OAuth2 authorization started', {
      provider,
      credentialId,
      userId,
    });

    res.json({
      success: true,
      data: {
        authUrl,
        provider,
        credentialId,
      },
    });

  } catch (error: any) {
    logger.error('Failed to start OAuth2 flow', {
      error: error.message,
      body: req.body,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to start OAuth2 authorization',
    });
  }
});

/**
 * GET /api/oauth2/callback
 * OAuth2 callback endpoint (redirect from provider)
 * 
 * Query params:
 * - code: Authorization code from provider
 * - state: State token to validate request
 * - error: Error from provider (if any)
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;

    // Check for error from provider
    if (error) {
      logger.warn('OAuth2 provider returned error', { error });
      
      // Redirect to frontend with error
      const { GlobalConfig } = await import('@n8n/config');
      const { Container } = await import('@n8n/di');
      const config = Container.get(GlobalConfig);
      const frontendUrl = `${config.protocol}://${config.host}:${parseInt(String(config.port)) + 2172}`;
      res.redirect(`${frontendUrl}/credentials?oauth_error=${encodeURIComponent(error as string)}`);
      return;
    }

    if (!code || !state) {
      res.status(400).json({
        success: false,
        error: 'Missing code or state parameter',
      });
      return;
    }

    // Validate state and get context
    const stateData = oauth2Service.validateState(state as string);
    if (!stateData) {
      res.status(400).json({
        success: false,
        error: 'Invalid or expired state token',
      });
      return;
    }

    // Get credential to retrieve client secret
    const credential = await credentialService.getDecryptedCredential(
      stateData.credentialId,
      stateData.userId
    );

    if (!credential) {
      res.status(404).json({
        success: false,
        error: 'Credential not found',
      });
      return;
    }

    const clientId = credential.data.clientId;
    const clientSecret = credential.data.clientSecret;

    if (!clientId || !clientSecret) {
      res.status(400).json({
        success: false,
        error: 'Client credentials not configured',
      });
      return;
    }

    // Exchange code for tokens
    const tokens = await oauth2Service.exchangeCodeForToken(
      code as string,
      state as string,
      clientId,
      clientSecret
    );

    // Update credential with tokens
    await credentialService.updateCredential(
      stateData.credentialId,
      stateData.userId,
      {
        data: {
          ...credential.data,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenType: tokens.token_type,
          expiresAt: tokens.expires_in 
            ? Date.now() + tokens.expires_in * 1000 
            : undefined,
          scope: tokens.scope,
        },
      }
    );

    logger.info('OAuth2 tokens stored successfully', {
      provider: stateData.provider,
      credentialId: stateData.credentialId,
      hasRefreshToken: !!tokens.refresh_token,
    });

    // Redirect to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(
      `${frontendUrl}/credentials/${stateData.credentialId}?oauth_success=true`
    );

  } catch (error: any) {
    logger.error('OAuth2 callback failed', {
      error: error.message,
      query: req.query,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(
      `${frontendUrl}/credentials?oauth_error=${encodeURIComponent('Authorization failed')}`
    );
  }
});

/**
 * POST /api/oauth2/refresh
 * Refresh OAuth2 access token
 * 
 * Body:
 * - credentialId: ID of credential with refresh token
 */
router.post('/refresh', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { credentialId } = req.body;

    if (!credentialId) {
      res.status(400).json({
        success: false,
        error: 'credentialId is required',
      });
      return;
    }

    // Get credential
    const credential = await credentialService.getDecryptedCredential(
      credentialId,
      userId
    );

    if (!credential) {
      res.status(404).json({
        success: false,
        error: 'Credential not found',
      });
      return;
    }

    const { refreshToken, clientId, clientSecret } = credential.data;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'No refresh token available',
      });
      return;
    }

    // Determine provider from credential type or metadata
    const provider = credential.data.provider || credential.type;

    // Refresh tokens
    const tokens = await oauth2Service.refreshAccessToken(
      provider,
      refreshToken,
      clientId,
      clientSecret
    );

    // Update credential
    await credentialService.updateCredential(credentialId, userId, {
      data: {
        ...credential.data,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || refreshToken, // Keep old refresh token if not returned
        tokenType: tokens.token_type,
        expiresAt: tokens.expires_in 
          ? Date.now() + tokens.expires_in * 1000 
          : undefined,
        scope: tokens.scope,
      },
    });

    logger.info('OAuth2 token refreshed', {
      credentialId,
      provider,
    });

    res.json({
      success: true,
      message: 'Access token refreshed successfully',
    });

  } catch (error: any) {
    logger.error('Failed to refresh OAuth2 token', {
      error: error.message,
      credentialId: req.body.credentialId,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to refresh access token',
    });
  }
});

/**
 * POST /api/oauth2/test
 * Test OAuth2 credential by making a test request
 * 
 * Body:
 * - credentialId: ID of credential to test
 * - testUrl: Optional test URL (uses provider default if not provided)
 */
router.post('/test', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { credentialId, testUrl } = req.body;

    if (!credentialId) {
      res.status(400).json({
        success: false,
        error: 'credentialId is required',
      });
      return;
    }

    // Get credential
    const credential = await credentialService.getDecryptedCredential(
      credentialId,
      userId
    );

    if (!credential) {
      res.status(404).json({
        success: false,
        error: 'Credential not found',
      });
      return;
    }

    const { accessToken } = credential.data;

    if (!accessToken) {
      res.status(400).json({
        success: false,
        error: 'No access token available',
      });
      return;
    }

    // Test URLs for different providers
    const defaultTestUrls: Record<string, string> = {
      slack: 'https://slack.com/api/auth.test',
      google: 'https://www.googleapis.com/oauth2/v2/userinfo',
      github: 'https://api.github.com/user',
      microsoft: 'https://graph.microsoft.com/v1.0/me',
      dropbox: 'https://api.dropboxapi.com/2/users/get_current_account',
    };

    const provider = credential.data.provider || credential.type;
    const url = testUrl || defaultTestUrls[provider];

    if (!url) {
      res.status(400).json({
        success: false,
        error: 'Test URL not configured for this provider',
      });
      return;
    }

    // Make test request
    const axios = require('axios');
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      timeout: 10000,
    });

    logger.info('OAuth2 credential test successful', {
      credentialId,
      provider,
      status: response.status,
    });

    res.json({
      success: true,
      message: 'Credential is valid',
      data: response.data,
    });

  } catch (error: any) {
    logger.error('OAuth2 credential test failed', {
      error: error.message,
      credentialId: req.body.credentialId,
      status: error.response?.status,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Credential test failed',
      details: error.response?.data || error.message,
    });
  }
});

export default router;
