/**
 * Module alias configuration to resolve n8n CLI path aliases
 * Maps @/ to n8n CLI src directory
 * 
 * This must be loaded BEFORE any other modules via --require flag
 */

const path = require('path');
const Module = require('module');
const fs = require('fs');

const originalResolveFilename = Module._resolveFilename;

// Try multiple base paths for alias resolution
// Use compiled dist files to avoid decorator transformation issues
const basePaths = [
  path.resolve(__dirname, '../../n8n/packages/core/dist'), // n8n core dist (compiled)
  path.resolve(__dirname, '../../n8n/packages/cli/dist'),  // n8n CLI dist (compiled)
  path.resolve(__dirname, '../packages/cli/src'),          // Local CLI src (fallback)
];

Module._resolveFilename = function(request, parent, isMain) {
  // Resolve @/ aliases
  if (request.startsWith('@/')) {
    const aliasedPath = request.replace('@/', '');
    
    // Try each base path
    for (const basePath of basePaths) {
      const resolvedPath = path.join(basePath, aliasedPath);
      
      // Try .ts, .js, .d.ts extensions and index files
      const extensions = ['', '.js', '.ts', '.d.ts', '/index.js', '/index.ts'];
      for (const ext of extensions) {
        const testPath = resolvedPath + ext;
        if (fs.existsSync(testPath)) {
          return originalResolveFilename(testPath, parent, isMain);
        }
      }
    }
    
    // Not found in any base path
    console.warn(`⚠️  Could not resolve alias: ${request} (tried ${basePaths.length} locations)`);
  }
  
  return originalResolveFilename(request, parent, isMain);
};

console.log('✓ Module aliases configured (@/ → n8n CLI src)');

