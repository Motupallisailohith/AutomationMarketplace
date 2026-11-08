const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'automation_platform',
    user: process.env.DB_USER || 'platform_user',
    password: process.env.DB_PASSWORD || 'platform_password',
});

// Basic Migration Script
const MIGRATIONS = [
    `CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'Untitled Workflow',
    active BOOLEAN DEFAULT false,
    nodes JSONB DEFAULT '[]',
    connections JSONB DEFAULT '[]',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );`,
    `CREATE TABLE IF NOT EXISTS credentials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    data TEXT NOT NULL, -- Encrypted JSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );`,
    `CREATE TABLE IF NOT EXISTS executions (
    id TEXT PRIMARY KEY,
    workflow_id TEXT REFERENCES workflows(id),
    status TEXT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    stopped_at TIMESTAMP WITH TIME ZONE,
    data JSONB DEFAULT '{}'
  );`,
    `CREATE TABLE IF NOT EXISTS webhook_mappings (
    path TEXT PRIMARY KEY,
    workflow_id TEXT REFERENCES workflows(id) ON DELETE CASCADE,
    method TEXT DEFAULT 'GET'
  );`
];

async function initDb() {
    console.log('🔌 Connecting to Postgres...', {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT
    });

    try {
        const client = await pool.connect();
        console.log('✅ Connected to Postgres');

        // Run Migrations
        console.log('📦 Running Migrations...');
        for (const query of MIGRATIONS) {
            await client.query(query);
        }
        console.log('✅ Migrations Complete');

        client.release();
    } catch (err) {
        console.error('❌ Database Initialization Failed:', err.message);
        console.error('   Ensure Docker is running (scripts/start-infra.bat)');
    }
}

module.exports = {
    pool,
    initDb
};
