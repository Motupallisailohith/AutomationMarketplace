/**
 * API Server with Database Integration
 * Full n8n workflow controller implementation
 */

import 'dotenv/config';
import 'reflect-metadata'; // Required for TypeORM and DI
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { DataSource } from '@n8n/typeorm';
import { Container } from '@n8n/di';
import { Logger } from '@n8n/backend-common';

// Import from @n8n/db (module aliases resolve @/ paths)
import { WorkflowEntity, User } from '@n8n/db';

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your-super-secret-jwt-key-2025';

// Email configuration (set these environment variables)
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

// Create email transporter
const transporter = SMTP_USER && SMTP_PASS ? nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
}) : null;

// In-memory user storage (for demo only - auth not migrated yet)
const users: any[] = [];

// Database will be initialized on startup
let dataSource: DataSource;
let workflowRepo: any;
let sharedWorkflowRepo: any;

// Database initialization function
async function initializeDb() {
  const { initializeDatabase } = await import('./config/database.js');
  dataSource = await initializeDatabase();
  workflowRepo = dataSource.getRepository(WorkflowEntity);
  sharedWorkflowRepo = dataSource.getRepository('SharedWorkflow');
  console.log('✅ Database repositories initialized');
}

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true }));
app.use(express.json());

// Request logging
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

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        const decoded: any = jwt.verify(token, JWT_SECRET);
        
        // Attach user info to request
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        console.log(`✅ Authenticated user: ${req.userEmail} (${req.userId})`);
        
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version: '1.0.0' });
});

// Serve nodes.json (static node catalog)
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

