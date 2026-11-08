/**
 * Database configuration for API server
 * Simplified version using @n8n/db entities
 */

import { DataSource } from '@n8n/typeorm';
import path from 'path';
import 'dotenv/config';

// Import ALL entities from @n8n/db to avoid missing relationships
import * as AllEntities from '@n8n/db';

// Import migrations
import { mysqlMigrations, postgresMigrations, sqliteMigrations } from '@n8n/db';

// Extract all entity classes
const entities = Object.values(AllEntities).filter(
  (entity: any) => entity?.prototype && typeof entity === 'function'
);

function getDatabaseType(): 'postgres' | 'mysql' | 'sqlite' {
  const type = process.env.DB_TYPE || 'sqlite';
  
  // Map n8n-style names to TypeORM names
  if (type === 'postgresdb') return 'postgres';
  if (type === 'mysqldb' || type === 'mariadb') return 'mysql';
  
  if (type !== 'postgres' && type !== 'mysql' && type !== 'sqlite') {
    throw new Error(`Unsupported database type: ${type}`);
  }
  return type;
}

function getMigrations() {
  const dbType = getDatabaseType();
  switch (dbType) {
    case 'postgres':
      return postgresMigrations;
    case 'mysql':
      return mysqlMigrations;
    case 'sqlite':
      return sqliteMigrations;
    default:
      return [];
  }
}

export function getDataSourceOptions() {
  const dbType = getDatabaseType();

  const baseConfig = {
    entities,
    migrations: getMigrations(),
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
  };

  switch (dbType) {
    case 'postgres':
      return {
        ...baseConfig,
        type: 'postgres' as const,
        host: process.env.DB_POSTGRESDB_HOST || 'localhost',
        port: parseInt(process.env.DB_POSTGRESDB_PORT || '5432'),
        database: process.env.DB_POSTGRESDB_DATABASE || 'automation_marketplace',
        username: process.env.DB_POSTGRESDB_USER || 'postgres',
        password: process.env.DB_POSTGRESDB_PASSWORD || 'postgres',
        schema: process.env.DB_POSTGRESDB_SCHEMA || 'public',
      };

    case 'mysql':
      return {
        ...baseConfig,
        type: 'mysql' as const,
        host: process.env.DB_MYSQLDB_HOST || 'localhost',
        port: parseInt(process.env.DB_MYSQLDB_PORT || '3306'),
        database: process.env.DB_MYSQLDB_DATABASE || 'automation_marketplace',
        username: process.env.DB_MYSQLDB_USER || 'root',
        password: process.env.DB_MYSQLDB_PASSWORD || 'root',
      };

    case 'sqlite':
      return {
        ...baseConfig,
        type: 'sqlite' as const,
        database: process.env.DB_SQLITE_DATABASE || path.join(process.cwd(), 'api', 'database.sqlite'),
      };

    default:
      throw new Error(`Unsupported database type: ${dbType}`);
  }
}

let appDataSource: DataSource | null = null;

export async function initializeDatabase(): Promise<DataSource> {
  if (appDataSource && appDataSource.isInitialized) {
    return appDataSource;
  }

  const options = getDataSourceOptions();
  appDataSource = new DataSource(options);

  await appDataSource.initialize();
  console.log(`✅ Database initialized successfully (${options.type})`);

  return appDataSource;
}

export async function closeDatabase(): Promise<void> {
  if (appDataSource && appDataSource.isInitialized) {
    await appDataSource.destroy();
    appDataSource = null;
    console.log('✅ Database connection closed');
  }
}

export function getDataSource(): DataSource {
  if (!appDataSource || !appDataSource.isInitialized) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return appDataSource;
}
