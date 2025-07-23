import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

export default function NotesScreen() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <ScrollView style={styles.scrollView}>
        <ThemedView style={styles.header}>
          <ThemedText type="title">Notes</ThemedText>
        </ThemedView>
        
        <ThemedView style={styles.emptyState}>
          <IconSymbol name="note.text" size={48} color={Colors[colorScheme ?? 'light'].tabIconDefault} />
          <Text style={[styles.emptyText, { color: Colors[colorScheme ?? 'light'].text }]}>
            No notes yet
          </Text>
          <Text style={[styles.emptySubtext, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
            Your notes and annotations will appear here
          </Text>
        </ThemedView>
        
        <ThemedView style={styles.addNoteContainer}>
          <TouchableOpacity style={[styles.addNoteButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}>
            <IconSymbol name="plus" size={20} color="white" />
            <Text style={styles.addNoteText}>Add Note</Text>
          </TouchableOpacity>
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
    marginBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
  },
  addNoteContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addNoteText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 