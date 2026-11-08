/**
 * Centralized configuration using @n8n/config
 * Replaces raw process.env access with type-safe, validated config classes
 */

import { Container } from '@n8n/di';
import { GlobalConfig } from '@n8n/config';

let configInitialized = false;

/**
 * Initialize configuration in DI container
 * Must be called before any other config access
 */
export function initializeConfig(): void {
  if (configInitialized) {
    return;
  }

  // Create and register GlobalConfig
  const globalConfig = new GlobalConfig();
  Container.set(GlobalConfig, globalConfig);

  configInitialized = true;
}

/**
 * Get GlobalConfig from DI container
 */
export function getConfig(): GlobalConfig {
  if (!configInitialized) {
    throw new Error('Config not initialized. Call initializeConfig() first.');
  }
  return Container.get(GlobalConfig);
}

export { GlobalConfig } from '@n8n/config';
