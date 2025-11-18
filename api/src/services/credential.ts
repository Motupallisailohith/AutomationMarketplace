import crypto from 'crypto';
import { databaseService } from './database';
import { logger } from '../shared/logger';

interface CreateCredentialParams {
  id?: string;
  name: string;
  type: string;
  data: Record<string, any>;
  description?: string;
  userId: string;
}

interface UpdateCredentialParams {
  name?: string;
  description?: string;
  data?: Record<string, any>;
}

interface CredentialResponse {
  id: string;
  name: string;
  type: string;
  description?: string;
  dataKeys: string[]; // Only return the keys, not the actual values
  createdAt: string;
  updatedAt: string;
  userId: string;
  isEncrypted: boolean;
}

interface DecryptedCredential {
  id: string;
  name: string;
  type: string;
  data: Record<string, any>;
  description?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

class CredentialService {
  private encryptionKey: Buffer;

  constructor() {
    // Get encryption key from environment or generate one
    const key = process.env.ENCRYPTION_KEY;
    if (key) {
      this.encryptionKey = Buffer.from(key, 'hex');
    } else {
      // Generate a new key (for development only)
      this.encryptionKey = crypto.randomBytes(32);
      logger.warn('No ENCRYPTION_KEY found, generated temporary key. Set ENCRYPTION_KEY in production!');
    }
  }

  private encrypt(data: string): { encryptedData: string; iv: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
    cipher.setAAD(Buffer.from('automation-marketplace', 'utf8'));
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedData: encrypted,
      iv: iv.toString('hex') + ':' + authTag.toString('hex')
    };
  }

