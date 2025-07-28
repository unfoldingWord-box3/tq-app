import { useCallback, useEffect, useState } from 'react';
import { fetchUSFMContent, getBookInfo } from '../services/usfmService';
import { CleanScripture } from '../types/usfm';
import { processUSFMDocument } from '../utils/scriptureProcessor';

const usfm = require('usfm-js');

interface UseUSFMScriptureResult {
  scripture: CleanScripture | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseUSFMScriptureOptions {
  bookCode: string;
  enableSections?: boolean;
}

/**
 * React hook to fetch and process USFM content into optimized scripture data
 */
export function useUSFMScripture(options: UseUSFMScriptureOptions): UseUSFMScriptureResult {
  const { bookCode, enableSections = true } = options;
  const [scripture, setScripture] = useState<CleanScripture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const processUSFMContent = useCallback(async (usfmContent: string): Promise<CleanScripture> => {
    try {
      // Convert USFM to JSON using usfm-js
      console.log('🔄 Converting USFM to JSON...');
      const usfmJson = usfm.toJSON(usfmContent);
      
      // Get book information
      const bookInfo = getBookInfo(bookCode);
      const bookName = bookInfo?.name || bookCode;

      // Process using our optimized processor with all improvements
      console.log('🧩 Processing with optimized paragraph-aware processor...');
      const cleanScripture = processUSFMDocument(usfmJson, bookName, bookCode);

      console.log(`✅ Processed ${bookName}:`, {
        chapters: cleanScripture.metadata.totalChapters,
        paragraphs: cleanScripture.metadata.totalParagraphs,
        verses: cleanScripture.metadata.totalVerses,
        sections: enableSections ? cleanScripture.sections?.length || 0 : 0,
        processingDate: cleanScripture.metadata.processingDate,
        version: cleanScripture.metadata.version
      });

      return cleanScripture;
    } catch (error) {
      console.error('❌ Error processing USFM content:', error);
      throw new Error('Failed to process USFM content');
    }
  }, [bookCode, enableSections]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`📖 Fetching USFM content for ${bookCode}...`);
      const usfmContent = await fetchUSFMContent(bookCode);
      
      const processedScripture = await processUSFMContent(usfmContent);
      setScripture(processedScripture);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Hook error:', message);
      setError(message);
      setScripture(null);
    } finally {
      setLoading(false);
    }
  }, [bookCode, processUSFMContent]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    scripture,
    loading,
    error,
    refetch: fetchData
  };
} 