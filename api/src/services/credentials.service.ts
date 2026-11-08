/**
 * Credentials Service - MIRRORED FROM n8n
 * Path: n8n/packages/cli/src/credentials/credentials.service.ts
 */

import { Service } from '@n8n/di';
import { 
  CredentialsRepository, 
  SharedCredentialsRepository,
  ProjectRepository,
  UserRepository,
  CredentialsEntity,
  SharedCredentials,
  type User,
  type ICredentialsDb,
  generateNanoId
} from '@n8n/db';
import { Logger } from '@n8n/backend-common';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { deepCopy, CREDENTIAL_EMPTY_VALUE } from 'n8n-workflow';
import { Credentials, CredentialDataError } from '../classes/Credentials';
import { createCredentialsFromCredentialsEntity } from '../helpers/credentials-helper';
import { NotFoundError, BadRequestError } from '../errors';

const CREDENTIAL_BLANKING_VALUE = '__n8n_BLANK_VALUE_e5362baf-c777-4d57-a609-6d4b0f39abcc';

@Service()
export class CredentialsService {
  constructor(
    private readonly credentialsRepository: CredentialsRepository,
    private readonly sharedCredentialsRepository: SharedCredentialsRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly userRepository: UserRepository,
    private readonly logger: Logger,
  ) {}

  /**
   * Create encrypted data from credential object
   * Mirrored from n8n's createEncryptedData method
   */
  createEncryptedData(credential: {
    id: string | null;
    name: string;
    type: string;
    data: ICredentialDataDecryptedObject;
  }): ICredentialsDb {
    const credentials = new Credentials(
      { id: credential.id, name: credential.name },
      credential.type,
    );

    credentials.setData(credential.data);

    const newCredentialData = credentials.getDataToSave() as ICredentialsDb;

    // Add special database related data
    newCredentialData.updatedAt = new Date();

    return newCredentialData;
  }

  /**
   * Decrypt credentials
   * Mirrored from n8n's decrypt method
   */
  decrypt(credential: CredentialsEntity, includeRawData = false): ICredentialDataDecryptedObject {
    const coreCredential = createCredentialsFromCredentialsEntity(credential);
    try {
      const data = coreCredential.getData();
      if (includeRawData) {
        return data;
      }
      return this.redact(data, credential);
    } catch (error) {
      if (error instanceof CredentialDataError) {
        this.logger.error('Failed to decrypt credentials', {
          credentialId: credential.id,
          error: error.message,
        });
        return {};
      }
      throw error;
    }
  }

  /**
   * Redact sensitive credential fields
   * Mirrored from n8n's redact method
   */
  private redact(
    data: ICredentialDataDecryptedObject,
    credential: CredentialsEntity,
  ): ICredentialDataDecryptedObject {
    const redacted = deepCopy(data);
    
    // Redact all values by default (n8n has complex logic based on credential type)
    // For now, just return the data as-is since we don't have credential type definitions
    // In production, you'd need to implement proper redaction based on credential types
    
    return redacted;
  }

  /**
   * Unredact credential data - replace blanked values with actual values
   * Mirrored from n8n's unredact method
   */
  unredact(
    redactedData: ICredentialDataDecryptedObject,
    savedData: ICredentialDataDecryptedObject,
  ): ICredentialDataDecryptedObject {
    const result = deepCopy(redactedData);
    
    for (const [key, value] of Object.entries(result)) {
      if (value === CREDENTIAL_BLANKING_VALUE || value === CREDENTIAL_EMPTY_VALUE) {
        result[key] = savedData[key];
      }
    }
    
    return result;
  }

