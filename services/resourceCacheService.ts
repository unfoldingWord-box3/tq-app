/**
 * Resource Cache Service
 * 
 * Handles downloading, extracting, and caching Door43 Resource Containers
 * for offline-first Bible translation QA functionality.
 */

import * as FileSystem from 'expo-file-system';
import JSZip from 'jszip';
import { databaseService } from './databaseService';
import { Door43Resource, ResourceManifest } from './door43ServiceDCS';

// Cache directory structure
const CACHE_ROOT = `${FileSystem.documentDirectory}resources/`;
const DOWNLOADS_DIR = `${CACHE_ROOT}downloads/`;
const EXTRACTED_DIR = `${CACHE_ROOT}extracted/`;
const TEMP_DIR = `${CACHE_ROOT}temp/`;

export interface DownloadProgress {
  resourceId: string;
  stage: 'downloading' | 'extracting' | 'processing' | 'complete' | 'error';
  progress: number; // 0-1
  bytesDownloaded?: number;
  totalBytes?: number;
  error?: string;
}

export interface CachedResource {
  id: string;
  name: string;
  localPath: string;
  extractedPath: string;
  manifest?: ResourceManifest;
  files: string[];
  downloadDate: Date;
  size: number;
}

class ResourceCacheService {
  private downloadProgress = new Map<string, DownloadProgress>();
  private progressCallbacks = new Map<string, (progress: DownloadProgress) => void>();

  /**
   * Check if ZIP extraction is available (JSZip works with Expo Go)
   */
  isZipExtractionAvailable(): boolean {
    return true; // JSZip works in all environments including Expo Go
  }

  /**
   * Initialize cache directories
   */
  async initialize(): Promise<void> {
    try {
      const dirs = [CACHE_ROOT, DOWNLOADS_DIR, EXTRACTED_DIR, TEMP_DIR];
      
      for (const dir of dirs) {
        const dirInfo = await FileSystem.getInfoAsync(dir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
          console.log('✅ Created cache directory:', dir);
        }
      }
      
      console.log('✅ Resource cache initialized');
    } catch (error) {
      console.error('❌ Error initializing resource cache:', error);
      throw error;
    }
  }

  /**
   * Download and cache a resource
   */
  async downloadResource(
    resource: Door43Resource,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<CachedResource> {
    const resourceId = resource.id;
    
    try {
      // Set up progress tracking
      if (onProgress) {
        this.progressCallbacks.set(resourceId, onProgress);
      }

      this.updateProgress(resourceId, {
        resourceId,
        stage: 'downloading',
        progress: 0
      });

      // Generate unique file paths
      const downloadPath = `${DOWNLOADS_DIR}${resourceId}.zip`;
      const extractPath = `${EXTRACTED_DIR}${resourceId}/`;
      const tempPath = `${TEMP_DIR}${resourceId}/`;

      // Download the resource
      console.log('📥 Downloading resource:', resource.name);
      await this.downloadFile(resource.zipball_url, downloadPath, resourceId);

      this.updateProgress(resourceId, {
        resourceId,
        stage: 'extracting',
        progress: 0.6
      });

      // Extract the zip file
      console.log('📦 Extracting resource:', resource.name);
      await this.extractResource(downloadPath, tempPath, extractPath);

      this.updateProgress(resourceId, {
        resourceId,
        stage: 'processing',
        progress: 0.8
      });

      // Process the extracted resource
      const cachedResource = await this.processExtractedResource(
        resource,
        extractPath,
        downloadPath
      );

      // Save to database
      await databaseService.saveResource(resource, downloadPath, cachedResource.manifest);

      this.updateProgress(resourceId, {
        resourceId,
        stage: 'complete',
        progress: 1.0
      });

      // Cleanup temp files
      await this.cleanupTempFiles(tempPath);

      console.log('✅ Resource cached successfully:', resource.name);
      return cachedResource;

    } catch (error) {
      console.error('❌ Error downloading resource:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.updateProgress(resourceId, {
        resourceId,
        stage: 'error',
        progress: 0,
        error: errorMessage
      });

      throw new Error(errorMessage);
    } finally {
      this.progressCallbacks.delete(resourceId);
      this.downloadProgress.delete(resourceId);
    }
  }

