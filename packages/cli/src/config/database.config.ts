import { DataSource, DataSourceOptions } from 'typeorm';
import path from 'path';
import 'dotenv/config';
import * as entities from '../entities';

const entityList = Object.values(entities);

function getDatabaseConfig(): DataSourceOptions {
  const dbType = (process.env.DB_TYPE || 'postgres') as 'postgres' | 'mysql' | 'sqlite';

  const baseConfig = {
    entities: entityList,
    migrations: [path.join(__dirname, '../migrations/*{.ts,.js}')],
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
  };

  switch (dbType) {
    case 'postgres':
      return {
        ...baseConfig,
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'automation_marketplace',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        schema: process.env.DB_SCHEMA || 'public',
      };

    case 'mysql':
      return {
        ...baseConfig,
        type: 'mysql',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        database: process.env.DB_NAME || 'automation_marketplace',
        username: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
      };

    case 'sqlite':
      return {
        ...baseConfig,
        type: 'sqlite',
        database: process.env.DB_PATH || path.join(process.cwd(), 'database.sqlite'),
      };

    default:
      throw new Error(`Unsupported database type: ${dbType}`);
  }
}

export const dataSourceConfig = getDatabaseConfig();
export const AppDataSource = new DataSource(dataSourceConfig);

export async function initializeDatabase(): Promise<DataSource> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    console.log('✅ Database initialized successfully');
  }
  return AppDataSource;
}

export async function closeDatabase(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('✅ Database connection closed');
  }
}
