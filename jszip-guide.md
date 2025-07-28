# JSZip Usage Guide: File Extraction and Archive Processing

This guide demonstrates how to use JSZip for extracting files from ZIP archives and creating new archives, based on patterns from a React Native/Expo application that processes story collections.

## Table of Contents
1. [Installation and Setup](#installation-and-setup)
2. [Basic File Extraction](#basic-file-extraction)
3. [Loading ZIP Files from Different Sources](#loading-zip-files-from-different-sources)
4. [Processing ZIP Contents](#processing-zip-contents)
5. [Creating ZIP Archives](#creating-zip-archives)
6. [Performance Optimizations](#performance-optimizations)
7. [Error Handling Patterns](#error-handling-patterns)
8. [Platform-Specific Considerations](#platform-specific-considerations)
9. [Complete Examples](#complete-examples)

## Installation and Setup

### Dependencies
```json
{
  "dependencies": {
    "jszip": "^3.10.1",
    "jszip-utils": "^0.1.0"
  },
  "devDependencies": {
    "@types/jszip": "^3.4.1"
  }
}
```

### Basic Import
```typescript
import JSZip from 'jszip';
```

### Type Definitions (Optional)
```typescript
// src/types/jszip-utils.d.ts
declare module 'jszip-utils' {
  export function getBinaryContent(
    url: string,
    callback?: (err: Error | null, data: any) => void
  ): Promise<any>;
}
```

## Basic File Extraction

### Loading a ZIP File
```typescript
async function loadZipFile(
  source: ArrayBuffer | string,
  options: { isBase64?: boolean } = {}
): Promise<JSZip> {
  const zip = new JSZip();

  if (typeof source === 'string' && options.isBase64) {
    return await zip.loadAsync(source, {
      base64: true,
      createFolders: false, // Don't create folder objects, saves memory
    });
  } else {
    return await zip.loadAsync(source, {
      createFolders: false, // Don't create folder objects, saves memory
    });
  }
}
```

### Reading Files from ZIP
```typescript
async function extractFilesFromZip(zip: JSZip): Promise<void> {
  // Iterate through all files in the ZIP
  for (const [fileName, zipEntry] of Object.entries(zip.files)) {
    // Skip directories
    if (zipEntry.dir) continue;

    // Read file content as text
    const content = await zipEntry.async('string');
    console.log(`File: ${fileName}, Content: ${content.substring(0, 100)}...`);

    // Read file as binary data
    const binaryContent = await zipEntry.async('uint8array');
    console.log(`File: ${fileName}, Size: ${binaryContent.length} bytes`);
  }
}
```

## Loading ZIP Files from Different Sources

### From Base64 String (File System)
```typescript
import * as FileSystem from 'expo-file-system';

async function loadZipFromFile(filePath: string): Promise<JSZip> {
  // Read file as base64
  const zipContent = await FileSystem.readAsStringAsync(filePath, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Load ZIP from base64 content
  const zip = await JSZip.loadAsync(zipContent, {
    base64: true,
    createFolders: false,
  });

  return zip;
}
```

### From Binary Data (Uint8Array)
```typescript
async function loadZipFromBinary(base64Content: string): Promise<JSZip> {
  // Convert base64 to Uint8Array
  const binaryString = atob(base64Content);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Load ZIP from binary data
  const zip = await JSZip.loadAsync(bytes);
  return zip;
}
```

### From Content URI (Android)
```typescript
async function loadZipFromContentUri(contentUri: string): Promise<JSZip> {
  const { StorageAccessFramework } = await import('expo-file-system');
  
  // Create temporary cache file
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substr(2, 9);
  const cacheFileName = `temp_import_${timestamp}_${randomString}.zip`;
  const cacheFilePath = `${FileSystem.cacheDirectory}${cacheFileName}`;

  // Handle URI encoding for Android
  let sourceUri = contentUri;
  if (contentUri.includes('primary:Documents/')) {
    sourceUri = contentUri.replace('primary:Documents/', 'primary%3ADocuments%2F');
  }

  // Copy content URI to cache
  await StorageAccessFramework.copyAsync({
    from: sourceUri,
    to: cacheFilePath,
  });

  // Load ZIP from cached file
  return await loadZipFromFile(cacheFilePath);
}
```

## Processing ZIP Contents

### Finding and Processing Specific Files
```typescript
interface ProcessedFileData {
  fileName: string;
  content: string;
  metadata: Record<string, any>;
}

async function processZipContents(
  zip: JSZip,
  onProgress?: (processed: number, total: number, status: string) => void
): Promise<ProcessedFileData[]> {
  const results: ProcessedFileData[] = [];
  
  // Filter files by pattern (e.g., Markdown files)
  const fileRegex = /(?:^|\/)(\d+)\.md$/i;
  const filesToProcess = Object.entries(zip.files).filter(
    ([_, zipEntry]) => !zipEntry.dir
  );
  
  let processedFiles = 0;

  for (const [fullPath, zipEntry] of filesToProcess) {
    const content = await zipEntry.async('string');
    const fileMatch = fullPath.match(fileRegex);

    if (fileMatch) {
      const fileNumber = parseInt(fileMatch[1], 10);
      
      // Extract metadata from content
      const { title, cleanedContent } = extractTitleFromContent(content);
      
      results.push({
        fileName: fullPath,
        content: cleanedContent,
        metadata: {
          fileNumber,
          title,
          originalPath: fullPath
        }
      });
    }

    processedFiles++;
    onProgress?.(
      processedFiles,
      filesToProcess.length,
      `Processed ${processedFiles} of ${filesToProcess.length} files`
    );
  }

  return results;
}

function extractTitleFromContent(content: string): { title: string; cleanedContent: string } {
  const lines = content.split('\n');
  let title = '';
  
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    if (firstLine.startsWith('# ')) {
      title = firstLine.substring(2).trim();
    }
  }
  
  return {
    title: title || 'Untitled',
    cleanedContent: content
  };
}
```

### Reading Manifest Files
```typescript
interface Manifest {
  version: string;
  name: string;
  description: string;
  files: string[];
}

async function readManifest(zip: JSZip): Promise<Manifest> {
  const manifestFile = zip.file('manifest.json');
  
  if (!manifestFile) {
    throw new Error('Invalid archive: missing manifest.json');
  }

  const manifestContent = await manifestFile.async('text');
  const manifest: Manifest = JSON.parse(manifestContent);
  
  return manifest;
}
```

## Creating ZIP Archives

### Basic Archive Creation
```typescript
async function createZipArchive(): Promise<Blob> {
  const zip = new JSZip();
  
  // Add text files
  zip.file('readme.txt', 'Hello World!');
  zip.file('data.json', JSON.stringify({ version: '1.0' }));
  
  // Create folders
  const contentFolder = zip.folder('content');
  if (contentFolder) {
    contentFolder.file('story1.md', '# Story 1\nContent here...');
    contentFolder.file('story2.md', '# Story 2\nMore content...');
  }
  
  // Generate ZIP as blob
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return zipBlob;
}
```

### Export with Progress Tracking
```typescript
async function exportCollectionAsZip(
  collection: any,
  stories: any[],
  onProgress?: (progress: number, status: string) => void
): Promise<Blob> {
  onProgress?.(0, 'Preparing export...');
  
  const zip = new JSZip();
  const contentFolder = zip.folder('content');
  
  if (!contentFolder) {
    throw new Error('Failed to create content folder');
  }

  onProgress?.(20, 'Creating manifest...');
  
  // Create manifest
  const manifest = {
    version: '1.0',
    collection: {
      name: collection.name,
      description: collection.description,
      created: new Date().toISOString()
    },
    storyCount: stories.length
  };
  
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  onProgress?.(30, 'Processing stories...');

  // Add story files
  for (let i = 0; i < stories.length; i++) {
    const story = stories[i];
    const storyContent = generateStoryContent(story);
    const fileName = `${(i + 1).toString().padStart(2, '0')}.md`;
    
    contentFolder.file(fileName, storyContent);
    
    const progress = 30 + ((i + 1) / stories.length) * 60;
    onProgress?.(progress, `Processing story ${i + 1} of ${stories.length}`);
  }

  onProgress?.(90, 'Generating archive...');
  
  const zipBlob = await zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
  
  onProgress?.(100, 'Export complete!');
  return zipBlob;
}

function generateStoryContent(story: any): string {
  let content = `# ${story.title}\n\n`;
  
  for (const frame of story.frames) {
    content += `![${frame.imageUrl}](${frame.imageUrl})\n`;
    content += `${frame.text}\n\n`;
  }
  
  return content;
}
```

## Performance Optimizations

### Memory-Efficient Processing
```typescript
async function processLargeZipOptimized(
  zipSource: ArrayBuffer | string,
  options: {
    isBase64?: boolean;
    onProgress?: (stage: string, progress: number) => void;
  } = {}
): Promise<void> {
  const { isBase64 = false, onProgress } = options;

  try {
    onProgress?.('loading', 0);

    // Load ZIP with memory optimization
    const zip = await loadZipFile(zipSource, { isBase64 });

    onProgress?.('processing', 10);

    // Process in batches to avoid memory issues
    const batchSize = 50;
    const allFiles = Object.entries(zip.files).filter(([_, entry]) => !entry.dir);
    
    for (let i = 0; i < allFiles.length; i += batchSize) {
      const batch = allFiles.slice(i, i + batchSize);
      
      // Process batch
      await Promise.all(
        batch.map(async ([fileName, zipEntry]) => {
          const content = await zipEntry.async('string');
          // Process content...
          return { fileName, content };
        })
      );
      
      const progress = 10 + ((i + batchSize) / allFiles.length) * 80;
      onProgress?.('processing', Math.min(progress, 90));
    }

    onProgress?.('complete', 100);
  } catch (error) {
    throw new Error(`Processing failed: ${error.message}`);
  }
}
```

### Streaming for Large Files
```typescript
async function processZipStreaming(zip: JSZip): Promise<void> {
  // Process files one by one to minimize memory usage
  for (const [fileName, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    
    // Process as stream for large files
    const content = await zipEntry.async('string');
    
    // Process immediately and discard to free memory
    await processFileContent(fileName, content);
  }
}

async function processFileContent(fileName: string, content: string): Promise<void> {
  // Process content immediately
  console.log(`Processing: ${fileName} (${content.length} bytes)`);
  
  // Simulate processing
  await new Promise(resolve => setTimeout(resolve, 10));
}
```

## Error Handling Patterns

### Comprehensive Error Handling
```typescript
async function safeZipProcessing(filePath: string): Promise<any> {
  try {
    // Validate file exists
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Load ZIP with error handling
    const zipContent = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const zip = await JSZip.loadAsync(zipContent, {
      base64: true,
      createFolders: false,
    });

    // Validate ZIP structure
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
      throw new Error('Invalid archive: missing manifest.json');
    }

    const manifest = JSON.parse(await manifestFile.async('text'));
    
    // Validate manifest structure
    if (!manifest.version) {
      throw new Error('Invalid manifest: missing version');
    }

    return { zip, manifest };

  } catch (error) {
    if (error.message.includes('End of data reached')) {
      throw new Error('Corrupted ZIP file: unexpected end of data');
    } else if (error.message.includes('Invalid signature')) {
      throw new Error('Invalid file format: not a valid ZIP file');
    } else {
      throw new Error(`ZIP processing failed: ${error.message}`);
    }
  }
}
```

### File Access Error Handling
```typescript
async function handleContentUriAccess(contentUri: string): Promise<string> {
  try {
    const { StorageAccessFramework } = await import('expo-file-system');
    
    // Create cache path
    const cacheFileName = `temp_${Date.now()}.zip`;
    const cacheFilePath = `${FileSystem.cacheDirectory}${cacheFileName}`;

    // Handle Android URI encoding issues
    let sourceUri = contentUri;
    if (contentUri.includes('primary:Documents/')) {
      sourceUri = contentUri.replace('primary:Documents/', 'primary%3ADocuments%2F');
    }

    await StorageAccessFramework.copyAsync({
      from: sourceUri,
      to: cacheFilePath,
    });

    return cacheFilePath;

  } catch (copyError) {
    if (copyError.message.includes('permission')) {
      throw new Error('Could not access file: Permission denied');
    } else if (copyError.message.includes('not found')) {
      throw new Error('File not found or moved');
    } else {
      throw new Error(`File access failed: ${copyError.message}`);
    }
  }
}
```

## Platform-Specific Considerations

### Android Content URI Handling
```typescript
async function loadZipCrossPlatform(filePath: string): Promise<JSZip> {
  let actualFilePath = filePath;

  // Handle Android content URIs
  if (filePath.startsWith('content://')) {
    console.log('Content URI detected, copying to cache...');
    actualFilePath = await handleContentUriAccess(filePath);
  }

  // Load ZIP from resolved path
  return await loadZipFromFile(actualFilePath);
}
```

### Cleanup Temporary Files
```typescript
async function cleanupTempFiles(): Promise<void> {
  try {
    const cacheInfo = await FileSystem.getInfoAsync(FileSystem.cacheDirectory!);
    if (cacheInfo.exists) {
      const files = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory!);
      
      for (const file of files) {
        if (file.startsWith('temp_') && file.endsWith('.zip')) {
          const filePath = `${FileSystem.cacheDirectory}${file}`;
          await FileSystem.deleteAsync(filePath, { idempotent: true });
          console.log(`Cleaned up: ${file}`);
        }
      }
    }
  } catch (error) {
    console.warn('Cleanup failed:', error.message);
  }
}
```

## Complete Examples

### Complete Import Example
```typescript
interface ImportResult {
  success: boolean;
  files: ProcessedFileData[];
  manifest?: any;
  errors: string[];
}

async function importZipArchive(
  filePath: string,
  onProgress?: (progress: number, status: string) => void
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    files: [],
    errors: []
  };

  try {
    onProgress?.(0, 'Reading file...');
    
    // Load ZIP file
    const zip = await loadZipCrossPlatform(filePath);
    
    onProgress?.(20, 'Validating archive...');
    
    // Read and validate manifest
    const manifest = await readManifest(zip);
    result.manifest = manifest;
    
    onProgress?.(40, 'Processing contents...');
    
    // Process all files
    const files = await processZipContents(
      zip,
      (processed, total, status) => {
        const progress = 40 + ((processed / total) * 50);
        onProgress?.(progress, status);
      }
    );
    
    result.files = files;
    result.success = true;
    
    onProgress?.(100, 'Import complete!');
    
  } catch (error) {
    result.errors.push(error.message);
    console.error('Import failed:', error);
  }

  return result;
}
```

### Complete Export Example
```typescript
async function exportDataAsZip(
  data: any,
  outputPath: string,
  onProgress?: (progress: number, status: string) => void
): Promise<boolean> {
  try {
    onProgress?.(0, 'Preparing data...');
    
    // Create ZIP archive
    const zipBlob = await createZipArchive(data, onProgress);
    
    onProgress?.(90, 'Saving file...');
    
    // Save to file system (platform specific)
    if (Platform.OS === 'web') {
      // Web download
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'export.zip';
      link.click();
      URL.revokeObjectURL(url);
    } else {
      // Mobile save
      const base64 = await blobToBase64(zipBlob);
      await FileSystem.writeAsStringAsync(outputPath, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }
    
    onProgress?.(100, 'Export complete!');
    return true;
    
  } catch (error) {
    console.error('Export failed:', error);
    return false;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
```

## Key Takeaways

1. **Memory Management**: Use `createFolders: false` and process files in batches for large archives
2. **Error Handling**: Implement comprehensive error handling for file access, parsing, and validation
3. **Platform Support**: Handle platform-specific file access patterns (Android content URIs)
4. **Progress Tracking**: Provide user feedback during long-running operations
5. **Cleanup**: Always clean up temporary files after processing
6. **Validation**: Validate ZIP structure and required files before processing
7. **Performance**: Use streaming and batch processing for large files

This guide provides a solid foundation for using JSZip in production applications with proper error handling, performance optimizations, and cross-platform support. 