import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
    CleanScripture,
    TranslationSection,
    VerseWithSection
} from '../types/usfm';
import {
    formatVerses,
    getNextSection,
    getPreviousSection,
    getSection,
    getSections,
    getVersesWithSectionContext
} from '../utils/scriptureProcessor';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface SectionAwareScriptureRendererProps {
  scripture: CleanScripture | null;
  initialReference?: string; // Can be verse reference like "JON 1:3" or section like "section-1"
  showVerseNumbers?: boolean;
  showSectionNavigation?: boolean;
  showSectionTitle?: boolean;
  highlightVerses?: number[];
  style?: any;
  verseStyle?: any;
  maxHeight?: number;
  onSectionChange?: (section: TranslationSection | null) => void;
}

export const SectionAwareScriptureRenderer: React.FC<SectionAwareScriptureRendererProps> = ({
  scripture,
  initialReference,
  showVerseNumbers = true,
  showSectionNavigation = true,
  showSectionTitle = true,
  highlightVerses = [],
  style,
  verseStyle,
  maxHeight,
  onSectionChange
}) => {
  const colorScheme = useColorScheme();
  
  // Initialize with first section if no reference provided
  const [currentSectionId, setCurrentSectionId] = useState<string>(() => {
    if (!scripture) return '';
    
    if (initialReference) {
      // Try to determine section from reference
      const verses = getVersesWithSectionContext(scripture, initialReference);
      if (verses.length > 0 && verses[0].sectionId) {
        return verses[0].sectionId;
      }
    }
    // Default to first section
    const sections = getSections(scripture);
    return sections.length > 0 ? sections[0].id : '';
  });

  // Update section when scripture becomes available
  useEffect(() => {
    if (scripture && !currentSectionId) {
      if (initialReference) {
        // Try to determine section from reference
        const verses = getVersesWithSectionContext(scripture, initialReference);
        if (verses.length > 0 && verses[0].sectionId) {
          setCurrentSectionId(verses[0].sectionId);
          return;
        }
      }
      // Default to first section
      const sections = getSections(scripture);
      if (sections.length > 0) {
        setCurrentSectionId(sections[0].id);
      }
    }
  }, [scripture, currentSectionId]);

  // Update section when initialReference prop changes
  useEffect(() => {
    if (scripture && initialReference) {
      console.log('SectionAwareScriptureRenderer: initialReference changed to:', initialReference);
      console.log('Available sections:', getSections(scripture).map(s => s.id));
      
      // Try to determine section from reference
      const verses = getVersesWithSectionContext(scripture, initialReference);
      if (verses.length > 0 && verses[0].sectionId) {
        console.log('Found section from verses:', verses[0].sectionId);
        setCurrentSectionId(verses[0].sectionId);
        return;
      }
      
      // If it's already a section ID, use it directly
      const section = getSection(scripture, initialReference);
      if (section) {
        console.log('Found section directly:', initialReference);
        setCurrentSectionId(initialReference);
      } else {
        console.log('No section found for reference:', initialReference);
      }
    }
  }, [initialReference, scripture]);

  // Get current section data
  const currentSection = scripture ? getSection(scripture, currentSectionId) : null;
  const allSections = scripture ? getSections(scripture) : [];
  const verses = (scripture && currentSection) ? getVersesWithSectionContext(scripture, currentSection) : [];

  // Navigation functions
  const goToNextSection = () => {
    if (!scripture) return;
    const nextSection = getNextSection(scripture, currentSectionId);
    if (nextSection) {
      setCurrentSectionId(nextSection.id);
      onSectionChange?.(nextSection);
    }
  };

  const goToPreviousSection = () => {
    if (!scripture) return;
    const prevSection = getPreviousSection(scripture, currentSectionId);
    if (prevSection) {
      setCurrentSectionId(prevSection.id);
      onSectionChange?.(prevSection);
    }
  };

  const goToSection = (sectionId: string) => {
    if (!scripture) return;
    const section = getSection(scripture, sectionId);
    if (section) {
      setCurrentSectionId(sectionId);
      onSectionChange?.(section);
    }
  };

  // Check if navigation is possible
  const canGoNext = scripture ? getNextSection(scripture, currentSectionId) !== null : false;
  const canGoPrevious = scripture ? getPreviousSection(scripture, currentSectionId) !== null : false;

  const renderVerse = (verse: VerseWithSection) => {
    const isHighlighted = highlightVerses.includes(verse.number);
    
    return (
      <View key={verse.number} style={[styles.verseContainer, verseStyle]}>
        {verse.isFirstInSection && (
          <View style={styles.sectionMarker}>
            <View style={[styles.sectionLine, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]} />
          </View>
        )}
        
        <View style={styles.verseContent}>
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
      </View>
    );
  };

  const renderSectionNavigation = () => (
    <View style={styles.navigationContainer}>
      <TouchableOpacity 
        style={[styles.navButton, !canGoPrevious && styles.navButtonDisabled]}
        onPress={goToPreviousSection}
        disabled={!canGoPrevious}
      >
        <Text style={[
          styles.navButtonText, 
          { color: canGoPrevious ? Colors[colorScheme ?? 'light'].tint : Colors[colorScheme ?? 'light'].tabIconDefault }
        ]}>
          ← Previous
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.sectionSelector}>
        <Text style={[styles.sectionSelectorText, { color: Colors[colorScheme ?? 'light'].text }]}>
          {currentSection?.title || 'No Section'} ({allSections.findIndex(s => s.id === currentSectionId) + 1}/{allSections.length})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.navButton, !canGoNext && styles.navButtonDisabled]}
        onPress={goToNextSection}
        disabled={!canGoNext}
      >
        <Text style={[
          styles.navButtonText, 
          { color: canGoNext ? Colors[colorScheme ?? 'light'].tint : Colors[colorScheme ?? 'light'].tabIconDefault }
        ]}>
          Next →
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSectionList = () => (
    <ScrollView 
      horizontal 
      style={styles.sectionListContainer}
      showsHorizontalScrollIndicator={false}
    >
      {allSections.map((section, index) => (
        <TouchableOpacity
          key={section.id}
          style={[
            styles.sectionTab,
            section.id === currentSectionId && { backgroundColor: Colors[colorScheme ?? 'light'].tint }
          ]}
          onPress={() => goToSection(section.id)}
        >
          <Text style={[
            styles.sectionTabText,
            { color: section.id === currentSectionId ? 'white' : Colors[colorScheme ?? 'light'].text }
          ]}>
            {index + 1}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  if (!currentSection) {
    return (
      <ThemedView style={[styles.container, style]}>
        <ThemedText style={styles.noContentText}>
          No translation sections found
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, style, maxHeight && { maxHeight }]}>
      {showSectionNavigation && renderSectionNavigation()}
      
      {showSectionNavigation && renderSectionList()}

      {showSectionTitle && currentSection && (
        <View style={styles.header}>
          <ThemedText style={styles.sectionTitle}>
            {currentSection.title}
          </ThemedText>
          <ThemedText style={styles.sectionRange}>
            {currentSection.startReference}
            {currentSection.endReference && ` - ${currentSection.endReference}`}
          </ThemedText>
        </View>
      )}
      
      <ScrollView 
        style={[styles.content, maxHeight && styles.scrollableContent]}
        showsVerticalScrollIndicator={true}
      >
        {verses.map(renderVerse)}
      </ScrollView>
    </ThemedView>
  );
};

// Utility component for quick section display
interface QuickSectionProps {
  scripture: CleanScripture | null;
  sectionId: string;
  style?: any;
}

export const QuickSection: React.FC<QuickSectionProps> = ({ scripture, sectionId, style }) => {
  if (!scripture) {
    return (
      <ThemedText style={[styles.quickSectionText, style]}>
        Scripture not loaded
      </ThemedText>
    );
  }
  
  const section = getSection(scripture, sectionId);
  if (!section) {
    return (
      <ThemedText style={[styles.quickSectionText, style]}>
        Section not found
      </ThemedText>
    );
  }

  const verses = getVersesWithSectionContext(scripture, section);
  const text = formatVerses(verses, false);
  
  return (
    <ThemedText style={[styles.quickSectionText, style]}>
      {text || 'No content'}
    </ThemedText>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 8,
  },
  navButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionSelector: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  sectionSelectorText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionListContainer: {
    marginBottom: 16,
  },
  sectionTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.05)',
    minWidth: 30,
    alignItems: 'center',
  },
  sectionTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  header: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    paddingBottom: 12,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  sectionRange: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollableContent: {
    // For ScrollView inside maxHeight container
  },
  verseContainer: {
    marginBottom: 8,
  },
  sectionMarker: {
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  sectionLine: {
    height: 2,
    width: 30,
    borderRadius: 1,
  },
  verseContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
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
  quickSectionText: {
    fontSize: 14,
    lineHeight: 20,
  },
}); 