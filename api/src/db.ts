/**
 * Simple PostgreSQL database pool
 * No TypeORM, no ORM complexity - just raw SQL queries
 */

import { Pool } from 'pg';

// Database configuration
export const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    database: process.env.DB_NAME || 'automation_platform',
    user: process.env.DB_USER || 'platform_user',
    password: process.env.DB_PASSWORD || 'platform_password',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test connection and return pool
export async function initDb(): Promise<Pool> {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        console.log('✅ Database connected:', result.rows[0].now);
        client.release();
        return pool;
    } catch (error: any) {
        console.error('❌ Database connection failed:', error.message);
        throw error;
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    await pool.end();
    console.log('✅ Database pool closed');
    process.exit(0);
});
