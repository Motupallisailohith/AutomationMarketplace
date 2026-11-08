/**
 * Credential type definitions for various integrations
 */

export interface ICredentialDataDecryptedObject {
  [key: string]: string | number | boolean | ICredentialDataDecryptedObject;
}

// Google Sheets OAuth2
export interface GoogleSheetsOAuth2ApiCredentials extends ICredentialDataDecryptedObject {
  accessToken: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}

// Slack API
export interface SlackApiCredentials extends ICredentialDataDecryptedObject {
  accessToken: string;
}

// SMTP
export interface SmtpCredentials extends ICredentialDataDecryptedObject {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
}

// MySQL
export interface MySqlCredentials extends ICredentialDataDecryptedObject {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

// Redis
export interface RedisCredentials extends ICredentialDataDecryptedObject {
  host: string;
  port: number;
  password: string;
  database: number;
}

// AWS
export interface AwsCredentials extends ICredentialDataDecryptedObject {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

// OpenAI
export interface OpenAiApiCredentials extends ICredentialDataDecryptedObject {
  apiKey: string;
}

// Twilio
export interface TwilioApiCredentials extends ICredentialDataDecryptedObject {
  accountSid: string;
  authToken: string;
}