// Signup
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
        if (!/[A-Z]/.test(password)) {
            return res.status(400).json({ message: 'Password must contain at least one uppercase letter' });
        }
        if (!/[a-z]/.test(password)) {
            return res.status(400).json({ message: 'Password must contain at least one lowercase letter' });
        }
        if (!/[0-9]/.test(password)) {
            return res.status(400).json({ message: 'Password must contain at least one number' });
        }

        // Check if user exists in database
        const existingUsers = await dataSource.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );
        if (existingUsers.length > 0) {
            return res.status(409).json({ message: 'User already exists' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Split name into firstName and lastName
        const nameParts = (name || '').trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Generate UUID for new user
        const userId = randomUUID();

        // Insert user into database
        await dataSource.query(
            `INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
            [userId, email, passwordHash, firstName, lastName, 'user', true]
        );

        // Generate token
        const token = jwt.sign({ userId, email }, JWT_SECRET);

        console.log(`✅ New user registered: ${email}`);

        res.status(201).json({
            token,
            user: {
                id: userId,
                email,
                firstName,
                lastName,
                role: 'user',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        console.log('Login attempt:', { email: req.body.email });
        const { email, password } = req.body;

        // Find user in database
        const users = await dataSource.query(
            'SELECT id, email, password_hash, first_name, last_name, role, created_at, updated_at FROM users WHERE email = $1',
            [email]
        );
        const user = users[0];
        console.log('User found:', user ? 'yes' : 'no');
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Verify password
        const valid = await bcrypt.compare(password, user.password_hash);
        console.log('Password valid:', valid);
        if (!valid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Update last login
        await dataSource.query(
            'UPDATE users SET last_login = NOW() WHERE id = $1',
            [user.id]
        );

        // Generate token
        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET);
        console.log('Login successful for:', email);

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name || '',
                lastName: user.last_name || '',
                role: user.role || 'user',
                createdAt: user.created_at,
                updatedAt: user.updated_at,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Forgot Password
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        console.log('Forgot password request:', { email });
        
        // Check if user exists in database (use raw query since table is "users" not "user")
        const users = await dataSource.query(
            'SELECT id, email, first_name, last_name FROM users WHERE email = $1',
            [email]
        );
        const user = users[0];
        if (!user) {
            // Don't reveal if user exists or not (security best practice)
            return res.json({ 
                message: 'If an account exists with this email, you will receive a password reset link.' 
            });
        }

        console.log('👤 User found in database:', { id: user.id, email: user.email });

        // Generate reset token (valid for 1 hour)
        const resetToken = jwt.sign(
            { userId: user.id, email: user.email, type: 'reset' }, 
            JWT_SECRET, 
            { expiresIn: '1h' }
        );

        const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;
        console.log('🔗 Reset URL generated:', resetUrl);
        
        // Send email if configured
        if (transporter) {
            try {
                console.log(`📧 Attempting to send email to: ${email}`);
                console.log(`📤 Using SMTP: ${SMTP_HOST}:${SMTP_PORT} as ${SMTP_USER}`);
                
                await transporter.sendMail({
                    from: SMTP_FROM,
                    to: email,
                    subject: 'Password Reset Request - Automation Marketplace',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #667eea;">Password Reset Request</h2>
                            <p>Hello ${user.first_name || 'there'},</p>
                            <p>You requested to reset your password. Click the button below to reset it:</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${resetUrl}" 
                                   style="background-color: #667eea; color: white; padding: 12px 30px; 
                                          text-decoration: none; border-radius: 5px; display: inline-block;">
                                    Reset Password
                                </a>
                            </div>
                            <p>Or copy and paste this link into your browser:</p>
                            <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
                            <p style="color: #666; font-size: 12px; margin-top: 30px;">
                                This link will expire in 1 hour. If you didn't request this, please ignore this email.
                            </p>
                        </div>
                    `,
                });
                
                console.log(`✅ Password reset email sent successfully to: ${email}`);
                
                res.json({ 
                    message: 'If an account exists with this email, you will receive a password reset link.' 
                });
            } catch (emailError: any) {
                console.error('❌ Email sending failed:', emailError.message);
                console.error('Full error:', emailError);
                // Still show success message but log the token for dev
                console.log('');
                console.log('🔗 ============================================');
                console.log('🔗 RESET URL (Use this for testing):');
                console.log('🔗 ============================================');
                console.log(`📧 Email: ${email}`);
                console.log(`🔗 URL: ${resetUrl}`);
                console.log('🔗 ============================================');
                console.log('');
                res.json({ 
                    message: 'If an account exists with this email, you will receive a password reset link.',
                    devUrl: resetUrl // Include for testing when email fails
                });
            }
        } else {
            // No email configured - log to console
            console.log('');
            console.log('🔑 ============================================');
            console.log('🔑 PASSWORD RESET REQUEST (DEV MODE)');
            console.log('🔑 ============================================');
            console.log(`📧 Email: ${email}`);
            console.log(`🔗 Reset URL: ${resetUrl}`);
            console.log('🔑 ============================================');
            console.log('');
            
            res.json({ 
                message: 'If an account exists with this email, you will receive a password reset link.',
                devToken: resetToken,
                devUrl: resetUrl
            });
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Reset Password
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        
        // Validate password
        if (!password || password.trim().length === 0) {
            return res.status(400).json({ message: 'Password is required' });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long' });
        }
        if (!/[A-Z]/.test(password)) {
            return res.status(400).json({ message: 'Password must contain at least one uppercase letter' });
        }
        if (!/[a-z]/.test(password)) {
            return res.status(400).json({ message: 'Password must contain at least one lowercase letter' });
        }
        if (!/[0-9]/.test(password)) {
            return res.status(400).json({ message: 'Password must contain at least one number' });
        }
        
        // Verify token
        const decoded: any = jwt.verify(token, JWT_SECRET);
        
        if (decoded.type !== 'reset') {
            return res.status(400).json({ message: 'Invalid reset token' });
        }

        // Find user in database
        const users = await dataSource.query(
            'SELECT id, email, password_hash FROM users WHERE id = $1',
            [decoded.userId]
        );
        const user = users[0];
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if new password is same as old password
        const isSamePassword = await bcrypt.compare(password, user.password_hash);
        if (isSamePassword) {
            return res.status(400).json({ 
                message: 'New password must be different from your current password' 
            });
        }

        // Update password in database
        const passwordHash = await bcrypt.hash(password, 10);
        await dataSource.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [passwordHash, user.id]
        );
        
        console.log(`✅ Password reset successful for: ${user.email}`);
        
        res.json({ message: 'Password reset successful. You can now log in with your new password.' });
    } catch (error: any) {
        console.error('Reset password error:', error);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(400).json({ message: 'Reset token has expired. Please request a new one.' });
        }
        
        res.status(400).json({ message: 'Invalid or expired reset token' });
    }
});

// ============================================
// Workflow Management Endpoints (Database-backed)
// ============================================

// Get all workflows (user's workflows only)
app.get('/api/workflows', authenticateUser, async (req: any, res) => {
    try {
        // Query workflows created by this user
        const workflows = await dataSource.query(
            'SELECT * FROM workflows WHERE created_by = $1 ORDER BY updated_at DESC',
            [req.userId]
        );
        
        console.log(`✅ Retrieved ${workflows.length} workflows for user ${req.userEmail}`);
        res.json(workflows);
    } catch (error: any) {
        console.error('Error fetching workflows:', error);
        res.status(500).json({ 
            message: 'Failed to fetch workflows',
            error: error.message 
        });
    }
});