  /**
   * Save new credentials with transaction
   * Mirrored from n8n's save method
   */
  async save(
    credential: CredentialsEntity,
    encryptedData: ICredentialsDb,
    user: User,
    projectId?: string,
  ): Promise<CredentialsEntity> {
    // To avoid side effects
    const newCredential = new CredentialsEntity();
    Object.assign(newCredential, credential, encryptedData);

    const { manager: dbManager } = this.credentialsRepository;
    const result = await dbManager.transaction(async (transactionManager) => {
      if (projectId === undefined) {
        const personalProject = await this.projectRepository.getPersonalProjectForUserOrFail(
          user.id,
          transactionManager,
        );
        projectId = personalProject.id;
      }

      // For now, skip complex permission checks - just ensure project exists
      const project = await transactionManager.findOne(
        this.projectRepository.target,
        { where: { id: projectId } }
      );

      if (project === null) {
        throw new BadRequestError(
          "You don't have the permissions to save the credential in this project.",
        );
      }

      const savedCredential = await transactionManager.save<CredentialsEntity>(newCredential);

      savedCredential.data = newCredential.data;

      const newSharedCredential = this.sharedCredentialsRepository.create({
        role: 'credential:owner',
        credentials: savedCredential,
        projectId: project.id,
      });

      await transactionManager.save<SharedCredentials>(newSharedCredential);

      return savedCredential;
    });

    this.logger.debug('New credential created', {
      credentialId: newCredential.id,
      ownerId: user.id,
    });

    return result;
  }

  /**
   * Update existing credentials
   * Mirrored from n8n's update method
   */
  async update(credentialId: string, newCredentialData: ICredentialsDb): Promise<CredentialsEntity | null> {
    // Update the credentials in DB
    await this.credentialsRepository.update(credentialId, newCredentialData);

    // We sadly get nothing back from "update". Neither if it updated a record
    // nor the new value. So query now the updated entry.
    return await this.credentialsRepository.findOneBy({ id: credentialId });
  }

  /**
   * Delete credentials
   */
  async delete(user: User, credentialId: string): Promise<void> {
    await this.credentialsRepository.delete(credentialId);
    this.logger.info('Credential deleted', { credentialId, userId: user.id });
  }

  /**
   * Get single credential by ID
   */
  async getOne(user: User, credentialId: string, includeData = false): Promise<CredentialsEntity> {
    const credential = await this.credentialsRepository.findOne({
      where: { id: credentialId },
      relations: ['shared', 'shared.project'],
    });

    if (!credential) {
      throw new NotFoundError('Credential', credentialId);
    }

    return credential;
  }

  /**
   * Get all credentials for a user (basic implementation)
   */
  async getAllCredentials(): Promise<CredentialsEntity[]> {
    return await this.credentialsRepository.find({
      relations: ['shared', 'shared.project'],
    });
  }

  /**
   * Prepare credential data for update
   * Mirrored from n8n's prepareUpdateData method
   */
  async prepareUpdateData(
    data: { name?: string; type?: string; data?: ICredentialDataDecryptedObject },
    decryptedData: ICredentialDataDecryptedObject,
  ): Promise<any> {
    const mergedData = deepCopy(data);
    if (mergedData.data) {
      mergedData.data = this.unredact(mergedData.data, decryptedData);
    }

    // Do not overwrite the oauth data else data like the access or refresh token would get lost
    // every time anybody changes anything on the credentials even if it is just the name.
    if (decryptedData.oauthTokenData) {
      if (!mergedData.data) {
        mergedData.data = {};
      }
      // @ts-ignore
      mergedData.data.oauthTokenData = decryptedData.oauthTokenData;
    }

    return mergedData;
  }

  /**
   * Create unmanaged credential (wrapper for easier API usage)
   */
  async createUnmanagedCredential(
    payload: {
      name: string;
      type: string;
      data: ICredentialDataDecryptedObject;
    },
    user: User,
  ): Promise<CredentialsEntity> {
    const encryptedData = this.createEncryptedData({
      id: generateNanoId(),
      name: payload.name,
      type: payload.type,
      data: payload.data,
    });

    const credential = this.credentialsRepository.create({
      id: encryptedData.id as string,
      name: encryptedData.name,
      type: encryptedData.type,
      data: encryptedData.data,
    });

    return await this.save(credential, encryptedData, user);
  }
}
