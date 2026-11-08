import { Service } from '@n8n/di';
import { extensionManifestSchema, type ExtensionManifest } from '@n8n/extension-sdk';
import type { 
  FrontendExtension, 
  BackendExtension 
} from '@n8n/extension-sdk/backend';
import * as path from 'path';
import * as fs from 'fs/promises';
import { z } from 'zod';

export interface LoadedExtension {
  manifest: ExtensionManifest;
  backendModule?: BackendExtension;
  frontendPath?: string;
  enabled: boolean;
}

@Service()
export class ExtensionService {
  private extensions = new Map<string, LoadedExtension>();
  private extensionsPath: string;

  constructor() {
    // Extensions directory in the workspace
    this.extensionsPath = path.join(process.cwd(), 'extensions', 'installed');
  }

  /**
   * Initialize the extension system - load all installed extensions
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.extensionsPath, { recursive: true });
      const extensionDirs = await fs.readdir(this.extensionsPath);

      for (const dir of extensionDirs) {
        try {
          await this.loadExtension(path.join(this.extensionsPath, dir));
        } catch (error) {
          console.error(`Failed to load extension from ${dir}:`, error);
        }
      }

      console.log(`Loaded ${this.extensions.size} extensions`);
    } catch (error) {
      console.error('Failed to initialize extensions:', error);
    }
  }

  /**
   * Load a single extension from a directory
   */
  private async loadExtension(extensionPath: string): Promise<void> {
    const manifestPath = path.join(extensionPath, 'extension.json');
    
    // Read manifest
    const manifestData = await fs.readFile(manifestPath, 'utf-8');
    const manifestJson = JSON.parse(manifestData);
    
    // Validate manifest
    const manifest = extensionManifestSchema.parse(manifestJson);

    // Load backend module if specified
    let backendModule: BackendExtension | undefined;
    if (manifest.entry.backend) {
      const backendPath = path.join(extensionPath, manifest.entry.backend);
      backendModule = await import(backendPath);
    }

    // Get frontend path if specified
    let frontendPath: string | undefined;
    if (manifest.entry.frontend) {
      frontendPath = path.join(extensionPath, manifest.entry.frontend);
    }

    const loadedExtension: LoadedExtension = {
      manifest,
      backendModule,
      frontendPath,
      enabled: true,
    };

    this.extensions.set(manifest.name, loadedExtension);
    
    // Call backend setup if available
    if (backendModule?.setup) {
      backendModule.setup({
        setup: backendModule.setup,
      });
    }

    console.log(`Loaded extension: ${manifest.displayName} (${manifest.version})`);
  }

  /**
   * Get all loaded extensions
   */
  getAll(): LoadedExtension[] {
    return Array.from(this.extensions.values());
  }

  /**
   * Get a specific extension by name
   */
  get(name: string): LoadedExtension | undefined {
    return this.extensions.get(name);
  }

  /**
   * Get all enabled extensions
   */
  getEnabled(): LoadedExtension[] {
    return this.getAll().filter(ext => ext.enabled);
  }

  /**
   * Enable an extension
   */
  async enable(name: string): Promise<void> {
    const extension = this.extensions.get(name);
    if (!extension) {
      throw new Error(`Extension ${name} not found`);
    }
    extension.enabled = true;
  }

  /**
   * Disable an extension
   */
  async disable(name: string): Promise<void> {
    const extension = this.extensions.get(name);
    if (!extension) {
      throw new Error(`Extension ${name} not found`);
    }
    extension.enabled = false;
  }

  /**
   * Install an extension from a directory or package
   */
  async install(sourcePath: string): Promise<void> {
    // Copy extension to extensions directory
    const manifestPath = path.join(sourcePath, 'extension.json');
    const manifestData = await fs.readFile(manifestPath, 'utf-8');
    const manifest = extensionManifestSchema.parse(JSON.parse(manifestData));

    const targetPath = path.join(this.extensionsPath, manifest.name);
    
    // Copy files
    await this.copyDirectory(sourcePath, targetPath);

    // Load the extension
    await this.loadExtension(targetPath);
  }

  /**
   * Uninstall an extension
   */
  async uninstall(name: string): Promise<void> {
    const extension = this.extensions.get(name);
    if (!extension) {
      throw new Error(`Extension ${name} not found`);
    }

    // Remove from loaded extensions
    this.extensions.delete(name);

    // Delete files
    const extensionPath = path.join(this.extensionsPath, name);
    await fs.rm(extensionPath, { recursive: true, force: true });
  }

  /**
   * Helper to copy directory recursively
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Validate an extension manifest
   */
  validateManifest(manifest: unknown): ExtensionManifest {
    return extensionManifestSchema.parse(manifest);
  }
}
