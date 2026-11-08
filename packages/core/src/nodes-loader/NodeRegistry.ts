/**
 * Node Registry - Central registry for all workflow nodes
 * Discovers and loads node implementations from packages/nodes-base
 */

import { INodeType, INodeTypeDescription } from '@automation-marketplace/workflow';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

export interface INodeTypeData {
    type: INodeType;
    sourcePath: string;
    description: INodeTypeDescription;
}

export class NodeRegistry {
    private nodes: Map<string, INodeTypeData> = new Map();
    private isLoaded = false;

    /**
     * Load all nodes from the nodes-base package
     */
    async loadNodes(nodesBasePath: string): Promise<void> {
        console.log('🔍 Loading nodes from:', nodesBasePath);

        try {
            // Scan the nodes directory
            const categories = this.scanDirectory(nodesBasePath);

            for (const category of categories) {
                const categoryPath = join(nodesBasePath, category);
                const nodes = this.scanDirectory(categoryPath);

                for (const nodeName of nodes) {
                    const nodePath = join(categoryPath, nodeName);
                    await this.loadNode(nodePath, `${category}/${nodeName}`);
                }
            }

            this.isLoaded = true;
            console.log(`✅ Loaded ${this.nodes.size} nodes`);
        } catch (error) {
            console.error('❌ Error loading nodes:', error);
            throw error;
        }
    }

    /**
     * Load a single node from a directory
     */
    private async loadNode(nodePath: string, nodeIdentifier: string): Promise<void> {
        try {
            // Look for .node.ts or .node.js files
            const files = readdirSync(nodePath);
            const nodeFile = files.find(f => f.endsWith('.node.ts') || f.endsWith('.node.js'));

            if (!nodeFile) {
                console.warn(`⚠️  No node file found in ${nodePath}`);
                return;
            }

            const nodeFilePath = join(nodePath, nodeFile);

            // Dynamically import the node
            const nodeModule = await import(nodeFilePath);

            // Get the exported node class (usually default export or named export)
            const NodeClass = nodeModule.default || Object.values(nodeModule)[0];

            if (!NodeClass) {
                console.warn(`⚠️  No node class exported from ${nodeFilePath}`);
                return;
            }

            // Instantiate the node
            const nodeInstance: INodeType = new (NodeClass as any)();

            // Register the node
            const nodeName = nodeInstance.description.name;

            this.nodes.set(nodeName, {
                type: nodeInstance,
                sourcePath: nodeFilePath,
                description: nodeInstance.description,
            });

            console.log(`✅ Registered node: ${nodeName} (${nodeIdentifier})`);
        } catch (error) {
            console.error(`❌ Error loading node from ${nodePath}:`, error);
        }
    }

    /**
     * Get a node by name
     */
    getNode(nodeName: string): INodeType | undefined {
        const nodeData = this.nodes.get(nodeName);
        return nodeData?.type;
    }

    /**
     * Get node data including metadata
     */
    getNodeData(nodeName: string): INodeTypeData | undefined {
        return this.nodes.get(nodeName);
    }

    /**
     * Get all registered nodes
     */
    getAllNodes(): Map<string, INodeTypeData> {
        return this.nodes;
    }

    /**
     * Get all node names
     */
    getNodeNames(): string[] {
        return Array.from(this.nodes.keys());
    }

    /**
     * Get nodes by category
     */
    getNodesByCategory(category: string): INodeTypeData[] {
        return Array.from(this.nodes.values()).filter(node =>
            node.description.group?.includes(category)
        );
    }

    /**
     * Check if nodes are loaded
     */
    isReady(): boolean {
        return this.isLoaded && this.nodes.size > 0;
    }

    /**
     * Get registry statistics
     */
    getStats() {
        return {
            totalNodes: this.nodes.size,
            loaded: this.isLoaded,
            nodeNames: this.getNodeNames(),
        };
    }

    /**
     * Scan a directory and return subdirectories
     */
    private scanDirectory(path: string): string[] {
        try {
            return readdirSync(path).filter(item => {
                const fullPath = join(path, item);
                return statSync(fullPath).isDirectory();
            });
        } catch (error) {
            console.error(`Error scanning directory ${path}:`, error);
            return [];
        }
    }
}

// Singleton instance
let registryInstance: NodeRegistry | null = null;

/**
 * Get the global node registry instance
 */
export function getNodeRegistry(): NodeRegistry {
    if (!registryInstance) {
        registryInstance = new NodeRegistry();
    }
    return registryInstance;
}