// Get single workflow by ID
app.get('/api/workflows/:id', authenticateUser, async (req: any, res) => {
    try {
        const workflows = await dataSource.query(
            'SELECT * FROM workflows WHERE id = $1 AND created_by = $2',
            [req.params.id, req.userId]
        );
        
        if (workflows.length === 0) {
            return res.status(404).json({ message: 'Workflow not found' });
        }
        
        console.log(`✅ Retrieved workflow: ${workflows[0].id}`);
        res.json(workflows[0]);
    } catch (error: any) {
        console.error('Error fetching workflow:', error);
        res.status(500).json({ 
            message: 'Failed to fetch workflow',
            error: error.message 
        });
    }
});

// Import workflow from URL
app.get('/api/workflows/from-url', async (req, res) => {
    try {
        const { url } = req.query;

        if (!url || typeof url !== 'string') {
            return res.status(400).json({ message: 'URL parameter is required' });
        }

        console.log(`📥 Fetching workflow from URL: ${url}`);

        // Fetch workflow from URL
        const response = await fetch(url);
        
        if (!response.ok) {
            return res.status(400).json({ 
                message: 'Failed to fetch workflow from URL' 
            });
        }

        const workflowData = await response.json() as any;

        // Validate it's a workflow JSON
        if (
            !workflowData.nodes ||
            !Array.isArray(workflowData.nodes) ||
            !workflowData.connections ||
            typeof workflowData.connections !== 'object' ||
            Array.isArray(workflowData.connections)
        ) {
            return res.status(400).json({
                message: 'The data in the file does not seem to be a valid workflow JSON file!'
            });
        }

        console.log(`✅ Valid workflow fetched from URL`);
        res.json(workflowData);
    } catch (error: any) {
        console.error('Error fetching workflow from URL:', error);
        res.status(500).json({ 
            message: 'Failed to fetch workflow from URL',
            error: error.message 
        });
    }
});

