/**
 * Defines credential types (OAuth2, API Key, etc.)
 * Reference: n8n/packages/workflow/src/Interfaces.ts
 */

import { INodeProperties } from './INodeProperties';

export interface ICredentialType {
  name: string;
  displayName: string;
  documentationUrl?: string;
  properties: INodeProperties[];
  
  // For OAuth2 credentials
  authenticate?: IAuthenticateGeneric;
}

export interface IAuthenticateGeneric {
  type: 'generic';
  properties: {
    [key: string]: any;
  };
}

// OAuth2 specific credential data
export interface IOAuth2Options {
  accessTokenUrl?: string;
  authUrl?: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
  grantType?: 'authorizationCode' | 'clientCredentials' | 'pkce';
}
