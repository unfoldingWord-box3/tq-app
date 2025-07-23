import { ScriptureRenderer, john3Scripture } from '@/components/ScriptureRenderer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Question {
  id: string;
  text: string;
  isBookmarked: boolean;
  hasAudio: boolean;
  isRecorded: boolean;
  relatedVerses: string;
}

export default function CommunityScreen() {
  const colorScheme = useColorScheme();
  const [selectedVerseRange, setSelectedVerseRange] = useState<string>('3');
  const [selectedBook, setSelectedBook] = useState('John');
  const [selectedChapter, setSelectedChapter] = useState(3);
  const [activeRecording, setActiveRecording] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: '1',
      text: 'What does it mean to be born again?',
      isBookmarked: false,
      hasAudio: true,
      isRecorded: false,
      relatedVerses: '3,5-7'
    },
    {
      id: '2',
      text: 'Why did Nicodemus come to Jesus at night?',
      isBookmarked: false,
      hasAudio: true,
      isRecorded: true,
      relatedVerses: '1-2'
    },
    {
      id: '3',
      text: 'How does the wind relate to the Spirit?',
      isBookmarked: true,
      hasAudio: true,
      isRecorded: false,
      relatedVerses: '8'
    }
  ]);

  const toggleBookmark = (id: string) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, isBookmarked: !q.isBookmarked } : q
    ));
  };

  const toggleRecording = (id: string) => {
    if (activeRecording === id) {
      // Stop recording
      setActiveRecording(null);
      setQuestions(questions.map(q => 
        q.id === id ? { ...q, isRecorded: true } : q
      ));
    } else {
      // Start recording
      setActiveRecording(id);
    }
  };

  const handleQuestionPress = (relatedVerses: string) => {
    setSelectedVerseRange(relatedVerses);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      {/* Navigation Bar */}
      <ThemedView style={styles.navigationBar}>
        <View style={styles.navigationContent}>
          <TouchableOpacity style={styles.navButton}>
            <IconSymbol name="chevron.left.forwardslash.chevron.right" size={20} color={Colors[colorScheme ?? 'light'].text} />
          </TouchableOpacity>
          
          <View style={styles.referenceContainer}>
            <TouchableOpacity style={styles.referenceButton}>
              <Text style={[styles.referenceText, { color: Colors[colorScheme ?? 'light'].text }]}>
                {selectedBook} {selectedChapter}
              </Text>
              <IconSymbol name="chevron.right" size={16} color={Colors[colorScheme ?? 'light'].tabIconDefault} />
            </TouchableOpacity>
            
            <Text style={[styles.verseSeparator, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>:</Text>
            
            <TouchableOpacity style={styles.verseSelector}>
              <Text style={[styles.verseText, { color: Colors[colorScheme ?? 'light'].tint }]}>
                {selectedVerseRange}
              </Text>
              <IconSymbol name="chevron.right" size={14} color={Colors[colorScheme ?? 'light'].tabIconDefault} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.navButton}>
            <IconSymbol name="ellipsis" size={20} color={Colors[colorScheme ?? 'light'].text} />
          </TouchableOpacity>
        </View>
      </ThemedView>

      {/* Split Layout */}
      <View style={styles.splitContainer}>
        {/* TOP PANEL - Bible Text */}
        <ThemedView style={styles.topPanel}>
          <View style={styles.topPanelHeader}>
            <ThemedText style={styles.panelTitle}>Scripture Text</ThemedText>
            <View style={styles.verseButtons}>
              {['1-2', '3', '5-7', '8'].map((range) => (
                <TouchableOpacity 
                  key={range}
                  style={[
                    styles.verseButton, 
                    { backgroundColor: selectedVerseRange === range ? Colors[colorScheme ?? 'light'].tint : Colors[colorScheme ?? 'light'].tabIconDefault }
                  ]}
                  onPress={() => setSelectedVerseRange(range)}
                >
                  <Text style={styles.verseButtonText}>{range}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <ScrollView 
            style={styles.scriptureScroll}
            showsVerticalScrollIndicator={true}
          >
            <ScriptureRenderer 
              scripture={john3Scripture}
              verseRange={selectedVerseRange}
              showVerseNumbers={true}
              style={styles.scriptureRenderer}
            />
          </ScrollView>
        </ThemedView>

        {/* BOTTOM PANEL - Questions & Recording */}
        <ThemedView style={styles.bottomPanel}>
          <View style={styles.bottomPanelHeader}>
            <ThemedText style={styles.panelTitle}>Community Questions</ThemedText>
            <Text style={[styles.questionCount, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
              {questions.filter(q => q.isRecorded).length} of {questions.length} answered
            </Text>
          </View>
          
          <ScrollView 
            style={styles.questionsScroll}
            showsVerticalScrollIndicator={true}
          >
            {questions.map((question) => (
              <TouchableOpacity 
                key={question.id} 
                style={[
                  styles.questionCard, 
                  { 
                    borderColor: activeRecording === question.id 
                      ? Colors[colorScheme ?? 'light'].tint 
                      : Colors[colorScheme ?? 'light'].tabIconDefault,
                    backgroundColor: activeRecording === question.id 
                      ? `${Colors[colorScheme ?? 'light'].tint}20` 
                      : 'rgba(0,0,0,0.02)'
                  }
                ]}
                onPress={() => handleQuestionPress(question.relatedVerses)}
              >
                <View style={styles.questionRow}>
                  <TouchableOpacity 
                    style={[
                      styles.recordButton,
                      { backgroundColor: activeRecording === question.id 
                        ? Colors[colorScheme ?? 'light'].tint 
                        : question.isRecorded 
                          ? '#4CAF50' 
                          : Colors[colorScheme ?? 'light'].tabIconDefault 
                      }
                    ]}
                    onPress={() => toggleRecording(question.id)}
                  >
                    <IconSymbol 
                      name="mic.fill" 
                      size={16} 
                      color="white"
                    />
                    {activeRecording === question.id && (
                      <View style={styles.recordingIndicator} />
                    )}
                  </TouchableOpacity>
                  
                  <View style={styles.questionContent}>
                    <Text style={[styles.questionText, { color: Colors[colorScheme ?? 'light'].text }]}>
                      {question.text}
                    </Text>
                    <View style={styles.questionMeta}>
                      <Text style={[styles.verseReference, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
                        Verses {question.relatedVerses}
                      </Text>
                      {question.isRecorded && (
                        <Text style={[styles.recordedStatus, { color: '#4CAF50' }]}>
                          • Recorded
                        </Text>
                      )}
                      {activeRecording === question.id && (
                        <Text style={[styles.recordingStatus, { color: Colors[colorScheme ?? 'light'].tint }]}>
                          • Recording...
                        </Text>
                      )}
                    </View>
                  </View>
                  
                  <TouchableOpacity 
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleBookmark(question.id);
                    }}
                    style={styles.bookmarkButton}
                  >
                    <IconSymbol 
                      name={question.isBookmarked ? "bookmark.fill" : "bookmark"}
                      size={18} 
                      color={question.isBookmarked ? Colors[colorScheme ?? 'light'].tint : Colors[colorScheme ?? 'light'].tabIconDefault}
                    />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </ThemedView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navigationBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  navigationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    padding: 8,
  },
  referenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  referenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 6,
  },
  referenceText: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  verseSeparator: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  verseSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
  },
  verseText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  splitContainer: {
    flex: 1,
  },
  topPanel: {
    flex: 1,
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  topPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  verseButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  verseButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 32,
    alignItems: 'center',
  },
  verseButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  scriptureScroll: {
    flex: 1,
  },
  scriptureRenderer: {
    padding: 8,
  },
  bottomPanel: {
    flex: 1,
    padding: 16,
  },
  bottomPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  questionCount: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  questionsScroll: {
    flex: 1,
  },
  questionCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  recordButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  recordingIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
  },
  questionContent: {
    flex: 1,
  },
  questionText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  questionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  verseReference: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  recordedStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  recordingStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookmarkButton: {
    padding: 4,
  },
}); 