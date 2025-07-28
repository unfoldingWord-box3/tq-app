import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
    CleanScripture,
    CleanVerse,
    ScriptureReference
} from '../types/usfm';
import {
    formatVerses,
    getVersesByReference,
    getVersesByReferenceString,
    parseScriptureReference
} from '../utils/scriptureProcessor';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface ScriptureRendererProps {
  scripture: CleanScripture;
  reference?: string | ScriptureReference; // e.g., "JON 1:3-5" or parsed reference object
  showVerseNumbers?: boolean;
  showReference?: boolean;
  highlightVerses?: number[];
  style?: any;
  verseStyle?: any;
  maxHeight?: number;
}

export const ScriptureRenderer: React.FC<ScriptureRendererProps> = ({
  scripture,
  reference,
  showVerseNumbers = true,
  showReference = true,
  highlightVerses = [],
  style,
  verseStyle,
  maxHeight
}) => {
  const colorScheme = useColorScheme();

  // Parse the reference and get verses
  const getTargetVerses = (): { verses: CleanVerse[], parsedRef: ScriptureReference | null } => {
    if (!reference) {
      // If no reference provided, return all verses from first chapter
      const firstChapter = scripture.chapters[0];
      if (firstChapter) {
        return {
          verses: firstChapter.verses,
          parsedRef: {
            book: scripture.book,
            bookCode: scripture.bookCode,
            chapter: firstChapter.number,
            verseStart: 1,
            verseEnd: firstChapter.verses[firstChapter.verses.length - 1]?.number,
            displayReference: `${scripture.bookCode} ${firstChapter.number}`
          }
        };
      }
      return { verses: [], parsedRef: null };
    }

    if (typeof reference === 'string') {
      const verses = getVersesByReferenceString(scripture, reference);
      const parsedRef = parseScriptureReference(reference);
      return { verses, parsedRef };
    } else {
      const verses = getVersesByReference(scripture, reference);
      return { verses, parsedRef: reference };
    }
  };

  const { verses, parsedRef } = getTargetVerses();

  const renderVerse = (verse: CleanVerse) => {
    const isHighlighted = highlightVerses.includes(verse.number);
    
    return (
      <View key={verse.number} style={[styles.verseContainer, verseStyle]}>
        {showVerseNumbers && (
          <Text style={[
            styles.verseNumber,
            { color: Colors[colorScheme ?? 'light'].tabIconDefault },
            isHighlighted && styles.highlightedNumber
          ]}>
            {verse.number}
          </Text>
        )}
        <ThemedText style={[
          styles.verseText,
          isHighlighted && styles.highlightedText
        ]}>
          {verse.text}
        </ThemedText>
      </View>
    );
  };

  if (verses.length === 0) {
    return (
      <ThemedView style={[styles.container, style]}>
        <ThemedText style={styles.noContentText}>
          No verses found{reference ? ` for ${typeof reference === 'string' ? reference : reference.displayReference}` : ''}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, style, maxHeight && { maxHeight }]}>
      {showReference && parsedRef && (
        <View style={styles.header}>
          <ThemedText style={styles.referenceText}>
            {parsedRef.displayReference}
          </ThemedText>
        </View>
      )}
      
      <View style={[styles.content, maxHeight && styles.scrollableContent]}>
        {verses.map(renderVerse)}
      </View>
    </ThemedView>
  );
};

// Hook for easier scripture processing
export function useScripture(usfmDocument: any, bookName: string, bookCode: string): CleanScripture | null {
  const [scripture, setScripture] = React.useState<CleanScripture | null>(null);

  React.useEffect(() => {
    if (usfmDocument) {
      // Import the processor function here or pass it as prop
      // For now, we'll assume it's processed externally
      setScripture(usfmDocument);
    }
  }, [usfmDocument]);

  return scripture;
}

// Utility component for quick verse display
interface QuickVerseProps {
  scripture: CleanScripture;
  reference: string;
  style?: any;
}

export const QuickVerse: React.FC<QuickVerseProps> = ({ scripture, reference, style }) => {
  const verses = getVersesByReferenceString(scripture, reference);
  const text = formatVerses(verses, false);
  
  return (
    <ThemedText style={[styles.quickVerseText, style]}>
      {text || 'Verse not found'}
    </ThemedText>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    paddingBottom: 8,
    alignItems: 'center',
  },
  referenceText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    gap: 8,
  },
  scrollableContent: {
    // On React Native, use ScrollView component instead of overflow:scroll
  },
  verseContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  verseNumber: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 20,
    marginTop: 2,
  },
  verseText: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
  },
  highlightedNumber: {
    fontWeight: '700',
    color: '#007AFF',
  },
  highlightedText: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 4,
    padding: 4,
  },
  noContentText: {
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    opacity: 0.7,
  },
  quickVerseText: {
    fontSize: 14,
    lineHeight: 20,
  },
}); 