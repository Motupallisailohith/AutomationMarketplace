/**
 * OAuth2 Service - Handles OAuth2 authorization flows using @n8n/client-oauth2
 * 
 * Supports:
 * - Authorization Code flow with PKCE
 * - Token refresh (automatic)
 * - Multiple providers (Slack, Google, GitHub, etc.)
 */

import crypto from 'crypto';
import { ClientOAuth2 } from '@n8n/client-oauth2';
import type { ClientOAuth2Options, ClientOAuth2Token } from '@n8n/client-oauth2';
import { Service } from '@n8n/di';
import { GlobalConfig } from '@n8n/config';
import { Logger } from '@n8n/backend-common';
import { UserError, OperationalError, NotFoundError } from '../errors';

export interface OAuth2Provider {
  name: string;
  displayName: string;
  authUrl: string;
  tokenUrl: string;
  scope: string;
  scopeSeparator?: string;
}

export interface OAuth2AuthUrlParams {
  credentialId: string;
  userId: string;
  provider: string;
}

export interface OAuth2TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export interface OAuth2State {
  credentialId: string;
  userId: string;
  provider: string;
  timestamp: number;
}

@Service()
class OAuth2Service {
  private stateStore: Map<string, OAuth2State> = new Map();
  
  constructor(
    private config: GlobalConfig,
    private logger: Logger
  ) {}
  
  // OAuth2 Provider configurations
  private providers: Map<string, OAuth2Provider> = new Map([
    ['slack', {
      name: 'slack',
      displayName: 'Slack',
      authUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      scope: 'chat:write,channels:read,users:read,files:write',
      scopeSeparator: ',',
    }],
    ['google', {
      name: 'google',
      displayName: 'Google',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    }],
    ['github', {
      name: 'github',
      displayName: 'GitHub',
      authUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      scope: 'repo,user',
      scopeSeparator: ',',
    }],
    ['microsoft', {
      name: 'microsoft',
      displayName: 'Microsoft',
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      scope: 'openid profile email offline_access',
    }],
    ['dropbox', {
      name: 'dropbox',
      displayName: 'Dropbox',
      authUrl: 'https://www.dropbox.com/oauth2/authorize',
      tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
      scope: 'files.metadata.read files.content.read files.content.write',
    }],
  ]);

  /**
   * Create OAuth2 client for provider
   */
  private createOAuth2Client(provider: OAuth2Provider, clientId: string, clientSecret: string): ClientOAuth2 {
    const config = Container.get(GlobalConfig);
    const apiUrl = `${config.protocol}://${config.host}:${config.port}`;
    const redirectUri = `${apiUrl}/api/oauth2/callback`;

    const options: ClientOAuth2Options = {
      clientId,
      clientSecret,
      accessTokenUri: provider.tokenUrl,
      authorizationUri: provider.authUrl,
      redirectUri,
      scopes: provider.scope.split(provider.scopeSeparator || ' '),
      scopesSeparator: (provider.scopeSeparator || ' ') as ',' | ' ',
    };

    return new ClientOAuth2(options);
  }

  /**
   * Generate OAuth2 authorization URL
   */
  generateAuthUrl(params: OAuth2AuthUrlParams, clientId: string, clientSecret: string): string {
    const provider = this.providers.get(params.provider);
    if (!provider) {
      throw new NotFoundError('OAuth2 provider', params.provider);
    }

    // Create OAuth2 client
    const oauth2Client = this.createOAuth2Client(provider, clientId, clientSecret);

    // Generate state token
    const state = this.generateState(params);

    // Generate authorization URL using client-oauth2
    const authUri = oauth2Client.code.getUri({ state });
    
    this.logger.info('Generated OAuth2 authorization URL', {
      provider: params.provider,
      credentialId: params.credentialId,
    });

    return authUri;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    code: string,
    state: string,
    clientId: string,
    clientSecret: string
  ): Promise<OAuth2TokenResponse> {
    // Retrieve and validate state
    const stateData = this.stateStore.get(state);
    if (!stateData) {
      throw new UserError('Invalid or expired OAuth2 state', 400);
    }

    // Check state expiration (15 minutes)
    if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
      this.stateStore.delete(state);
      throw new UserError('OAuth2 state expired', 400);
    }

