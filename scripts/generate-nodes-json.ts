/**
 * Script to scan packages/nodes-base/nodes/ and generate nodes.json
 * Similar to how n8n builds its node catalog
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NODES_BASE_DIR = path.resolve(__dirname, '../packages/nodes-base/nodes');
const OUTPUT_FILE = path.resolve(__dirname, '../public/types/nodes.json');

interface NodeMetadata {
  name: string;
  displayName: string;
  description: string;
  icon?: string;
  category?: string;
  version?: number;
  group?: string[];
  codexVersion?: string;
  categories?: string[];
}

async function scanNodeDirectory(dir: string): Promise<NodeMetadata[]> {
  const nodes: NodeMetadata[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const nodePath = path.join(dir, entry.name);
      const nodeJsonPath = path.join(nodePath, `${entry.name}.node.json`);
      
      // Check if .node.json exists
      if (fs.existsSync(nodeJsonPath)) {
        try {
          const nodeJson = JSON.parse(fs.readFileSync(nodeJsonPath, 'utf-8'));
          
          // Extract metadata from .node.json
          const metadata: NodeMetadata = {
            name: nodeJson.node || `n8n-nodes-base.${entry.name.toLowerCase()}`,
            displayName: entry.name,
            description: nodeJson.description || `${entry.name} integration`,
            category: nodeJson.categories?.[0] || 'Miscellaneous',
            categories: nodeJson.categories || [],
            codexVersion: nodeJson.codexVersion,
          };
          
          // Check for icon
          const svgPath = path.join(nodePath, `${entry.name.toLowerCase()}.svg`);
          if (fs.existsSync(svgPath)) {
            metadata.icon = `file:${entry.name.toLowerCase()}.svg`;
          }
          
          nodes.push(metadata);
          console.log(`✓ Found node: ${metadata.displayName}`);
        } catch (error) {
          console.warn(`⚠ Failed to parse ${nodeJsonPath}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error scanning directory:', error);
  }
  
  return nodes;
}

async function generateNodesJson() {
  console.log('🔍 Scanning nodes...');
  console.log(`📂 Base directory: ${NODES_BASE_DIR}`);
  
  const nodes = await scanNodeDirectory(NODES_BASE_DIR);
  
  console.log(`\n✅ Found ${nodes.length} nodes`);
  
  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created output directory: ${outputDir}`);
  }
  
  // Write nodes.json
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(nodes, null, 2));
  console.log(`\n📝 Generated: ${OUTPUT_FILE}`);
  console.log(`📊 Total nodes: ${nodes.length}`);
  
  // Print category breakdown
  const byCategory = nodes.reduce((acc, node) => {
    const cat = node.category || 'Unknown';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n📋 Nodes by category:');
  Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });
}

generateNodesJson().catch(console.error);
