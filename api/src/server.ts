/**
 * AutomationMarketplace API Server
 * 
 * Based on n8n architecture but simplified:
 * - Uses n8n's concepts (workflows, nodes, credentials)
 * - Replaces execution with Temporal orchestration
 * - Simple PostgreSQL queries (no TypeORM)
 * - JWT authentication
 * - Multi-language workers (Go, Ruby, Python, Node.js)
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import { pool, initDb } from './db';
import { TemporalWorkflowRunner } from './adapters/temporal-workflow-runner';
import { encrypt, decrypt } from './Cipher';

const app = express();
const PORT = parseInt(process.env.PORT || '3000');
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-2025';

// Email configuration
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

const transporter = SMTP_USER && SMTP_PASS ? nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
}) : null;

// Temporal workflow runner (replaces n8n's execution engine)
let workflowRunner: TemporalWorkflowRunner;

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true }));
app.use(express.json());
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// Authentication middleware
const authenticateUser = (req: any, res: any, next: any) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const token = authHeader.substring(7);
        const decoded: any = jwt.verify(token, JWT_SECRET);
        
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// ============================================
// Health & Info
// ============================================

app.get('/health', (_req, res) => {
    res.json({ 
        status: 'ok', 
        version: '1.0.0',
        platform: 'AutomationMarketplace',
        execution: 'Temporal',
    });
});

// ============================================
// Authentication
// ============================================

app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Validate password
        if (!password || password.trim().length === 0) {
            return res.status(400).json({ message: 'Password is required' });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long' });
        }

        const existingUsers = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUsers.rows.length > 0) {
            return res.status(409).json({ message: 'User already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const nameParts = (name || '').trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        const userId = randomUUID();

        await pool.query(
            `INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
            [userId, email, passwordHash, firstName, lastName, 'user', true]
        );

        const token = jwt.sign({ userId, email }, JWT_SECRET);

        res.status(201).json({
            token,
            user: { id: userId, email, firstName, lastName, role: 'user' },
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const users = await pool.query(
            'SELECT id, email, password_hash, first_name, last_name, role FROM users WHERE email = $1',
            [email]
        );
        const user = users.rows[0];
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET);

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name || '',
                lastName: user.last_name || '',
                role: user.role || 'user',
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// ============================================
// Workflows (n8n-compatible)
// ============================================

app.get('/api/workflows', authenticateUser, async (req: any, res) => {
    try {
        const workflows = await pool.query(
            'SELECT * FROM workflows WHERE created_by = $1 ORDER BY updated_at DESC',
            [req.userId]
        );
        res.json(workflows.rows);
    } catch (error: any) {
        console.error('Error fetching workflows:', error);
        res.status(500).json({ message: 'Failed to fetch workflows', error: error.message });
    }
});

app.post('/api/workflows', authenticateUser, async (req: any, res) => {
    try {
        const { name, description, definition } = req.body;
        const workflowId = randomUUID();

        await pool.query(
            `INSERT INTO workflows (id, name, description, definition, is_active, created_by, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
            [
                workflowId,
                name || 'Untitled Workflow',
                description || '',
                JSON.stringify(definition || { nodes: [], connections: {} }),
                true,
                req.userId
            ]
        );

        const workflows = await pool.query('SELECT * FROM workflows WHERE id = $1', [workflowId]);

        console.log(`✅ Workflow created: ${workflowId} by ${req.userEmail}`);
        res.status(201).json(workflows.rows[0]);
    } catch (error: any) {
        console.error('Error creating workflow:', error);
        res.status(500).json({ message: 'Failed to create workflow', error: error.message });
    }
});

// ============================================
// Workflow Execution (Temporal-based)
// ============================================

app.post('/api/workflows/:id/execute', authenticateUser, async (req: any, res) => {
    try {
        const { id } = req.params;
        
        // Get workflow
        const workflows = await pool.query(
            'SELECT * FROM workflows WHERE id = $1 AND created_by = $2',
            [id, req.userId]
        );
        
        if (workflows.rows.length === 0) {
            return res.status(404).json({ message: 'Workflow not found' });
        }

        const workflow = workflows.rows[0];
        
        // Execute via Temporal
        const executionId = await workflowRunner.run({
            workflowId: id,
            workflowData: JSON.parse(workflow.definition),
            executionMode: 'manual',
            userId: req.userId,
        });

        res.json({
            executionId,
            status: 'running',
            message: 'Workflow execution started via Temporal',
        });
    } catch (error: any) {
        console.error('Error executing workflow:', error);
        res.status(500).json({ message: 'Failed to execute workflow', error: error.message });
    }
});

app.get('/api/executions/:id', authenticateUser, async (req: any, res) => {
    try {
        const { id } = req.params;
        
        const result = await workflowRunner.getExecutionStatus(id);
        res.json(result);
    } catch (error: any) {
        console.error('Error fetching execution:', error);
        res.status(500).json({ message: 'Failed to fetch execution', error: error.message });
    }
});

// ============================================
// Nodes (n8n catalog)
// ============================================

app.get('/types/nodes.json', (_req, res) => {
    try {
        const nodesJsonPath = path.join(__dirname, '../../public/types/nodes.json');
        
        if (!fs.existsSync(nodesJsonPath)) {
            return res.status(404).json({ 
                error: 'Nodes catalog not found. Run `pnpm build:nodes` first.' 
            });
        }
        
        const nodesData = fs.readFileSync(nodesJsonPath, 'utf-8');
        res.setHeader('Content-Type', 'application/json');
        res.send(nodesData);
    } catch (error: any) {
        console.error('Error serving nodes.json:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// Server Startup
// ============================================

async function startServer() {
    try {
        console.log('');
        console.log('🚀 ===================================================');
        console.log('🚀 AutomationMarketplace Server Starting...');
        console.log('🚀 ===================================================');
        console.log('');

        // Initialize database
        console.log('📦 Initializing database...');
        await initDb();

        // Initialize Temporal workflow runner
        console.log('⚡ Initializing Temporal workflow runner...');
        workflowRunner = new TemporalWorkflowRunner(pool);
        await workflowRunner.initialize();

        // Start Express server
        app.listen(PORT, () => {
            console.log('');
            console.log('✅ ===================================================');
            console.log('✅ AutomationMarketplace API Server Ready!');
            console.log('✅ ===================================================');
            console.log('');
            console.log(`📡 API:           http://localhost:${PORT}`);
            console.log(`💾 Database:      PostgreSQL (connected)`);
            console.log(`⚡ Orchestration: Temporal`);
            console.log(`🔐 Auth:          JWT`);
            console.log(`🔄 Workers:       Go, Ruby, Python, Node.js`);
            console.log('');
            if (transporter) {
                console.log(`📧 Email:         Configured (${SMTP_HOST})`);
            } else {
                console.log('⚠️  Email:         Not configured');
            }
            console.log('');
            console.log('📖 Based on n8n architecture with Temporal execution');
            console.log('');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await workflowRunner.shutdown();
    await pool.end();
    process.exit(0);
});

startServer();
