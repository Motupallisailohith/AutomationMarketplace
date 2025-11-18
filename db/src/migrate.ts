import { Pool, PoolClient } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'automation_platform',
  user: process.env.DB_USER || 'platform_user',
  password: process.env.DB_PASSWORD || 'platform_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  
  try {
    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Get list of executed migrations
    const result = await client.query('SELECT filename FROM migrations');
    const executedMigrations = new Set(result.rows.map(row => row.filename));
    
    // Read migration files
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    for (const filename of migrationFiles) {
      if (!executedMigrations.has(filename)) {
        logger.info(`Executing migration: ${filename}`);
        
        const migrationSQL = fs.readFileSync(
          path.join(migrationsDir, filename),
          'utf8'
        );
        
        await client.query('BEGIN');
        try {
          await client.query(migrationSQL);
          await client.query(
            'INSERT INTO migrations (filename) VALUES ($1)',
            [filename]
          );
          await client.query('COMMIT');
          logger.info(`Migration completed: ${filename}`);
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      }
    }
    
    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getConnection(): Promise<PoolClient> {
  return pool.connect();
}

export { pool };

// Graceful shutdown
process.on('SIGINT', () => {
  pool.end(() => {
    logger.info('Database pool has ended');
    process.exit(0);
  });
});

if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migrations completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration failed:', error);
      process.exit(1);
    });
}