/**
 * Node Registry - Central registry for all node types
 * Reference: n8n/packages/cli/src/load-nodes-and-credentials.ts
 * 
 * This service:
 * - Scans for node files in packages/nodes/dist/nodes/
 * - Lazy loads node implementations
 * - Provides node types to the API
 */

import { INodeType, INodeTypeDescription } from '@automation-marketplace/nodes';
import { logger } from '../shared/logger';
import glob from 'fast-glob';
import path from 'path';

interface KnownNode {
  type: string;
  sourcePath: string;
  version: number;
}

export class NodeRegistry {
  // In-memory storage
  private knownNodes: Map<string, KnownNode> = new Map();
  private loadedNodes: Map<string, INodeType> = new Map();
  private nodeDescriptions: Map<string, INodeTypeDescription> = new Map();
  
  private initialized = false;
  
  constructor() {}
  
  /**
   * Initialize - scan and register all nodes
   */
  async init(): Promise<void> {
    if (this.initialized) {
      logger.warn('NodeRegistry already initialized');
      return;
    }
    
    logger.info('Initializing Node Registry...');
    
    try {
      // Scan packages/nodes/dist/nodes/ directory
      await this.scanNodesDirectory();
      
      // Load core nodes immediately (if they exist)
      await this.loadCoreNodes();
      
      this.initialized = true;
      
      logger.info('Node Registry initialized', {
        totalNodes: this.knownNodes.size,
        loadedNodes: this.loadedNodes.size,
      });
    } catch (error) {
      logger.error('Failed to initialize Node Registry', error);
      throw error;
    }
  }
  
  /**
   * Scan directory for node files
   */
  private async scanNodesDirectory(): Promise<void> {
    const nodesDir = path.join(__dirname, '../../../packages/nodes/dist/nodes');
    
    logger.info('Scanning nodes directory', { path: nodesDir });
    
    try {
      // Find all .node.js files
      const nodeFiles = await glob('**/*.node.js', {
        cwd: nodesDir,
        absolute: true,
      });
      
      logger.info(`Found ${nodeFiles.length} node files`);
      
      for (const filePath of nodeFiles) {
        try {
          // Extract node name from path
          // e.g., /path/HttpRequest/HttpRequest.node.js -> HttpRequest
          const fileName = path.basename(filePath, '.node.js');
          
          this.knownNodes.set(fileName, {
            type: fileName,
            sourcePath: filePath,
            version: 1,
          });
          
          logger.debug(`Registered node: ${fileName}`, { path: filePath });
        } catch (error) {
          logger.warn(`Failed to register node: ${filePath}`, error);
        }
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        logger.warn('Nodes directory not found - no nodes available yet', { path: nodesDir });
      } else {
        throw error;
      }
    }
  }
  
  /**
   * Load core nodes that should always be available
   */
  private async loadCoreNodes(): Promise<void> {
    const coreNodes = [
      'HttpRequest',
      'Webhook', 
      'ManualTrigger',
      'Set',
      'Code',
      'If',
      'Merge',
      'SplitInBatches',
      'Filter',
      'Sort',
      'Aggregate',
      'EditFields',
      // Skip heavy API nodes for now to avoid startup crashes
      // These will be lazy-loaded when requested
      // 'GoogleSheets',
      // 'Slack',
      // 'Email',
      // 'MySQL',
      // 'Redis',
      // 'AwsS3',
      // 'OpenAI',
      // 'Twilio',
    ];
    
    for (const nodeName of coreNodes) {
      if (this.knownNodes.has(nodeName)) {
        try {
          await this.loadNode(nodeName);
          logger.debug(`Loaded core node: ${nodeName}`);
        } catch (error: any) {
          logger.error(`Failed to load core node: ${nodeName}`, { 
            error: error?.message || error,
            stack: error?.stack 
          });
          // Don't rethrow - continue loading other nodes
        }
      }
    }
  }
  
