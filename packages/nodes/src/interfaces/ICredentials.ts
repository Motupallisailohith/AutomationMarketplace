/**
 * Credential interfaces for authentication
 * Reference: n8n/packages/workflow/src/Interfaces.ts
 */

export interface ICredentialsDecrypted {
  id: string;
  name: string;
  type: string;
  data: { [key: string]: any };
}

export interface IHttpBasicAuth {
  user: string;
  password: string;
}

export interface IHttpBearerAuth {
  token: string;
}

export interface IHttpHeaderAuth {
  name: string;
  value: string;
}

export interface IHttpQueryAuth {
  name: string;
  value: string;
}

export interface IHttpDigestAuth {
  user: string;
  password: string;
}

export interface IHttpCustomAuth {
  json: string; // JSON containing headers, body, qs
}

export interface IOAuth1 {
  consumerKey: string;
  consumerSecret: string;
  token: string;
  tokenSecret: string;
  signatureMethod: string;
}

export interface IOAuth2 {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
}
