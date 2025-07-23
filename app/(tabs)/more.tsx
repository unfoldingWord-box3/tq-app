import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface MenuItem {
  id: string;
  title: string;
  icon: 'gear.fill' | 'book.fill' | 'arrow.down.circle.fill' | 'person.2.fill' | 'questionmark.circle.fill' | 'info.circle.fill' | 'chevron.right';
  description: string;
}

export default function MoreScreen() {
  const colorScheme = useColorScheme();

  const menuItems: MenuItem[] = [
    {
      id: '1',
      title: 'Translation Settings',
      icon: 'gear.fill',
      description: 'Configure translation preferences'
    },
    {
      id: '2',
      title: 'Bible Versions',
      icon: 'book.fill',
      description: 'Switch between different Bible versions'
    },
    {
      id: '3',
      title: 'Download Content',
      icon: 'arrow.down.circle.fill',
      description: 'Download translations for offline use'
    },
    {
      id: '4',
      title: 'Community Guidelines',
      icon: 'person.2.fill',
      description: 'Learn about community standards'
    },
    {
      id: '5',
      title: 'Help & Support',
      icon: 'questionmark.circle.fill',
      description: 'Get help and contact support'
    },
    {
      id: '6',
      title: 'About',
      icon: 'info.circle.fill',
      description: 'App information and credits'
    }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <ScrollView style={styles.scrollView}>
        <ThemedView style={styles.header}>
          <ThemedText type="title">More</ThemedText>
        </ThemedView>
        
        <ThemedView style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity key={item.id} style={[styles.menuItem, { borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
              <View style={styles.menuItemContent}>
                <IconSymbol 
                  name={item.icon} 
                  size={24} 
                  color={Colors[colorScheme ?? 'light'].tint} 
                />
                <View style={styles.menuItemText}>
                  <Text style={[styles.menuItemTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.menuItemDescription, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
                    {item.description}
                  </Text>
                </View>
                <IconSymbol 
                  name="chevron.right" 
                  size={16} 
                  color={Colors[colorScheme ?? 'light'].tabIconDefault} 
                />
              </View>
            </TouchableOpacity>
          ))}
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
    marginBottom: 20,
  },
  menuContainer: {
    marginBottom: 20,
  },
  menuItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
}); 