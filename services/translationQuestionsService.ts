import { TranslationQuestion, TranslationQuestionsData } from '@/types/translationQuestions';
import * as FileSystem from 'expo-file-system';
import { databaseService } from './databaseService';
import { resourceCacheService } from './resourceCacheService';

// Static import for fallback content
import tqJON from '@/assets/tsv/tq_JON';

// Get translation questions data for a specific book from cached resources
const getTranslationQuestionsData = async (bookCode: string): Promise<string> => {
  try {
    console.log(`Fetching translation questions for ${bookCode}...`);
    
    // Get TQ resources from database
    const resources = await databaseService.getDownloadedResources();
    const tqResources = resources.filter(r => 
      r.subject === 'Translation Questions' || 
      r.subject === 'TSV Translation Questions' ||
      r.name.toLowerCase().includes('tq')
    );

    if (tqResources.length === 0) {
      throw new Error('No translation questions resources found. Please download a TQ resource first.');
    }

    // Try to find TSV content in cached resources
    for (const resource of tqResources) {
      try {
        const extractedPath = resource.local_path.replace('/downloads/', '/extracted/').replace('.zip', '/');
        console.log(`🔍 Searching TQ for ${bookCode} in: ${resource.name}`);
        
        // Debug: list all files in the resource
        const files = await resourceCacheService.getResourceFiles(resource.id);
        console.log(`📁 Files in ${resource.name}:`, files.slice(0, 10), files.length > 10 ? `... and ${files.length - 10} more` : '');
        
        const tsvContent = await findTQInResource(extractedPath, bookCode);
        if (tsvContent) {
          console.log(`✅ Found TQ content for ${bookCode} in resource: ${resource.name}`);
          return tsvContent;
        }
      } catch (error) {
        console.warn(`Failed to load ${bookCode} TQ from resource ${resource.name}:`, error);
        continue;
      }
    }

    // Fallback to static content if available
    if (bookCode.toUpperCase() === 'JON') {
      console.log('📋 Using fallback TQ content for Jonah');
      return tqJON;
    }

    throw new Error(`Translation questions not available for book code: ${bookCode}`);
  } catch (error) {
    console.error('Error fetching translation questions:', error);
    throw error;
  }
};

/**
 * Find translation questions TSV content for a specific book in a resource directory
 */