  /**
   * Lazy load a node when needed
   */
  private async loadNode(nodeType: string): Promise<INodeType> {
    // Check if already loaded
    if (this.loadedNodes.has(nodeType)) {
      return this.loadedNodes.get(nodeType)!;
    }
    
    const knownNode = this.knownNodes.get(nodeType);
    if (!knownNode) {
      throw new Error(`Node type not found: ${nodeType}`);
    }
    
    try {
      // Dynamically import the node
      let NodeModule;
      try {
        NodeModule = require(knownNode.sourcePath);
      } catch (requireError: any) {
        throw new Error(`Failed to require node file: ${requireError?.message || requireError}`);
      }
      
      // Handle different export formats:
      // 1. Default export: export default class HttpRequest {}
      // 2. Named export: export class HttpRequest {}
      // 3. CommonJS: module.exports = class HttpRequest {}
      let NodeClass;
      if (NodeModule.default) {
        NodeClass = NodeModule.default;
      } else if (typeof NodeModule === 'function') {
        NodeClass = NodeModule;
      } else {
        // Try to find a class export (named export)
        const exportedKeys = Object.keys(NodeModule).filter(key => key !== '__esModule');
        if (exportedKeys.length === 1) {
          NodeClass = NodeModule[exportedKeys[0]];
        } else {
          // Try to find class by node name (e.g., 'HttpRequest')
          const className = knownNode.sourcePath.split(/[\\/]/).pop()?.replace('.node.js', '');
          if (className && NodeModule[className]) {
            NodeClass = NodeModule[className];
          } else {
            throw new Error('Could not find node class export');
          }
        }
      }
      
      const nodeInstance: INodeType = new NodeClass();
      
      // Validate node
      if (!nodeInstance.description || !nodeInstance.execute) {
        throw new Error(`Invalid node implementation: ${nodeType}`);
      }
      
      // Cache it
      this.loadedNodes.set(nodeType, nodeInstance);
      this.nodeDescriptions.set(nodeType, nodeInstance.description);
      
      logger.info(`Loaded node: ${nodeType}`);
      
      return nodeInstance;
    } catch (error) {
      logger.error(`Failed to load node: ${nodeType}`, error);
      throw error;
    }
  }
  
  /**
   * Get a node instance (loads if needed)
   */
  async getNode(nodeType: string): Promise<INodeType | undefined> {
    try {
      if (this.loadedNodes.has(nodeType)) {
        return this.loadedNodes.get(nodeType);
      }
      
      if (this.knownNodes.has(nodeType)) {
        return await this.loadNode(nodeType);
      }
      
      logger.warn(`Node type not found: ${nodeType}`);
      return undefined;
    } catch (error) {
      logger.error(`Error getting node: ${nodeType}`, error);
      return undefined;
    }
  }
  
  /**
   * Get all node type descriptions (for UI)
   */
  getAllNodeTypes(): INodeTypeDescription[] {
    return Array.from(this.nodeDescriptions.values());
  }
  
  /**
   * Get all known node names
   */
  getKnownNodeNames(): string[] {
    return Array.from(this.knownNodes.keys());
  }
  
  /**
   * Check if node type exists
   */
  hasNode(nodeType: string): boolean {
    return this.knownNodes.has(nodeType);
  }
  
  /**
   * Get node count statistics
   */
  getNodeCount(): { total: number; loaded: number } {
    return {
      total: this.knownNodes.size,
      loaded: this.loadedNodes.size,
    };
  }
  
  /**
   * Reload a specific node (useful for development)
   */
  async reloadNode(nodeType: string): Promise<void> {
    logger.info(`Reloading node: ${nodeType}`);
    
    // Remove from cache
    this.loadedNodes.delete(nodeType);
    this.nodeDescriptions.delete(nodeType);
    
    // Clear require cache
    const knownNode = this.knownNodes.get(nodeType);
    if (knownNode) {
      delete require.cache[require.resolve(knownNode.sourcePath)];
    }
    
    // Reload
    await this.loadNode(nodeType);
  }
  
  /**
   * Get registry status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      knownNodes: this.knownNodes.size,
      loadedNodes: this.loadedNodes.size,
      nodeNames: Array.from(this.knownNodes.keys()),
    };
  }
}

// Singleton instance
export const nodeRegistry = new NodeRegistry();