  /**
   * Download file with progress tracking
   */
  private async downloadFile(url: string, localPath: string, resourceId: string): Promise<void> {
    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        localPath,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          
          this.updateProgress(resourceId, {
            resourceId,
            stage: 'downloading',
            progress: progress * 0.6, // Download is 60% of total progress
            bytesDownloaded: downloadProgress.totalBytesWritten,
            totalBytes: downloadProgress.totalBytesExpectedToWrite
          });
        }
      );

      const result = await downloadResumable.downloadAsync();
      
      if (!result) {
        throw new Error('Download failed - no result returned');
      }

      console.log('✅ Downloaded to:', result.uri);
    } catch (error) {
      console.error('❌ Download error:', error);
      throw error;
    }
  }

  /**
   * Extract ZIP archive using JSZip
   */
  private async extractResource(
    zipPath: string,
    tempPath: string,
    finalPath: string
  ): Promise<void> {
    try {
      // Create temp directory
      await FileSystem.makeDirectoryAsync(tempPath, { intermediates: true });

      console.log('📦 Reading ZIP file:', zipPath);
      
      // Read ZIP file as base64
      const zipContent = await FileSystem.readAsStringAsync(zipPath, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Load ZIP with JSZip
      const zip = await JSZip.loadAsync(zipContent, {
        base64: true,
        createFolders: false, // Don't create folder objects, saves memory
      });

      console.log('📦 Extracting ZIP contents...');
      
      // Track if we need to handle GitHub's extra folder level
      let rootFolderName: string | null = null;
      const filePaths = Object.keys(zip.files);
      
      // Check if all files are inside a single root folder (GitHub pattern)
      if (filePaths.length > 0) {
        const firstPath = filePaths[0];
        const rootMatch = firstPath.match(/^([^\/]+)\//);
        if (rootMatch) {
          const potentialRoot = rootMatch[1];
          if (filePaths.every(path => path.startsWith(potentialRoot + '/'))) {
            rootFolderName = potentialRoot;
            console.log('📁 Detected root folder:', rootFolderName);
          }
        }
      }

      // Extract all files
      let extractedFiles = 0;
      const totalFiles = Object.values(zip.files).filter(zipEntry => !zipEntry.dir).length;
      
      for (const [filePath, zipEntry] of Object.entries(zip.files)) {
        // Skip directories
        if (zipEntry.dir) continue;

        // Remove root folder from path if present
        let relativePath = filePath;
        if (rootFolderName && filePath.startsWith(rootFolderName + '/')) {
          relativePath = filePath.substring(rootFolderName.length + 1);
        }

        // Skip if no relative path (shouldn't happen)
        if (!relativePath) continue;

        const outputPath = `${tempPath}${relativePath}`;
        
        // Create directory structure for the file
        const dirPath = outputPath.substring(0, outputPath.lastIndexOf('/'));
        if (dirPath !== tempPath.slice(0, -1)) {
          await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
        }

        // Extract file content as text (most Door43 resources are text)
        try {
          const content = await zipEntry.async('string');
          await FileSystem.writeAsStringAsync(outputPath, content);
          extractedFiles++;
          
          if (extractedFiles % 10 === 0 || extractedFiles === totalFiles) {
            console.log(`📄 Extracted ${extractedFiles}/${totalFiles} files`);
          }
        } catch (error) {
          // If text extraction fails, try binary
          try {
            const binaryContent = await zipEntry.async('uint8array');
            const base64Content = this.uint8ArrayToBase64(binaryContent);
            await FileSystem.writeAsStringAsync(outputPath, base64Content, {
              encoding: FileSystem.EncodingType.Base64,
            });
            extractedFiles++;
            console.log(`📄 Extracted binary file: ${relativePath}`);
          } catch (binaryError) {
            console.warn(`⚠️ Failed to extract file: ${relativePath}`, binaryError);
          }
        }
      }

      // Ensure final directory exists and is clean
      console.log('📂 Moving extracted files to final location...');
      
      // Remove existing final path if it exists
      const finalInfo = await FileSystem.getInfoAsync(finalPath);
      if (finalInfo.exists) {
        await FileSystem.deleteAsync(finalPath, { idempotent: true });
      }
      
      // Create the parent directory structure
      const parentDir = finalPath.substring(0, finalPath.lastIndexOf('/'));
      await FileSystem.makeDirectoryAsync(parentDir, { intermediates: true });
      
      // Move temp directory to final location
      await FileSystem.moveAsync({
        from: tempPath,
        to: finalPath
      });

      console.log('✅ Extracted to:', finalPath);
      console.log(`📊 Successfully extracted ${extractedFiles} files`);
    } catch (error) {
      console.error('❌ Extraction error:', error);
      
      // Clean up temp directory on failure
      try {
        const tempInfo = await FileSystem.getInfoAsync(tempPath);
        if (tempInfo.exists) {
          await FileSystem.deleteAsync(tempPath, { idempotent: true });
        }
      } catch (cleanupError) {
        console.warn('⚠️ Failed to cleanup temp directory:', cleanupError);
      }
      
      throw error;
    }
  }

  /**
   * Convert Uint8Array to Base64 string
   */
  private uint8ArrayToBase64(uint8Array: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < uint8Array.byteLength; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  }

  /**
   * Process extracted resource and build file index
   */
  private async processExtractedResource(
    resource: Door43Resource,
    extractPath: string,
    downloadPath: string
  ): Promise<CachedResource> {
    try {
      // Get file size
      const downloadInfo = await FileSystem.getInfoAsync(downloadPath);
      const size = downloadInfo.size || 0;

      // Get list of all files
      const files = await this.getFileList(extractPath);

      // Try to read manifest
      let manifest: ResourceManifest | undefined;
      const manifestPath = `${extractPath}manifest.yaml`;
      const manifestInfo = await FileSystem.getInfoAsync(manifestPath);
      
      if (manifestInfo.exists) {
        try {
          const manifestContent = await FileSystem.readAsStringAsync(manifestPath);
          manifest = JSON.parse(manifestContent);
        } catch (error) {
          console.warn('⚠️ Could not parse manifest:', error);
        }
      }

      return {
        id: resource.id,
        name: resource.name,
        localPath: downloadPath,
        extractedPath: extractPath,
        manifest,
        files,
        downloadDate: new Date(),
        size
      };
    } catch (error) {
      console.error('❌ Error processing extracted resource:', error);
      throw error;
    }
  }

  /**
   * Recursively get all files in a directory
   */
  private async getFileList(dirPath: string, relativePath: string = ''): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const contents = await FileSystem.readDirectoryAsync(dirPath);
      
      for (const item of contents) {
        const itemPath = `${dirPath}${item}`;
        const itemInfo = await FileSystem.getInfoAsync(itemPath);
        
        if (itemInfo.isDirectory) {
          const subFiles = await this.getFileList(itemPath + '/', `${relativePath}${item}/`);
          files.push(...subFiles);
        } else {
          files.push(`${relativePath}${item}`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Error reading directory:', dirPath, error);
    }
    
    return files;
  }

  /**
   * Get cached resource information
   */
  async getCachedResource(resourceId: string): Promise<CachedResource | null> {
    try {
      const resources = await databaseService.getDownloadedResources();
      const resource = resources.find(r => r.id === resourceId);
      
      if (!resource) return null;

      // Verify files still exist
      const downloadInfo = await FileSystem.getInfoAsync(resource.local_path);
      const extractInfo = await FileSystem.getInfoAsync(resource.local_path.replace('/downloads/', '/extracted/').replace('.zip', '/'));
      
      if (!downloadInfo.exists || !extractInfo.exists) {
        console.warn('⚠️ Cached resource files missing:', resourceId);
        return null;
      }

      return {
        id: resource.id,
        name: resource.name,
        localPath: resource.local_path,
        extractedPath: resource.local_path.replace('/downloads/', '/extracted/').replace('.zip', '/'),
        manifest: resource.manifest_data ? JSON.parse(resource.manifest_data) : undefined,
        files: [], // Would need to re-scan if needed
        downloadDate: new Date(resource.download_date),
        size: resource.file_size
      };
    } catch (error) {
      console.error('❌ Error getting cached resource:', error);
      return null;
    }
  }

  /**
   * Check if resource is cached
   */
  async isResourceCached(resourceId: string): Promise<boolean> {
    const cached = await this.getCachedResource(resourceId);
    return cached !== null;
  }

  /**
   * Read file from cached resource
   */
  async readResourceFile(resourceId: string, filePath: string): Promise<string> {
    const cached = await this.getCachedResource(resourceId);
    
    if (!cached) {
      throw new Error(`Resource not cached: ${resourceId}`);
    }

    const fullPath = `${cached.extractedPath}${filePath}`;
    const fileInfo = await FileSystem.getInfoAsync(fullPath);
    
    if (!fileInfo.exists) {
      throw new Error(`File not found: ${filePath} in resource ${resourceId}`);
    }

    return await FileSystem.readAsStringAsync(fullPath);
  }

  /**
   * Get resource file list
   */
  async getResourceFiles(resourceId: string): Promise<string[]> {
    const cached = await this.getCachedResource(resourceId);
    
    if (!cached) {
      throw new Error(`Resource not cached: ${resourceId}`);
    }

    return await this.getFileList(cached.extractedPath);
  }

  /**
   * Delete cached resource
   */
  async deleteCachedResource(resourceId: string): Promise<void> {
    try {
      const cached = await this.getCachedResource(resourceId);
      
      if (cached) {
        // Delete files
        await FileSystem.deleteAsync(cached.localPath, { idempotent: true });
        await FileSystem.deleteAsync(cached.extractedPath, { idempotent: true });
        
        console.log('✅ Deleted cached resource:', resourceId);
      }
    } catch (error) {
      console.error('❌ Error deleting cached resource:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalResources: number;
    totalSize: number;
    cacheSize: number;
  }> {
    try {
      const resources = await databaseService.getDownloadedResources();
      const totalSize = resources.reduce((sum, r) => sum + r.file_size, 0);
      
      // Calculate actual cache directory size
      let cacheSize = 0;
      try {
        const cacheDirInfo = await FileSystem.getInfoAsync(CACHE_ROOT);
        cacheSize = cacheDirInfo.size || 0;
      } catch (error) {
        console.warn('⚠️ Could not calculate cache size:', error);
      }

      return {
        totalResources: resources.length,
        totalSize,
        cacheSize
      };
    } catch (error) {
      console.error('❌ Error getting cache stats:', error);
      return { totalResources: 0, totalSize: 0, cacheSize: 0 };
    }
  }

  /**
   * Clean up temporary files
   */
  private async cleanupTempFiles(tempPath: string): Promise<void> {
    try {
      await FileSystem.deleteAsync(tempPath, { idempotent: true });
    } catch (error) {
      console.warn('⚠️ Could not cleanup temp files:', error);
    }
  }

  /**
   * Update download progress
   */
  private updateProgress(resourceId: string, progress: DownloadProgress): void {
    this.downloadProgress.set(resourceId, progress);
    
    const callback = this.progressCallbacks.get(resourceId);
    if (callback) {
      callback(progress);
    }
  }

  /**
   * Get current download progress
   */
  getDownloadProgress(resourceId: string): DownloadProgress | null {
    return this.downloadProgress.get(resourceId) || null;
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    try {
      await FileSystem.deleteAsync(CACHE_ROOT, { idempotent: true });
      await this.initialize();
      console.log('✅ Cache cleared');
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics for debugging
   */
  async getCacheStats(): Promise<{
    totalFiles: number;
    downloadedResources: number;
    extractedResources: number;
  }> {
    try {
      const downloadDir = `${CACHE_ROOT}/downloads`;
      const extractedDir = `${CACHE_ROOT}/extracted`;

      const [downloadInfo, extractedInfo] = await Promise.all([
        this.getDirStats(downloadDir),
        this.getDirStats(extractedDir)
      ]);

      return {
        totalFiles: downloadInfo.files + extractedInfo.files,
        downloadedResources: downloadInfo.files,
        extractedResources: extractedInfo.directories
      };
    } catch (error) {
      console.error('❌ Error getting cache stats:', error);
      return {
        totalFiles: 0,
        downloadedResources: 0,
        extractedResources: 0
      };
    }
  }

  /**
   * Helper to get directory statistics
   */
  private async getDirStats(dirPath: string): Promise<{
    files: number;
    directories: number;
  }> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(dirPath);
      if (!dirInfo.exists) {
        return { files: 0, directories: 0 };
      }

      const items = await FileSystem.readDirectoryAsync(dirPath);
      let files = 0;
      let directories = 0;

      for (const item of items) {
        const itemPath = `${dirPath}/${item}`;
        const itemInfo = await FileSystem.getInfoAsync(itemPath);
        
        if (itemInfo.isDirectory) {
          directories++;
          const subStats = await this.getDirStats(itemPath);
          files += subStats.files;
        } else {
          files++;
        }
      }

      return { files, directories };
    } catch (error) {
      return { files: 0, directories: 0 };
    }
  }
}

// Export singleton instance
export const resourceCacheService = new ResourceCacheService();

// Export types
export type { CachedResource, DownloadProgress };