  private decrypt(encryptedData: string, iv: string): string {
    const [, authTagHex] = iv.split(':');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
    decipher.setAAD(Buffer.from('automation-marketplace', 'utf8'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  async createCredential(params: CreateCredentialParams): Promise<CredentialResponse> {
    try {
      const credentialId = params.id || crypto.randomUUID();
      
      // Encrypt sensitive data
      const dataString = JSON.stringify(params.data);
      const { encryptedData, iv } = this.encrypt(dataString);
      
      // Store in database
      await databaseService.createCredential({
        id: credentialId,
        name: params.name,
        type: params.type,
        encryptedData,
        iv,
        description: params.description,
        userId: params.userId,
      });

      logger.info('Credential created', {
        credentialId,
        name: params.name,
        type: params.type,
        userId: params.userId,
      });

      return {
        id: credentialId,
        name: params.name,
        type: params.type,
        description: params.description,
        dataKeys: Object.keys(params.data),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: params.userId,
        isEncrypted: true,
      };
    } catch (error) {
      logger.error('Failed to create credential:', {
        error: (error as Error).message,
        name: params.name,
        type: params.type,
        userId: params.userId,
      });
      throw new Error('Failed to create credential');
    }
  }

  async getCredentials(userId: string): Promise<CredentialResponse[]> {
    try {
      const credentials = await databaseService.getCredentials(userId);
      
      return credentials.map(cred => ({
        id: cred.id,
        name: cred.name,
        type: cred.type,
        description: cred.description,
        dataKeys: this.getDataKeys(cred.encrypted_data, cred.iv),
        createdAt: cred.created_at,
        updatedAt: cred.updated_at,
        userId: cred.user_id,
        isEncrypted: true,
      }));
    } catch (error) {
      logger.error('Failed to get credentials:', {
        error: (error as Error).message,
        userId,
      });
      throw new Error('Failed to retrieve credentials');
    }
  }

  async getCredential(id: string, userId: string): Promise<CredentialResponse | null> {
    try {
      const credential = await databaseService.getCredential(id);
      
      if (!credential || credential.user_id !== userId) {
        return null;
      }

      return {
        id: credential.id,
        name: credential.name,
        type: credential.type,
        description: credential.description,
        dataKeys: this.getDataKeys(credential.encrypted_data, credential.iv),
        createdAt: credential.created_at,
        updatedAt: credential.updated_at,
        userId: credential.user_id,
        isEncrypted: true,
      };
    } catch (error) {
      logger.error('Failed to get credential:', {
        error: (error as Error).message,
        credentialId: id,
        userId,
      });
      throw new Error('Failed to retrieve credential');
    }
  }

  async getDecryptedCredential(id: string, userId: string): Promise<DecryptedCredential | null> {
    try {
      const credential = await databaseService.getCredential(id);
      
      if (!credential || credential.user_id !== userId) {
        return null;
      }

      // Decrypt the data
      const decryptedDataString = this.decrypt(credential.encrypted_data, credential.iv);
      const data = JSON.parse(decryptedDataString);

      logger.info('Credential decrypted', {
        credentialId: id,
        userId,
        name: credential.name,
      });

      return {
        id: credential.id,
        name: credential.name,
        type: credential.type,
        data,
        description: credential.description,
        createdAt: credential.created_at,
        updatedAt: credential.updated_at,
        userId: credential.user_id,
      };
    } catch (error) {
      logger.error('Failed to decrypt credential:', {
        error: (error as Error).message,
        credentialId: id,
        userId,
      });
      throw new Error('Failed to decrypt credential');
    }
  }

  async updateCredential(
    id: string,
    userId: string,
    updates: UpdateCredentialParams
  ): Promise<CredentialResponse> {
    try {
      const existingCredential = await databaseService.getCredential(id);
      
      if (!existingCredential || existingCredential.user_id !== userId) {
        throw new Error('Credential not found or access denied');
      }

      const updateData: any = {};
      
      if (updates.name !== undefined) {
        updateData.name = updates.name;
      }
      
      if (updates.description !== undefined) {
        updateData.description = updates.description;
      }

      if (updates.data !== undefined) {
        const dataString = JSON.stringify(updates.data);
        const { encryptedData, iv } = this.encrypt(dataString);
        updateData.encrypted_data = encryptedData;
        updateData.iv = iv;
      }

      const updatedCredential = await databaseService.updateCredential(id, updateData);

      logger.info('Credential updated', {
        credentialId: id,
        userId,
        updatedFields: Object.keys(updates),
      });

      return {
        id: updatedCredential.id,
        name: updatedCredential.name,
        type: updatedCredential.type,
        description: updatedCredential.description,
        dataKeys: this.getDataKeys(updatedCredential.encrypted_data, updatedCredential.iv),
        createdAt: updatedCredential.created_at,
        updatedAt: updatedCredential.updated_at,
        userId: updatedCredential.user_id,
        isEncrypted: true,
      };
    } catch (error) {
      logger.error('Failed to update credential:', {
        error: (error as Error).message,
        credentialId: id,
        userId,
      });
      throw new Error('Failed to update credential');
    }
  }

  async deleteCredential(id: string, userId: string): Promise<boolean> {
    try {
      const existingCredential = await databaseService.getCredential(id);
      
      if (!existingCredential || existingCredential.user_id !== userId) {
        return false;
      }

      await databaseService.deleteCredential(id);

      logger.info('Credential deleted', {
        credentialId: id,
        userId,
        name: existingCredential.name,
      });

      return true;
    } catch (error) {
      logger.error('Failed to delete credential:', {
        error: (error as Error).message,
        credentialId: id,
        userId,
      });
      throw new Error('Failed to delete credential');
    }
  }

  private getDataKeys(encryptedData: string, iv: string): string[] {
    try {
      const decryptedString = this.decrypt(encryptedData, iv);
      const data = JSON.parse(decryptedString);
      return Object.keys(data);
    } catch (error) {
      logger.warn('Failed to decrypt data for key extraction:', {
        error: (error as Error).message,
      });
      return [];
    }
  }

  // Utility method to validate credential data based on type
  validateCredentialData(type: string, data: Record<string, any>): boolean {
    switch (type) {
      case 'api_key':
        return typeof data.apiKey === 'string' && data.apiKey.length > 0;
      
      case 'oauth2':
        return (
          typeof data.clientId === 'string' &&
          typeof data.clientSecret === 'string' &&
          data.clientId.length > 0 &&
          data.clientSecret.length > 0
        );
      
      case 'basic_auth':
        return (
          typeof data.username === 'string' &&
          typeof data.password === 'string' &&
          data.username.length > 0 &&
          data.password.length > 0
        );
      
      case 'jwt':
        return (
          typeof data.token === 'string' &&
          data.token.length > 0
        );
      
      case 'database':
        return (
          typeof data.connectionString === 'string' ||
          (typeof data.host === 'string' && typeof data.database === 'string')
        );
      
      case 'smtp':
        return (
          typeof data.host === 'string' &&
          typeof data.port === 'number' &&
          typeof data.username === 'string' &&
          typeof data.password === 'string'
        );
      
      default:
        // For custom credential types, just check that data exists
        return Object.keys(data).length > 0;
    }
  }

  // Get credential types available in the system
  getSupportedCredentialTypes(): Array<{ type: string; name: string; fields: string[] }> {
    return [
      {
        type: 'api_key',
        name: 'API Key',
        fields: ['apiKey', 'baseUrl?', 'headers?']
      },
      {
        type: 'oauth2',
        name: 'OAuth 2.0',
        fields: ['clientId', 'clientSecret', 'redirectUri?', 'scope?']
      },
      {
        type: 'basic_auth',
        name: 'Basic Authentication',
        fields: ['username', 'password', 'realm?']
      },
      {
        type: 'jwt',
        name: 'JWT Token',
        fields: ['token', 'algorithm?', 'issuer?']
      },
      {
        type: 'database',
        name: 'Database Connection',
        fields: ['host', 'port', 'database', 'username', 'password', 'ssl?']
      },
      {
        type: 'smtp',
        name: 'SMTP Server',
        fields: ['host', 'port', 'username', 'password', 'secure?']
      },
      {
        type: 'custom',
        name: 'Custom',
        fields: ['*']
      }
    ];
  }
}

export const credentialService = new CredentialService();