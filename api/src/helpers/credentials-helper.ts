/**
 * Credentials helper - mirrored from n8n
 * Path: n8n/packages/cli/src/credentials-helper.ts
 */

import type { CredentialsEntity } from '@n8n/db';
import { Credentials } from '../classes/Credentials';

/**
 * Convert CredentialsEntity to Credentials class instance
 * This allows us to use the encryption/decryption methods
 */
export function createCredentialsFromCredentialsEntity(
  credential: CredentialsEntity,
): Credentials {
  const { id, name, type, data } = credential;
  const credentials = new Credentials({ id, name }, type);
  
  // Set encrypted data directly (don't re-encrypt)
  credentials.data = data;
  
  return credentials;
}
