export interface TranslationQuestion {
  reference: string;
  id: string;
  tags?: string;
  quote?: string;
  occurrence?: string;
  question: string;
  response: string;
  // UI state properties
  isBookmarked?: boolean;
  hasAudio?: boolean;
  isRecorded?: boolean;
}

export interface TranslationQuestionsData {
  bookCode: string;
  questions: TranslationQuestion[];
  questionsByChapter: Record<number, TranslationQuestion[]>;
  questionsByReference: Record<string, TranslationQuestion[]>;
}

export interface UseTranslationQuestionsOptions {
  bookCode: string;
  enableGrouping?: boolean;
}

export interface UseTranslationQuestionsResult {
  questions: TranslationQuestionsData | null;
  loading: boolean;
  error: string | null;
} 