import { useState, useEffect } from 'react';
import { 
  TranslationQuestionsData, 
  UseTranslationQuestionsOptions, 
  UseTranslationQuestionsResult 
} from '@/types/translationQuestions';
import { fetchTranslationQuestions } from '@/services/translationQuestionsService';

export const useTranslationQuestions = (
  options: UseTranslationQuestionsOptions
): UseTranslationQuestionsResult => {
  const [questions, setQuestions] = useState<TranslationQuestionsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { bookCode, enableGrouping = true } = options;

  useEffect(() => {
    let isMounted = true;

    const loadQuestions = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log(`Loading translation questions for ${bookCode}...`);

        const questionsData = await fetchTranslationQuestions(bookCode);

        if (isMounted) {
          setQuestions(questionsData);
          console.log(`Successfully loaded ${questionsData.questions.length} translation questions`);
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
          setError(errorMessage);
          console.error('Failed to load translation questions:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadQuestions();

    // Cleanup function to prevent state updates if component unmounts
    return () => {
      isMounted = false;
    };
  }, [bookCode, enableGrouping]);

  return {
    questions,
    loading,
    error
  };
}; 