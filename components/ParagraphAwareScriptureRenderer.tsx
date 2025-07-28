import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  CleanScripture,
  Paragraph
} from '../types/usfm';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface ParagraphAwareScriptureRendererProps {
  scripture: CleanScripture | null;
  reference?: string; // e.g., "JON 1:3-5" or chapter reference like "JON 1"
  showVerseNumbers?: boolean;
  showReference?: boolean;
  highlightVerses?: number[];
  style?: any;
  verseStyle?: any;
  maxHeight?: number;
}

export const ParagraphAwareScriptureRenderer: React.FC<ParagraphAwareScriptureRendererProps> = ({
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

  if (!scripture) {
    return (
      <ThemedView style={[styles.container, style]}>
        <ThemedText style={styles.noContentText}>
          No scripture data available
        </ThemedText>
      </ThemedView>
    );
  }

  // Parse reference and get relevant paragraphs
  const getParagraphsForRange = (): Paragraph[] => {
    if (!reference) {
      // Return all paragraphs from first chapter
      const firstChapter = scripture.chapters?.[0];
      return firstChapter?.paragraphs || [];
    }

    // Parse reference to get chapter and verse range
    // Support both same-chapter (JON 1:17-19) and cross-chapter (JON 1:17-2:1) references
    const sameChapterMatch = reference.match(/^([A-Z]+)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/i);
    const crossChapterMatch = reference.match(/^([A-Z]+)\s+(\d+):(\d+)-(\d+):(\d+)$/i);
    
    if (crossChapterMatch) {
      // Handle cross-chapter references like "JON 1:17-2:1"
      const startChapter = parseInt(crossChapterMatch[2]);
      const startVerse = parseInt(crossChapterMatch[3]);
      const endChapter = parseInt(crossChapterMatch[4]);
      const endVerse = parseInt(crossChapterMatch[5]);
      
      const allParagraphs: Paragraph[] = [];
      
      // Collect paragraphs from all chapters in the range
      for (let chapterNum = startChapter; chapterNum <= endChapter; chapterNum++) {
        const chapter = scripture.chapters?.find(ch => ch.number === chapterNum);
        if (chapter?.paragraphs) {
          const filteredParagraphs = chapter.paragraphs.filter(paragraph => {
            if (chapterNum === startChapter && chapterNum === endChapter) {
              // Same chapter (shouldn't happen with cross-chapter match, but just in case)
              return paragraph.startVerse <= endVerse && paragraph.endVerse >= startVerse;
            } else if (chapterNum === startChapter) {
              // First chapter - from startVerse to end of chapter
              return paragraph.endVerse >= startVerse;
            } else if (chapterNum === endChapter) {
              // Last chapter - from beginning to endVerse
              return paragraph.startVerse <= endVerse;
            } else {
              // Middle chapters - include all paragraphs
              return true;
            }
          });
          
          // Mark paragraphs with their chapter context
          const contextualParagraphs = filteredParagraphs.map(p => ({
            ...p,
            chapterNumber: chapterNum
          }));
          
          allParagraphs.push(...contextualParagraphs);
        }
      }
      
      return allParagraphs;
      
    } else if (sameChapterMatch) {
      // Handle same-chapter references like "JON 1:17-19" or "JON 1:17"
      const chapter = parseInt(sameChapterMatch[2]);
      const startVerse = sameChapterMatch[3] ? parseInt(sameChapterMatch[3]) : null;
      const endVerse = sameChapterMatch[4] ? parseInt(sameChapterMatch[4]) : startVerse;

      const targetChapter = scripture.chapters?.find(ch => ch.number === chapter);
      if (!targetChapter || !targetChapter.paragraphs) return [];

      if (startVerse === null) {
        // Return all paragraphs in chapter
        return targetChapter.paragraphs;
      }

      // Find paragraphs that intersect with the verse range
      return targetChapter.paragraphs.filter(paragraph => {
        // Check if paragraph overlaps with requested range
        return paragraph.startVerse <= (endVerse || startVerse) && 
               paragraph.endVerse >= startVerse;
      });
    }
    
    return [];
  };

  const relevantParagraphs = getParagraphsForRange();

  if (!relevantParagraphs || relevantParagraphs.length === 0) {
    return (
      <ThemedView style={[styles.container, style]}>
        <ThemedText style={styles.noContentText}>
          No content found for reference: {reference}
        </ThemedText>
      </ThemedView>
    );
  }

  // Get verse range for filtering
  const getVerseRange = (): { 
    start: number; 
    end: number; 
    startChapter?: number; 
    endChapter?: number; 
    isCrossChapter?: boolean;
  } | null => {
    if (!reference) return null;
    
    // Check for cross-chapter reference first
    const crossChapterMatch = reference.match(/^([A-Z]+)\s+(\d+):(\d+)-(\d+):(\d+)$/i);
    if (crossChapterMatch) {
      const startChapter = parseInt(crossChapterMatch[2]);
      const startVerse = parseInt(crossChapterMatch[3]);
      const endChapter = parseInt(crossChapterMatch[4]);
      const endVerse = parseInt(crossChapterMatch[5]);
      
      return {
        start: startVerse,
        end: endVerse,
        startChapter,
        endChapter,
        isCrossChapter: true
      };
    }
    
    // Handle same-chapter reference
    const sameChapterMatch = reference.match(/^([A-Z]+)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/i);
    if (sameChapterMatch) {
      const startVerse = sameChapterMatch[3] ? parseInt(sameChapterMatch[3]) : null;
      const endVerse = sameChapterMatch[4] ? parseInt(sameChapterMatch[4]) : startVerse;

      return startVerse ? { 
        start: startVerse, 
        end: endVerse || startVerse,
        isCrossChapter: false
      } : null;
    }
    
    return null;
  };

  const renderParagraph = (paragraph: Paragraph) => {
    if (!paragraph || !paragraph.verses) return null;
    
    const isPoetry = paragraph.type === 'quote';
    const verseRange = getVerseRange();

    // Filter verses within this paragraph to only show those in the requested range
    const versesToShow = paragraph.verses.filter(verse => {
      if (!verseRange) return true; // Show all if no specific range
      
              if (verseRange.isCrossChapter && verseRange.startChapter && verseRange.endChapter) {
          // Handle cross-chapter filtering
          const paragraphChapter = (paragraph as any).chapterNumber || 
            // Fallback: try to determine chapter from verse reference if available
            (verse.reference ? parseInt(verse.reference.match(/(\d+):/)?.[1] || '1') : 1);
          
          if (paragraphChapter === verseRange.startChapter && paragraphChapter === verseRange.endChapter) {
            // Same chapter (edge case)
            return verse.number >= verseRange.start && verse.number <= verseRange.end;
          } else if (paragraphChapter === verseRange.startChapter) {
            // First chapter - from startVerse to end of chapter
            return verse.number >= verseRange.start;
          } else if (paragraphChapter === verseRange.endChapter) {
            // Last chapter - from beginning to endVerse
            return verse.number <= verseRange.end;
          } else if (paragraphChapter > verseRange.startChapter && paragraphChapter < verseRange.endChapter) {
            // Middle chapters - include all verses
            return true;
          } else {
            // Outside the chapter range
            return false;
          }
        } else {
        // Same-chapter filtering
        return verse.number >= verseRange.start && verse.number <= verseRange.end;
      }
    });

    if (versesToShow.length === 0) return null;

    // Calculate proper indentation based on Bible formatting standards
    const getPoetryIndentation = () => {
      if (!isPoetry) return 0;
      
      // Traditional Bible poetry indentation standards:
      // q/q1: base level (no extra indent)
      // q2: secondary level (moderate indent) 
      // q3: tertiary level (deeper indent)
      // q4: quaternary level (deepest indent)
      const baseIndent = 24; // More substantial base increment than before
      return paragraph.indentLevel * baseIndent;
    };

    // For poetry, render verses as separate lines for better readability
    if (isPoetry) {
      return (
        <View
          key={paragraph.id}
          style={[
            styles.paragraphContainer,
            styles.poetryContainer,
            { marginLeft: getPoetryIndentation() }
          ]}
        >
          {versesToShow.map((verse, index) => {
            if (!verse || verse.number === undefined || !verse.text) return null;
            
            const isHighlighted = highlightVerses.includes(verse.number);
            
            return (
              <View key={verse.number} style={styles.poetryLineContainer}>
                <ThemedText style={[
                  styles.poetryText,
                  verseStyle
                ]}>
                                     {showVerseNumbers && (
                     <Text style={[
                       styles.verseNumber,
                       styles.poetryVerseNumber,
                       isHighlighted && styles.highlightedNumber
                     ]}>
                       {verse.number}
                     </Text>
                   )}
                  <Text style={[
                    styles.poetryVerseText,
                    isHighlighted && styles.highlightedText
                  ]}>
                    {verse.text}
                  </Text>
                </ThemedText>
              </View>
            );
          })}
        </View>
      );
    }

    // For prose, render verses inline as before
    return (
      <View
        key={paragraph.id}
        style={[
          styles.paragraphContainer,
        ]}
      >
        <ThemedText style={[
          styles.paragraphText,
          isPoetry && styles.poetryText,
          verseStyle
                 ]}>
           {versesToShow.map((verse, index) => {
             if (!verse || verse.number === undefined || !verse.text) return null;
             
             const isHighlighted = highlightVerses.includes(verse.number);
             
             return (
               <Text key={verse.number}>
                                   {showVerseNumbers && (
                    <Text style={[
                      styles.verseNumber,
                      isHighlighted && styles.highlightedNumber
                    ]}>
                      {verse.number}
                    </Text>
                  )}
                 <Text style={[
                   isHighlighted && styles.highlightedText
                 ]}>
                   {verse.text}
                 </Text>
                 {index < versesToShow.length - 1 && ' '}
               </Text>
             );
           })}
         </ThemedText>
      </View>
    );
  };

  // Render paragraphs with chapter separators for cross-chapter content
  const renderParagraphsWithChapterSeparators = () => {
    const filteredParagraphs = relevantParagraphs.filter(p => p != null);
    const elements: React.ReactElement[] = [];
    let currentChapter: number | null = null;
    
    filteredParagraphs.forEach((paragraph, index) => {
      const paragraphChapter = (paragraph as any).chapterNumber || 
        // Fallback: try to determine chapter from first verse reference
        (paragraph.verses?.[0]?.reference ? 
         parseInt(paragraph.verses[0].reference.match(/(\d+):/)?.[1] || '1') : 1);
      
      // Add chapter separator for the first chapter or when chapter changes
      if (currentChapter === null || paragraphChapter !== currentChapter) {
        elements.push(
          <View key={`chapter-separator-${paragraphChapter}`} style={styles.chapterSeparator}>
            <View style={styles.chapterSeparatorLine} />
            <ThemedText style={styles.chapterSeparatorText}>
              {paragraphChapter}
            </ThemedText>
            <View style={styles.chapterSeparatorLine} />
          </View>
        );
      }
      
      // Render the paragraph
      const renderedParagraph = renderParagraph(paragraph);
      if (renderedParagraph) {
        elements.push(renderedParagraph);
      }
      
      currentChapter = paragraphChapter;
    });
    
    return elements;
  };

  return (
    <ThemedView style={[styles.container, style, maxHeight && { maxHeight }]}>
      {showReference && reference && (
        <View style={styles.referenceContainer}>
          <ThemedText style={styles.referenceText}>
            {reference}
          </ThemedText>
        </View>
      )}
      
      <View style={styles.contentContainer}>
        {renderParagraphsWithChapterSeparators()}
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  referenceContainer: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    paddingBottom: 8,
  },
  referenceText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  verseContainer: {
    marginBottom: 8,
  },
  paragraphContainer: {
    marginBottom: 12,
  },
  poetryContainer: {
    marginBottom: 20,
    paddingLeft: 12, // Additional visual separation for poetry
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(0, 122, 255, 0.3)', // Subtle visual cue for poetry
    backgroundColor: 'rgba(0, 122, 255, 0.03)', // Very subtle background tint
    paddingVertical: 10,
    borderRadius: 6,
  },
  poetryLineContainer: {
    marginBottom: 6, // Space between each line of poetry
    paddingLeft: 4,
  },
  verseText: {
    fontSize: 16,
    lineHeight: 24,
  },
  paragraphText: {
    fontSize: 16,
    lineHeight: 24,
  },
  poetryText: {
    fontSize: 16,
    lineHeight: 26, // Slightly more spacious for poetry readability
    color: 'rgba(0, 0, 0, 0.85)', // Slightly softer text color for poetry
  },
  poetryVerseText: {
    fontStyle: 'italic',
    fontWeight: '400',
  },
  poetryVerseNumber: {
    fontSize: 11,
    fontWeight: 'bold',
    marginRight: 8,
    color: '#007AFF',
    opacity: 0.7, // More subtle verse numbers for poetry
  },
  verseNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 10,
    color: '#007AFF',
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
    padding: 20,
  },
  chapterSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 16,
  },
  chapterSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
  },
  chapterSeparatorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    borderRadius: 12,
    paddingVertical: 4,
  },
}); 