async function findTQInResource(resourcePath: string, bookCode: string): Promise<string | null> {
  try {
    // Check if resource directory exists
    const resourceInfo = await FileSystem.getInfoAsync(resourcePath);
    if (!resourceInfo.exists) {
      return null;
    }

    // Get all files in the resource - extract resource ID from path
    const resourceId = resourcePath.split('/').filter(Boolean).pop() || '';
    const files = await resourceCacheService.getResourceFiles(resourceId);
    
    // Look for TSV files matching the book code - comprehensive search
    const possibleFilenames = [
      // Direct file names
      `tq_${bookCode}.tsv`,
      `tq_${bookCode.toLowerCase()}.tsv`, 
      `tq_${bookCode.toUpperCase()}.tsv`,
      `${bookCode}.tsv`,
      `${bookCode.toLowerCase()}.tsv`,
      `${bookCode.toUpperCase()}.tsv`,
      // In subdirectories
      `books/tq_${bookCode}.tsv`,
      `books/tq_${bookCode.toLowerCase()}.tsv`,
      `books/tq_${bookCode.toUpperCase()}.tsv`, 
      `books/${bookCode}.tsv`,
      `books/${bookCode.toLowerCase()}.tsv`,
      `books/${bookCode.toUpperCase()}.tsv`,
      `content/tq_${bookCode}.tsv`,
      `content/tq_${bookCode.toLowerCase()}.tsv`,
      `content/tq_${bookCode.toUpperCase()}.tsv`,
      `content/${bookCode}.tsv`,
      `content/${bookCode.toLowerCase()}.tsv`,
      `content/${bookCode.toUpperCase()}.tsv`,
      // Try all TSV files that might contain the book
      ...files.filter(f => f.endsWith('.tsv') && (
        f.includes(bookCode.toLowerCase()) || 
        f.includes(bookCode.toUpperCase()) ||
        f.includes(bookCode)
      )),
    ];

    for (const filename of possibleFilenames) {
      if (files.includes(filename)) {
        const filePath = `${resourcePath}${filename}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists) {
          const content = await FileSystem.readAsStringAsync(filePath);
          if (content.trim()) {
            return content;
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.warn(`Error searching for TQ in resource:`, error);
    return null;
  }
}

// Parse TSV string into structured data
const parseTSV = (tsvData: string): TranslationQuestion[] => {
  const lines = tsvData.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('Invalid TSV data: missing header or data rows');
  }

  // Skip the header row and parse data rows
  const dataLines = lines.slice(1);
  
  return dataLines
    .map((line, index) => {
      const columns = line.split('\t');
      
      if (columns.length < 7) {
        console.warn(`Row ${index + 2} has insufficient columns, skipping`);
        return null;
      }

      const [reference, id, tags, quote, occurrence, question, response] = columns;

      return {
        reference: reference.trim(),
        id: id.trim(),
        tags: tags?.trim() || undefined,
        quote: quote?.trim() || undefined,
        occurrence: occurrence?.trim() || undefined,
        question: question.trim(),
        response: response.trim(),
        // Initialize UI state
        isBookmarked: false,
        hasAudio: true, // Assuming questions can have audio
        isRecorded: false
      } as TranslationQuestion;
    })
    .filter((item): item is TranslationQuestion => item !== null);
};

// Group questions by chapter and reference
const processQuestions = (questions: TranslationQuestion[], bookCode: string): TranslationQuestionsData => {
  const questionsByChapter: Record<number, TranslationQuestion[]> = {};
  const questionsByReference: Record<string, TranslationQuestion[]> = {};

  questions.forEach(question => {
    // Parse chapter from reference (e.g., "1:2" -> chapter 1)
    const chapterMatch = question.reference.match(/^(\d+):/);
    if (chapterMatch) {
      const chapter = parseInt(chapterMatch[1]);
      
      // Group by chapter
      if (!questionsByChapter[chapter]) {
        questionsByChapter[chapter] = [];
      }
      questionsByChapter[chapter].push(question);

      // Group by full reference (e.g., "JON 1:2")
      const fullReference = `${bookCode} ${question.reference}`;
      if (!questionsByReference[fullReference]) {
        questionsByReference[fullReference] = [];
      }
      questionsByReference[fullReference].push(question);
    }
  });

  return {
    bookCode,
    questions,
    questionsByChapter,
    questionsByReference
  };
};

// Main fetch function
export const fetchTranslationQuestions = async (bookCode: string): Promise<TranslationQuestionsData> => {
  try {
    console.log(`Fetching translation questions for ${bookCode}...`);
    
    // Get TSV data
    const tsvData = await getTranslationQuestionsData(bookCode);
    
    // Parse TSV
    const questions = parseTSV(tsvData);
    
    console.log(`Parsed ${questions.length} translation questions`);
    
    // Process and group questions
    const processedData = processQuestions(questions, bookCode);
    
    return processedData;
  } catch (error) {
    console.error('Error fetching translation questions:', error);
    throw error;
  }
};

// Helper functions for accessing grouped data
export const getQuestionsForChapter = (data: TranslationQuestionsData, chapter: number): TranslationQuestion[] => {
  return data.questionsByChapter[chapter] || [];
};

export const getQuestionsForReference = (data: TranslationQuestionsData, reference: string): TranslationQuestion[] => {
  return data.questionsByReference[reference] || [];
};

export const getQuestionsForVerseRange = (
  data: TranslationQuestionsData, 
  bookCode: string, 
  chapter: number, 
  startVerse: number, 
  endVerse?: number
): TranslationQuestion[] => {
  const allQuestions: TranslationQuestion[] = [];
  
  if (endVerse) {
    // Range of verses
    console.log(`🔍 Searching range ${bookCode} ${chapter}:${startVerse}-${endVerse}`);
    for (let verse = startVerse; verse <= endVerse; verse++) {
      const reference = `${bookCode} ${chapter}:${verse}`;
      const questions = getQuestionsForReference(data, reference);
      console.log(`  📝 ${reference}: ${questions.length} questions`);
      allQuestions.push(...questions);
    }
  } else {
    // Single verse
    const reference = `${bookCode} ${chapter}:${startVerse}`;
    console.log(`🔍 Searching single verse ${reference}`);
    const questions = getQuestionsForReference(data, reference);
    console.log(`  📝 ${reference}: ${questions.length} questions`);
    allQuestions.push(...questions);
  }
  
  console.log(`✅ Total questions found: ${allQuestions.length}`);
  return allQuestions;
}; 