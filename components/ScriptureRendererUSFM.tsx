import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

// Import our USFM processor (you'll need to convert this to TypeScript or use require)
// const USFMProcessor = require('./USFMProcessor');

interface Verse {
  number: number;
  text: string;
  id?: string;
}

interface ScriptureData {
  book: string;
  chapter: number;
  verses: Verse[];
}

interface ScriptureRendererUSFMProps {
  scriptureData: ScriptureData;
  verseRange?: string;
  showVerseNumbers?: boolean;
  style?: any;
  highlightVerses?: number[];
}

export const ScriptureRendererUSFM: React.FC<ScriptureRendererUSFMProps> = ({
  scriptureData,
  verseRange,
  showVerseNumbers = true,
  style,
  highlightVerses = []
}) => {
  const colorScheme = useColorScheme();

  // Filter verses based on verse range if provided
  const getVisibleVerses = (): Verse[] => {
    if (!verseRange) return scriptureData.verses;

    if (verseRange.includes('-')) {
      const [start, end] = verseRange.split('-').map(n => parseInt(n.trim()));
      return scriptureData.verses.filter(v => v.number >= start && v.number <= end);
    } else {
      const verseNum = parseInt(verseRange.trim());
      return scriptureData.verses.filter(v => v.number === verseNum);
    }
  };

  const visibleVerses = getVisibleVerses();

  const renderVerse = (verse: Verse) => {
    const isHighlighted = highlightVerses.includes(verse.number);
    
    return (
      <View key={verse.number} style={styles.verseContainer}>
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

  return (
    <ThemedView style={[styles.container, style]}>
      <View style={styles.header}>
        <ThemedText style={styles.reference}>
          {scriptureData.book} {scriptureData.chapter}
          {verseRange ? `:${verseRange}` : ''}
        </ThemedText>
      </View>
      
      <View style={styles.content}>
        {visibleVerses.map(renderVerse)}
      </View>
    </ThemedView>
  );
};

// Example data structure that would come from USFMProcessor
export const jonahUSFMData: ScriptureData = {
  book: 'Jonah',
  chapter: 3,
  verses: [
    {
      number: 1,
      text: 'And the word of Yahweh came to Jonah son of Amittai, saying,',
      id: '3:1'
    },
    {
      number: 2,
      text: '"Get up, go to Nineveh, the great city, and call out against it, because their evil has risen up before my face."',
      id: '3:2'
    },
    {
      number: 3,
      text: 'But Jonah got up to run away to Tarshish from before the face of Yahweh. And he went down to Joppa and found a ship going to Tarshish. So he paid the fare and went down into it to go with them to Tarshish, away from before the face of Yahweh.',
      id: '3:3'
    },
    // Add more verses as needed...
  ]
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
  },
  reference: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    gap: 8,
  },
  verseContainer: {
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
}); 