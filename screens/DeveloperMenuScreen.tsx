import { IconButton } from '@/components/ui/IconButton';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { AppColors, getStateColor } from '@/constants/AppColors';
import { databaseService } from '@/services/databaseService';
import { resourceCacheService } from '@/services/resourceCacheService';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface DatabaseStats {
  projects: number;
  sessions: number;
  resources: number;
  reviews: number;
  recordings: number;
  syncQueue: number;
}

export default function DeveloperMenuScreen() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const dbStats = await databaseService.getDatabaseStats();
      setStats(dbStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmAction = (title: string, message: string, action: () => Promise<void>) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            try {
              await action();
              await loadStats();
              Alert.alert('Success', 'Operation completed successfully');
            } catch (error) {
              Alert.alert('Error', `Failed to complete operation: ${error}`);
            }
          }
        }
      ]
    );
  };

  const handleDeleteAllProjects = () => {
    confirmAction(
      'Delete All Projects',
      'This will delete all projects, sessions, reviews, and recordings. This cannot be undone.',
      () => databaseService.deleteAllProjects()
    );
  };

  const handleDeleteAllSessions = () => {
    confirmAction(
      'Delete All Sessions',
      'This will delete all sessions, reviews, and recordings. Projects will remain.',
      () => databaseService.deleteAllSessions()
    );
  };

  const handleDeleteAllResources = () => {
    confirmAction(
      'Delete All Resources',
      'This will delete all cached resources from the database only. Downloaded files will remain.',
      () => databaseService.deleteAllResources()
    );
  };

  const handleClearFileCache = () => {
    confirmAction(
      'Clear File Cache',
      'This will delete all downloaded and extracted resource files. Database records will remain.',
      () => resourceCacheService.clearCache()
    );
  };

  const handleResetDatabase = () => {
    confirmAction(
      'Reset Database',
      '⚠️ NUCLEAR OPTION: This will delete ALL data from the database. This cannot be undone!',
      () => databaseService.resetDatabase()
    );
  };

  const handleClearSyncQueue = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await databaseService.clearSyncQueue();
      await loadStats();
      Alert.alert('Success', 'Sync queue cleared');
    } catch (error) {
      Alert.alert('Error', `Failed to clear sync queue: ${error}`);
    }
  };

  const StatItem = ({ 
    label, 
    value, 
    color = AppColors.text.primary 
  }: { 
    label: string; 
    value: number; 
    color?: string; 
  }) => (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: AppColors.borders.light
    }}>
      <Text style={{ fontSize: 16, color: AppColors.text.primary }}>{label}</Text>
      <Text style={{ fontSize: 16, fontWeight: 'bold', color }}>{value}</Text>
    </View>
  );

  const ActionButton = ({ 
    title, 
    onPress, 
    color = getStateColor('active'), 
    icon = 'trash' 
  }: { 
    title: string; 
    onPress: () => void; 
    color?: string; 
    icon?: any; 
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: AppColors.backgrounds.secondary,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: color,
        flexDirection: 'row',
        alignItems: 'center'
      }}
    >
      <IconSymbol name={icon} size={20} color={color} />
      <Text style={{
        fontSize: 16,
        fontWeight: '600',
        color: AppColors.text.primary,
        marginLeft: 12,
        flex: 1
      }}>
        {title}
      </Text>
      <IconSymbol name="chevron.right" size={16} color={AppColors.text.secondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: AppColors.backgrounds.primary }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: AppColors.borders.light
      }}>
                 <IconButton
           icon="chevron.right"
           state="active"
           onPress={() => router.back()}
           accessibilityLabel="Go Back"
         />
        <View style={{ flex: 1, alignItems: 'center', marginLeft: -44 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: AppColors.text.primary
          }}>
            Developer Menu
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        <View style={{
          backgroundColor: AppColors.semantic.warning + '20',
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          borderLeftWidth: 4,
          borderLeftColor: AppColors.semantic.warning
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <IconSymbol name="bookmark" size={20} color={AppColors.semantic.warning} />
            <Text style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: AppColors.semantic.warning,
              marginLeft: 8
            }}>
              Developer Tools
            </Text>
          </View>
          <Text style={{
            fontSize: 14,
            color: AppColors.text.primary,
            lineHeight: 20
          }}>
            These tools are for debugging and testing. Use with caution as some actions cannot be undone.
          </Text>
        </View>

        <View style={{
          backgroundColor: AppColors.backgrounds.secondary,
          borderRadius: 12,
          padding: 16,
          marginBottom: 24
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <IconSymbol name="note.text" size={20} color={getStateColor('active')} />
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: AppColors.text.primary,
              marginLeft: 8
            }}>
              Database Statistics
            </Text>
          </View>

          {isLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <ActivityIndicator size="small" color={getStateColor('active')} />
            </View>
          ) : stats ? (
            <>
              <StatItem label="Projects" value={stats.projects} />
              <StatItem label="Sessions" value={stats.sessions} />
              <StatItem label="Resources" value={stats.resources} />
              <StatItem label="Reviews" value={stats.reviews} />
              <StatItem label="Recordings" value={stats.recordings} />
              <StatItem label="Sync Queue" value={stats.syncQueue} />
            </>
          ) : (
            <Text style={{ color: AppColors.text.secondary, textAlign: 'center' }}>
              Failed to load statistics
            </Text>
          )}
        </View>

        <View style={{
          backgroundColor: AppColors.backgrounds.secondary,
          borderRadius: 12,
          padding: 16,
          marginBottom: 24
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <IconSymbol name="ellipsis" size={20} color={AppColors.semantic.error} />
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: AppColors.text.primary,
              marginLeft: 8
            }}>
              Cleanup Actions
            </Text>
          </View>

                     <ActionButton
             title="Clear Sync Queue"
             onPress={handleClearSyncQueue}
             color={getStateColor('active')}
             icon="chevron.right"
           />

                     <ActionButton
             title="Delete All Sessions"
             onPress={handleDeleteAllSessions}
             color={AppColors.semantic.warning}
             icon="ellipsis"
           />

           <ActionButton
             title="Delete All Resources (DB)"
             onPress={handleDeleteAllResources}
             color={AppColors.semantic.warning}
             icon="ellipsis"
           />

           <ActionButton
             title="Clear File Cache"
             onPress={handleClearFileCache}
             color={AppColors.semantic.warning}
             icon="book.fill"
           />

           <ActionButton
             title="Delete All Projects"
             onPress={handleDeleteAllProjects}
             color={AppColors.semantic.error}
             icon="ellipsis"
           />

           <ActionButton
             title="🔥 Reset Database (Nuclear)"
             onPress={handleResetDatabase}
             color={AppColors.semantic.error}
             icon="questionmark.circle.fill"
           />
        </View>

        <TouchableOpacity
          onPress={loadStats}
          style={{
            backgroundColor: getStateColor('active'),
            borderRadius: 12,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <IconSymbol name="chevron.right" size={20} color="#FFFFFF" />
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: '#FFFFFF',
            marginLeft: 8
          }}>
            Refresh Statistics
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}