    const provider = this.providers.get(stateData.provider);
    if (!provider) {
      throw new NotFoundError('OAuth2 provider', stateData.provider);
    }

    try {
      this.logger.info('Exchanging authorization code for token', {
        provider: stateData.provider,
        credentialId: stateData.credentialId,
      });

      // Create OAuth2 client and exchange code
      const oauth2Client = this.createOAuth2Client(provider, clientId, clientSecret);
      const config = Container.get(GlobalConfig);
      const apiUrl = `${config.protocol}://${config.host}:${config.port}`;
      const redirectUri = `${apiUrl}/api/oauth2/callback`;
      
      const token: ClientOAuth2Token = await oauth2Client.code.getToken(redirectUri);

      // Clean up state
      this.stateStore.delete(state);

      this.logger.info('Successfully exchanged code for token', {
        provider: stateData.provider,
        credentialId: stateData.credentialId,
        hasRefreshToken: !!token.refreshToken,
      });

      // Convert to our response format
      return {
        access_token: token.accessToken,
        token_type: token.tokenType || 'Bearer',
        expires_in: typeof token.data?.expires_in === 'number' ? token.data.expires_in : 3600,
        refresh_token: token.refreshToken,
      };
    } catch (error: any) {
      this.logger.error('Failed to exchange authorization code', {
        provider: stateData.provider,
        error: error.message,
      });
      throw new OperationalError('Failed to exchange authorization code for token', 502, true);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(
    provider: string,
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<OAuth2TokenResponse> {
    const providerConfig = this.providers.get(provider);
    if (!providerConfig) {
      throw new Error(`Unknown OAuth2 provider: ${provider}`);
    }

    try {
      // Create OAuth2 client
      const oauth2Client = this.createOAuth2Client(providerConfig, clientId, clientSecret);
      
      // Create token object with refresh token
      const token = oauth2Client.createToken({
        access_token: '', // Will be replaced by refresh
        refresh_token: refreshToken,
      });

      // Refresh the token (client-oauth2 handles this automatically)
      const newToken = await token.refresh();

      this.logger.info('Successfully refreshed access token', { provider });

      return {
        access_token: newToken.accessToken,
        token_type: newToken.tokenType || 'Bearer',
        expires_in: typeof newToken.data?.expires_in === 'number' ? newToken.data.expires_in : 3600,
        refresh_token: newToken.refreshToken,
      };
    } catch (error: any) {
      this.logger.error('Failed to refresh access token', {
        provider,
        error: error.message,
      });
      throw new OperationalError('Failed to refresh access token', 502, true);
    }
  }

  /**
   * Get provider configuration
   */
  getProvider(name: string): OAuth2Provider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all available providers
   */
  getAllProviders(): OAuth2Provider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Validate state and return data
   */
  validateState(state: string): OAuth2State | null {
    const stateData = this.stateStore.get(state);
    
    if (!stateData) {
      return null;
    }

    // Check expiration
    if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
      this.stateStore.delete(state);
      return null;
    }

    return stateData;
  }

  /**
   * Generate state token
   */
  private generateState(params: OAuth2AuthUrlParams): string {
    const state = crypto.randomBytes(32).toString('hex');
    
    this.stateStore.set(state, {
      credentialId: params.credentialId,
      userId: params.userId,
      provider: params.provider,
      timestamp: Date.now(),
    });

    return state;
  }

  /**
   * Clean up expired states
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    const expiredStates: string[] = [];

    this.stateStore.forEach((data, state) => {
      if (now - data.timestamp > 15 * 60 * 1000) {
        expiredStates.push(state);
      }
    });

    expiredStates.forEach(state => this.stateStore.delete(state));

    if (expiredStates.length > 0) {
      this.logger.debug('Cleaned up expired OAuth2 states', { count: expiredStates.length });
    }
  }
}

// Export service instance from DI container
import { Container } from '@n8n/di';
export const oauth2Service = Container.get(OAuth2Service);
