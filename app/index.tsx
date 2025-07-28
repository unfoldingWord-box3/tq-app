import { ConnectivityIndicator } from '@/components/ui/ConnectivityIndicator';
import { IconButton } from '@/components/ui/IconButton';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { AppColors, getStateColor } from '@/constants/AppColors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { databaseService, ProjectRecord } from '@/services/databaseService';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [projectStats, setProjectStats] = useState<Record<string, {
    sessionCount: number;
    completedSessions: number;
    totalReviews: number;
    progress: number;
  }>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const [projectList, stats] = await Promise.all([
        databaseService.getProjects(),
        databaseService.getAllProjectStatistics()
      ]);
      setProjects(projectList);
      setProjectStats(stats);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/project-setup');
  };

  const handleProjectSelect = async (project: ProjectRecord) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/project-dashboard',
      params: { projectId: project.id }
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: AppColors.backgrounds.primary }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={getStateColor('active')} />
          <Text style={{ marginTop: 16, color: AppColors.text.secondary }}>Loading projects...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (projects.length === 0) {
    // First-time user experience
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: AppColors.backgrounds.primary }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <View style={{ alignItems: 'center', marginBottom: 48 }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: getStateColor('active') + '20',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 24
            }}>
              <IconSymbol name="book.fill" size={40} color={getStateColor('active')} />
            </View>
            <Text style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: AppColors.text.primary,
              textAlign: 'center',
              marginBottom: 12
            }}>
              Bible Translation QA
            </Text>
            <Text style={{
              fontSize: 16,
              color: AppColors.text.secondary,
              textAlign: 'center',
              lineHeight: 24
            }}>
              Create your first project to start community checking
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleCreateProject}
            style={{
              backgroundColor: getStateColor('active'),
              borderRadius: 16,
              paddingVertical: 16,
              paddingHorizontal: 32,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4
            }}
          >
            <IconSymbol name="plus" size={20} color="#FFFFFF" />
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#FFFFFF',
              marginLeft: 8
            }}>
              Create Project
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Projects list view
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: AppColors.backgrounds.primary }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: AppColors.borders.light
      }}>
        <TouchableOpacity 
          style={{ alignItems: 'center' }}
          onLongPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            router.push('/developer-menu');
          }}
        >
          <IconSymbol name="book.fill" size={24} color={getStateColor('active')} />
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: AppColors.text.primary,
            marginTop: 4
          }}>
            Projects
          </Text>
        </TouchableOpacity>

        <IconButton
          icon="plus"
          state="active"
          onPress={handleCreateProject}
          accessibilityLabel="Create New Project"
        />
      </View>

      {/* Connectivity Status */}
      <ConnectivityIndicator 
        showSyncButton={true} 
        style={{ margin: 20, marginBottom: 16 }} 
      />

      {/* Projects List */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        {projects.map((project, index) => {
          // Get real project statistics
          const stats = projectStats[project.id] || {
            sessionCount: 0,
            completedSessions: 0,
            totalReviews: 0,
            progress: 0
          };
          const progress = stats.progress;
          const sessionsCount = stats.sessionCount;
          
          return (
            <TouchableOpacity
              key={project.id}
              onPress={() => handleProjectSelect(project)}
              style={{
                backgroundColor: AppColors.backgrounds.secondary,
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{
                      fontSize: 20,
                      fontWeight: 'bold',
                      color: AppColors.text.primary,
                      marginRight: 12
                    }}>
                      {project.book_code}
                    </Text>
                    <View style={{
                      backgroundColor: sessionsCount === 0 
                        ? AppColors.semantic.neutral + '20' 
                        : getStateColor('active') + '20',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6
                    }}>
                      <Text style={{
                        fontSize: 12,
                        color: sessionsCount === 0 
                          ? AppColors.semantic.neutral 
                          : getStateColor('active'),
                        fontWeight: '600'
                      }}>
                        {sessionsCount === 0 ? 'No Sessions' : `${sessionsCount} ${sessionsCount === 1 ? 'Session' : 'Sessions'}`}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={{
                    fontSize: 14,
                    color: AppColors.text.secondary,
                    marginBottom: 4
                  }}>
                    Created {new Date(project.created_date).toLocaleDateString()}
                  </Text>
                  
                  <Text style={{
                    fontSize: 14,
                    color: AppColors.text.secondary
                  }}>
                    {stats.totalReviews > 0 
                      ? `${stats.totalReviews} reviews • ${stats.completedSessions}/${stats.sessionCount} completed`
                      : `Project ID: ${project.id.split('_')[1] || project.id.slice(-8)}`
                    }
                  </Text>
                </View>

                <View style={{ alignItems: 'center', marginLeft: 16 }}>
                  <ProgressRing
                    progress={progress}
                    size={48}
                    strokeWidth={4}
                    color={progress === 0 ? AppColors.semantic.neutral : getStateColor('complete')}
                  >
                    <Text style={{
                      fontSize: 12,
                      fontWeight: 'bold',
                      color: progress === 0 ? AppColors.semantic.neutral : getStateColor('complete')
                    }}>
                      {Math.round(progress * 100)}%
                    </Text>
                  </ProgressRing>
                  <Text style={{
                    fontSize: 11,
                    color: AppColors.text.secondary,
                    marginTop: 4
                  }}>
                    {progress === 0 ? 'Not Started' : 'Complete'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
} 