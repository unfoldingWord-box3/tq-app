import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Data model interfaces
export interface Verse {
  number: number;
  text: string;
}

export interface Paragraph {
  id: string;
  verses: Verse[];
}

export interface Scripture {
  book: string;
  chapter: number;
  paragraphs: Paragraph[];
}

// John 3 data
export const john3Scripture: Scripture = {
  book: "John",
  chapter: 3,
  paragraphs: [
    {
      id: "p1",
      verses: [
        {
          number: 1,
          text: "Now there was a Pharisee, a man named Nicodemus who was a member of the Jewish ruling council."
        },
        {
          number: 2,
          text: "He came to Jesus at night and said, \"Rabbi, we know that you are a teacher who has come from God. For no one could perform the signs you are doing if God were not with him.\""
        }
      ]
    },
    {
      id: "p2",
      verses: [
        {
          number: 3,
          text: "Jesus replied, \"Very truly I tell you, no one can see the kingdom of God unless they are born again.\""
        },
        {
          number: 4,
          text: "\"How can someone be born when they are old?\" Nicodemus asked. \"Surely they cannot enter a second time into their mother's womb to be born!\""
        }
      ]
    },
    {
      id: "p3",
      verses: [
        {
          number: 5,
          text: "Jesus answered, \"Very truly I tell you, no one can enter the kingdom of God unless they are born of water and the Spirit."
        },
        {
          number: 6,
          text: "Flesh gives birth to flesh, but the Spirit gives birth to spirit."
        },
        {
          number: 7,
          text: "You should not be surprised at my saying, 'You must be born again.'"
        },
        {
          number: 8,
          text: "The wind blows wherever it pleases. You hear its sound, but you cannot tell where it comes from or where it is going. So it is with everyone born of the Spirit.\""
        }
      ]
    }
  ]
};

// Utility function to parse verse ranges
const parseVerseRange = (range: string): number[] => {
  const verses: number[] = [];
  const parts = range.split(',').map(s => s.trim());
  
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(s => parseInt(s.trim()));
      for (let i = start; i <= end; i++) {
        verses.push(i);
      }
    } else {
      verses.push(parseInt(part));
    }
  }
  
  return verses.sort((a, b) => a - b);
};

// Utility function to get paragraphs with filtered verses by range
const getParagraphsByVerseRange = (scripture: Scripture, range: string): Paragraph[] => {
  const verseNumbers = parseVerseRange(range);
  const filteredParagraphs: Paragraph[] = [];
  
  for (const paragraph of scripture.paragraphs) {
    // Filter verses in this paragraph that match the range
    const matchingVerses = paragraph.verses.filter(verse => 
      verseNumbers.includes(verse.number)
    );
    
    // Only include paragraph if it has matching verses
    if (matchingVerses.length > 0) {
      filteredParagraphs.push({
        ...paragraph,
        verses: matchingVerses
      });
    }
  }
  
  return filteredParagraphs;
};

interface ScriptureRendererProps {
  scripture: Scripture;
  verseRange?: string; // e.g., "1-3", "5", "7-8", "1,3,5-7"
  showVerseNumbers?: boolean;
  style?: any;
}

export const ScriptureRenderer: React.FC<ScriptureRendererProps> = ({
  scripture,
  verseRange,
  showVerseNumbers = true,
  style
}) => {
  const colorScheme = useColorScheme();
  
  // If no range specified, show all paragraphs; otherwise get filtered paragraphs
  const paragraphsToRender = verseRange 
    ? getParagraphsByVerseRange(scripture, verseRange)
    : scripture.paragraphs;

  return (
    <View style={[styles.container, style]}>
      {paragraphsToRender.map((paragraph) => (
        <View key={paragraph.id} style={styles.paragraph}>
          <Text style={[styles.verseText, { color: Colors[colorScheme ?? 'light'].text }]}>
            {paragraph.verses.map((verse: Verse, index: number) => (
              <Text key={verse.number}>
                {showVerseNumbers && (
                  <Text style={[styles.verseNumber, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
                    {verse.number}{' '}
                  </Text>
                )}
                {verse.text}
                {index < paragraph.verses.length - 1 && ' '}
              </Text>
            ))}
          </Text>
        </View>
      ))}
    </View>
  );
};

// Component to render full chapter with paragraph structure
interface ChapterRendererProps {
  scripture: Scripture;
  showVerseNumbers?: boolean;
  style?: any;
}

export const ChapterRenderer: React.FC<ChapterRendererProps> = ({
  scripture,
  showVerseNumbers = true,
  style
}) => {
  const colorScheme = useColorScheme();
  
  return (
    <View style={[styles.container, style]}>
      {scripture.paragraphs.map((paragraph) => (
        <View key={paragraph.id} style={styles.paragraph}>
          {paragraph.verses.map((verse, index) => (
            <Text key={verse.number} style={[styles.verseText, { color: Colors[colorScheme ?? 'light'].text }]}>
              {showVerseNumbers && (
                <Text style={[styles.verseNumber, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
                  {verse.number}{' '}
                </Text>
              )}
              {verse.text}
              {index < paragraph.verses.length - 1 && ' '}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  paragraph: {
    marginBottom: 12,
  },
  verseText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'justify',
  },
  verseNumber: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
}); 