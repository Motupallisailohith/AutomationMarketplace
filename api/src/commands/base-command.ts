/**
 * Base Command - Mirrors n8n's BaseCommand pattern
 * Handles database initialization and common setup
 */

import 'reflect-metadata';
import { Container } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import { DbConnection } from '@n8n/db';
import { initializeDatabase } from '../db';

export abstract class BaseCommand {
  protected logger!: Logger;
  protected dbConnection!: DbConnection;

  async init(): Promise<void> {
    // Initialize database (this sets up all required services in Container)
    console.log('Initializing database connection...');
    await initializeDatabase();
    
    // Get services from container (already initialized by initializeDatabase)
    this.logger = Container.get(Logger);
    this.dbConnection = Container.get(DbConnection);
    
    this.logger.info('✅ Database connected and migrated');

    // Register ControllerRegistry
    const { ControllerRegistry } = await import('../controller.registry');
    Container.set(ControllerRegistry, new ControllerRegistry());
  }

  async catch(error: Error): Promise<void> {
    this.logger.error('Command failed with error:', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}
