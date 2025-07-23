import { ChapterRenderer, john3Scripture } from '@/components/ScriptureRenderer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const currentTime = '1:23';

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <ThemedView style={styles.header}>
          <ThemedText type="title">{john3Scripture.book} {john3Scripture.chapter}</ThemedText>
          <TouchableOpacity>
            <ThemedText style={styles.headerButton}>⌄</ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* Audio Player */}
        <ThemedView style={styles.audioPlayerContainer}>
          <TouchableOpacity onPress={togglePlayback} style={styles.playButton}>
            <View style={[styles.playButtonInner, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}>
              <Text style={styles.playButtonText}>
                {isPlaying ? '⏸' : '▶'}
              </Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
              <View style={[styles.progressFill, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]} />
            </View>
            <Text style={[styles.timeText, { color: Colors[colorScheme ?? 'light'].text }]}>
              {currentTime}
            </Text>
          </View>
        </ThemedView>

        {/* Bible Text - Scrollable with new renderer */}
        <ThemedView style={styles.bibleTextContainer}>
          <ScrollView 
            style={styles.bibleTextScroll}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            <ChapterRenderer 
              scripture={john3Scripture} 
              showVerseNumbers={true}
            />
          </ScrollView>
        </ThemedView>

        {/* Verse Range Examples */}
        <ThemedView style={styles.examplesContainer}>
          <ThemedText type="subtitle" style={styles.examplesTitle}>
            Quick Access
          </ThemedText>
          <View style={styles.verseButtons}>
            <TouchableOpacity style={[styles.verseButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}>
              <Text style={styles.verseButtonText}>Verses 1-3</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.verseButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}>
              <Text style={styles.verseButtonText}>Verse 3</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.verseButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}>
              <Text style={styles.verseButtonText}>Verses 5-8</Text>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerButton: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  audioPlayerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 15,
  },
  playButton: {
    width: 48,
    height: 48,
  },
  playButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '30%',
  },
  timeText: {
    fontSize: 14,
    minWidth: 40,
  },
  bibleTextContainer: {
    flex: 1,
    marginBottom: 20,
  },
  bibleTextScroll: {
    maxHeight: 400,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    padding: 16,
  },
  examplesContainer: {
    marginTop: 20,
  },
  examplesTitle: {
    marginBottom: 12,
  },
  verseButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  verseButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  verseButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