// Create new workflow
app.post('/api/workflows', authenticateUser, async (req: any, res) => {
    try {
        const { name, description, definition } = req.body;

        // Generate UUID for new workflow
        const workflowId = randomUUID();

        // Insert workflow into database with user association
        await dataSource.query(
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

        // Fetch the created workflow
        const workflows = await dataSource.query(
            'SELECT * FROM workflows WHERE id = $1',
            [workflowId]
        );

        console.log(`✅ Workflow created: ${workflowId} - ${name} by ${req.userEmail}`);
        res.status(201).json(workflows[0]);
    } catch (error: any) {
        console.error('Error creating workflow:', error);
        res.status(500).json({ 
            message: 'Failed to create workflow',
            error: error.message 
        });
    }
});

// Update workflow
app.patch('/api/workflows/:id', authenticateUser, async (req: any, res) => {
    try {
        const { id } = req.params;
        const { name, description, definition, is_active } = req.body;

        // Check if workflow exists and belongs to user
        const workflows = await dataSource.query(
            'SELECT * FROM workflows WHERE id = $1 AND created_by = $2',
            [id, req.userId]
        );
        
        if (workflows.length === 0) {
            return res.status(404).json({ message: 'Workflow not found' });
        }

        // Build update query dynamically based on provided fields
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(name);
        }
        if (description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            values.push(description);
        }
        if (definition !== undefined) {
            updates.push(`definition = $${paramIndex++}`);
            values.push(JSON.stringify(definition));
        }
        if (is_active !== undefined) {
            updates.push(`is_active = $${paramIndex++}`);
            values.push(is_active);
        }
        updates.push(`updated_at = NOW()`);

        // Add id to values for WHERE clause
        values.push(id);

        await dataSource.query(
            `UPDATE workflows SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
            values
        );

        // Fetch updated workflow
        const updated = await dataSource.query(
            'SELECT * FROM workflows WHERE id = $1',
            [id]
        );

        console.log(`✅ Workflow updated: ${id} by ${req.userEmail}`);
        res.json(updated[0]);
    } catch (error: any) {
        console.error('Error updating workflow:', error);
        res.status(500).json({ 
            message: 'Failed to update workflow',
            error: error.message 
        });
    }
});

// Delete workflow
app.delete('/api/workflows/:id', authenticateUser, async (req: any, res) => {
    try {
        const { id } = req.params;
        
        // Check if workflow exists and belongs to user
        const workflows = await dataSource.query(
            'SELECT * FROM workflows WHERE id = $1 AND created_by = $2',
            [id, req.userId]
        );
        
        if (workflows.length === 0) {
            return res.status(404).json({ message: 'Workflow not found' });
        }

        await dataSource.query(
            'DELETE FROM workflows WHERE id = $1',
            [id]
        );
        
        console.log(`✅ Workflow deleted: ${id} by ${req.userEmail}`);
        res.json({ message: 'Workflow deleted successfully', workflow: workflows[0] });
    } catch (error: any) {
        console.error('Error deleting workflow:', error);
        res.status(500).json({ 
            message: 'Failed to delete workflow',
            error: error.message 
        });
    }
});

// Placeholder routes
app.get('/api/nodes', (_req, res) => res.json([]));
app.get('/api/executions', (_req, res) => res.json([]));

// Start server with database initialization
async function startServer() {
    try {
        // Initialize database
        console.log('🔧 Initializing database...');
        await initializeDb();
        console.log('✅ Database connected and ready');

        // Initialize DI container with services
        console.log('🔧 Initializing services...');
        const { GlobalConfig } = await import('@n8n/config');
        const { InstanceSettings } = await import('n8n-core');
        const globalConfig = Container.get(GlobalConfig);
        const instanceSettings = Container.get(InstanceSettings);
        const instanceSettingsConfig = { 
          ...instanceSettings, 
          userHome: process.env.HOME || process.env.USERPROFILE || '',
          encryptionKey: process.env.ENCRYPTION_KEY || 'default-encryption-key-change-me',
          enforceSettingsFilePermissions: false
        };
        const logger = new Logger(globalConfig, instanceSettingsConfig);
        Container.set(Logger, logger);
        
        // Register DbConnection in Container (needed by repositories)
        // FolderRepository expects this.connection.manager
        // TODO: Fix type issue with Container.set for DbConnection
        // const dbConnectionWrapper = {
        //     dataSource,
        //     connection: dataSource,  // TypeORM uses 'connection' property
        //     manager: dataSource.manager,
        // };
        // Container.set(DbConnectionSymbol, dbConnectionWrapper);
        
        // Import and register services
        const { WorkflowService } = await import('./services/workflow.service.full.js');
        const { EventService } = await import('./services/event.service.js');
        const { ExternalHooks } = await import('./services/external-hooks.service.js');
        const { ExecutionService } = await import('./services/execution.service.js');
        
        Container.set(WorkflowService, new WorkflowService(
            logger,
            dataSource.getRepository('WorkflowEntity') as any,
            dataSource.getRepository('SharedWorkflow') as any,
            dataSource.getRepository('WorkflowHistory') as any,
            dataSource.getRepository('TagEntity') as any,
            dataSource.getRepository('ExecutionEntity') as any,
        ));
        Container.set(EventService, new EventService(logger));
        Container.set(ExternalHooks, new ExternalHooks(logger));
        Container.set(ExecutionService, Container.get(ExecutionService));
        
        console.log('✅ Services initialized');

        // Import and register controller
        console.log('🔧 Registering controllers...');
        // Temporarily disabled - controller needs proper DI setup
        // const { WorkflowsController } = await import('./controllers/workflows.controller.js');
        // const controller = new WorkflowsController();
        
        // Note: Using legacy route handlers below instead
        console.log('✅ Controllers registered (using legacy routes)');

        // Start Express server
        app.listen(PORT, () => {
            console.log('');
            console.log('🚀 ============================================');
            console.log('🚀 AutomationMarketplace API Server Started!');
            console.log('🚀 ============================================');
            console.log('');
            console.log(`📡 Running at: http://localhost:${PORT}`);
            console.log('💾 Database: CONNECTED');
            console.log('🔄 Workflows: n8n-compatible API ready');
            console.log('📝 Auth: READY (in-memory storage)');
            console.log('');
            if (transporter) {
                console.log('✉️  Email: CONFIGURED');
                console.log(`📧 SMTP: ${SMTP_HOST}:${SMTP_PORT}`);
                console.log(`📤 From: ${SMTP_FROM}`);
            } else {
                console.log('⚠️  Email: NOT CONFIGURED (set SMTP_USER and SMTP_PASS in .env)');
                console.log('   Reset links will be logged to console only');
            }
            console.log('');
            console.log('✅ You can now sign up and log in!');
            console.log('✅ Workflow save/update endpoints ready!');
            console.log('');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();