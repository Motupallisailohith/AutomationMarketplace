/**
 * Database initialization using @n8n/db
 * Replaces raw PostgreSQL pool with TypeORM + Repository pattern
 */

import 'reflect-metadata';
import { Container } from '@n8n/di';
import { DbConnection, DbConnectionOptions } from '@n8n/db';
import { DataSource } from '@n8n/typeorm';
import { DatabaseConfig } from '@n8n/config';
import { InstanceSettingsConfig, GlobalConfig } from '@n8n/config';
import { Logger } from '@n8n/backend-common';
import { BinaryDataConfig, ErrorReporter } from 'n8n-core';
import { getConfig } from '../config';

let dbConnection: DbConnection;
let dataSource: DataSource;

/**
 * Initialize the database connection
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Initialize config first
    const { initializeConfig } = await import('../config');
    initializeConfig();
    
    // Get global config (already initialized in index.ts)
    const globalConfig = getConfig();
    
    // Setup DI container services
    if (!Container.has(GlobalConfig)) {
      Container.set(GlobalConfig, globalConfig);
    }
    
    if (!Container.has(DatabaseConfig)) {
      Container.set(DatabaseConfig, globalConfig.database);
    }
    
    if (!Container.has(InstanceSettingsConfig)) {
      Container.set(InstanceSettingsConfig, new InstanceSettingsConfig());
    }
    
    if (!Container.has(Logger)) {
      const instanceConfig = Container.get(InstanceSettingsConfig);
      Container.set(Logger, new Logger(globalConfig, instanceConfig));
    }
    
    if (!Container.has(BinaryDataConfig)) {
      // BinaryDataConfig will use defaults from environment
      Container.set(BinaryDataConfig, {} as BinaryDataConfig);
    }
    
    if (!Container.has(ErrorReporter)) {
      Container.set(ErrorReporter, {
        error: (error: Error) => console.error('Error:', error),
      } as ErrorReporter);
    }

    // Get database connection
    dbConnection = Container.get(DbConnection);
    await dbConnection.init();
    
    // Run migrations
    await dbConnection.migrate();
    
    // Get DataSource for repositories
    dataSource = Container.get(DataSource);
    
    const logger = Container.get(Logger);
    logger.info('Database initialized successfully with @n8n/db');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Get the DataSource instance
 */
export function getDataSource(): DataSource {
  if (!dataSource) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return dataSource;
}

/**
 * Get the DbConnection instance
 */
export function getDbConnection(): DbConnection {
  if (!dbConnection) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return dbConnection;
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (dbConnection) {
    await dbConnection.close();
  }
}

// Export commonly used repositories
// Re-export commonly used types from @n8n/db
export type { 
  WorkflowRepository,
  CredentialsRepository,
  ExecutionRepository,
  SharedWorkflowRepository,
  SharedCredentialsRepository,
  ProjectRepository,
  UserRepository
} from '@n8n/db';

export type {
  WorkflowEntity,
  CredentialsEntity,
  ExecutionEntity,
  SharedWorkflow,
  SharedCredentials,
  Project,
  User
} from '@n8n/db';
