/**
 * Credentials class - mirrored from n8n
 * Path: n8n/packages/core/src/credentials.ts
 */

import { Container } from '@n8n/di';
import type { ICredentialDataDecryptedObject, ICredentialsEncrypted } from 'n8n-workflow';
import { ApplicationError, ICredentials } from 'n8n-workflow';
import { Cipher } from '../encryption/cipher';

export class CredentialDataError extends ApplicationError {
  constructor({ name, type, id }: Credentials<object>, message: string, cause?: unknown) {
    super(message, {
      extra: { name, type, id },
      cause,
    });
  }
}

const CREDENTIAL_ERRORS = {
  NO_DATA: 'Credential data is not set',
  DECRYPTION_FAILED: 'Failed to decrypt credential data',
  INVALID_JSON: 'Decrypted credential data is not valid JSON',
};

function isObjectLiteral(value: unknown): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class Credentials<T extends object = ICredentialDataDecryptedObject> extends ICredentials<T> {
  private readonly cipher = Container.get(Cipher);

  /**
   * Sets new credential object
   */
  setData(data: T): void {
    if (!isObjectLiteral(data)) {
      throw new Error('Credential data must be an object literal');
    }

    this.data = this.cipher.encrypt(data);
  }

  /**
   * Update parts of the credential data.
   * This decrypts the data, modifies it, and then re-encrypts the updated data back to a string.
   */
  updateData(toUpdate: Partial<T>, toDelete: Array<keyof T> = []) {
    const updatedData: T = { ...this.getData(), ...toUpdate };
    for (const key of toDelete) {
      delete updatedData[key];
    }
    this.setData(updatedData);
  }

  /**
   * Returns the decrypted credential object
   */
  getData(): T {
    if (this.data === undefined) {
      throw new CredentialDataError(this, CREDENTIAL_ERRORS.NO_DATA);
    }

    let decryptedData: string;
    try {
      decryptedData = this.cipher.decrypt(this.data);
    } catch (cause) {
      throw new CredentialDataError(this, CREDENTIAL_ERRORS.DECRYPTION_FAILED, cause);
    }

    try {
      return JSON.parse(decryptedData);
    } catch (cause) {
      throw new CredentialDataError(this, CREDENTIAL_ERRORS.INVALID_JSON, cause);
    }
  }

  /**
   * Returns the encrypted credentials to be saved
   */
  getDataToSave(): ICredentialsEncrypted {
    if (this.data === undefined) {
      throw new ApplicationError('No credentials were set to save.');
    }

    return {
      id: this.id,
      name: this.name,
      type: this.type,
      data: this.data,
    };
  }
}
