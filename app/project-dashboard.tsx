import { ConnectivityIndicator } from '@/components/ui/ConnectivityIndicator';
import { IconButton } from '@/components/ui/IconButton';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { AppColors, getStateColor } from '@/constants/AppColors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { databaseService, ProjectRecord, SessionRecord } from '@/services/databaseService';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProjectDashboard() {
  const colorScheme = useColorScheme();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  // Refresh data when screen comes into focus (when user returns from session)
  useFocusEffect(
    useCallback(() => {
      if (projectId) {
        loadProjectData();
      }
    }, [projectId])
  );

  const loadProjectData = async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      
      // Load project details and sessions in parallel
      const [projectList, sessionList] = await Promise.all([
        databaseService.getProjects(),
        databaseService.getSessionsForProject(projectId)
      ]);

      const currentProject = projectList.find(p => p.id === projectId);
      setProject(currentProject || null);
      setSessions(sessionList);
      
      // Debug: Log session data to see what's in the database
      console.log('📊 Loaded sessions from database:', sessionList.map(s => ({
        id: s.id,
        status: s.status,
        session_data: s.session_data,
        start_time: s.start_time
      })));
    } catch (error) {
      console.error('Failed to load project data:', error);
      Alert.alert('Error', 'Failed to load project data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleNewSession = async () => {
    if (!project) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Generate session ID
      const sessionId = `session_${Date.now()}`;
      
      // Create new session
      await databaseService.createSession(sessionId, project.id, `${project.book_code} 1:1`);
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Navigate to community checking for this session
      router.push({
        pathname: '/community-session',
        params: { 
          sessionId,
          projectId: project.id,
          bookCode: project.book_code
        }
      });
    } catch (error) {
      console.error('Failed to create session:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to create session');
    }
  };

  const handleSessionSelect = async (session: SessionRecord) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (session.status === 'completed') {
      // Navigate to session review
      router.push({
        pathname: '/session-review',
        params: { 
          sessionId: session.id,
          projectId: session.project_id 
        }
      });
    } else {
      // Continue session in community checking (whether active or paused)
      // The session will resume in its last state
      router.push({
        pathname: '/community-session',
        params: { 
          sessionId: session.id,
          projectId: session.project_id,
          bookCode: project?.book_code || '',
          resumeSession: 'true' // Flag to indicate we're resuming an existing session
        }
      });
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: AppColors.backgrounds.primary }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={getStateColor('active')} />
          <Text style={{ marginTop: 16, color: AppColors.text.secondary }}>Loading project...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!project) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: AppColors.backgrounds.primary }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: AppColors.text.secondary }}>Project not found</Text>
        </View>
      </SafeAreaView>
    );
  }

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
                onPress={handleBack} 
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: 'white',
                  borderWidth: 1,
                  borderColor: 'rgba(0, 0, 0, 0.1)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2
                }}
              >
                               <IconSymbol name="chevron.left" size={20} color="rgba(0, 0, 0, 0.6)" />
              </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <Text style={{
            fontSize: 24,
            fontWeight: 'bold',
            color: AppColors.text.primary
          }}>
            {project.book_code}
          </Text>
          <Text style={{
            fontSize: 14,
            color: AppColors.text.secondary
          }}>
            Project
          </Text>
        </View>

        <IconButton
          icon="plus"
          state="active"
          onPress={handleNewSession}
          accessibilityLabel="New Session"
        />
      </View>

      {/* Project Stats */}
      <View style={{
        backgroundColor: AppColors.backgrounds.secondary,
        margin: 20,
        borderRadius: 16,
        padding: 20
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: AppColors.text.primary,
              marginBottom: 8
            }}>
              Project Overview
            </Text>
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
              {sessions.length} {sessions.length === 1 ? 'Session' : 'Sessions'}
            </Text>
          </View>

          <View style={{ alignItems: 'center' }}>
            <ProgressRing
              progress={sessions.length > 0 ? sessions.filter(s => s.status === 'completed').length / sessions.length : 0}
              size={56}
              strokeWidth={4}
              color={getStateColor('complete')}
            >
              <Text style={{
                fontSize: 14,
                fontWeight: 'bold',
                color: getStateColor('complete')
              }}>
                {sessions.length > 0 ? Math.round((sessions.filter(s => s.status === 'completed').length / sessions.length) * 100) : 0}%
              </Text>
            </ProgressRing>
            <Text style={{
              fontSize: 12,
              color: AppColors.text.secondary,
              marginTop: 4
            }}>
              Complete
            </Text>
          </View>
        </View>
      </View>

      {/* Connectivity Status */}
      <ConnectivityIndicator 
        showSyncButton={true} 
        style={{ marginHorizontal: 20, marginBottom: 16 }} 
      />

      {/* Sessions List */}
      <View style={{ flex: 1 }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 16
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: AppColors.text.primary
          }}>
            Sessions
          </Text>
          <IconSymbol name="person.2.fill" size={20} color={getStateColor('active')} />
        </View>

        {sessions.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
            <IconSymbol name="person.2.fill" size={48} color={AppColors.text.secondary} />
            <Text style={{
              fontSize: 16,
              color: AppColors.text.secondary,
              textAlign: 'center',
              marginTop: 16
            }}>
              No sessions yet
            </Text>
            <Text style={{
              fontSize: 14,
              color: AppColors.text.secondary,
              textAlign: 'center',
              marginTop: 8
            }}>
              Tap + to start your first community checking session
            </Text>
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
            {sessions.map((session) => {
              const isCompleted = session.status === 'completed';
              const isPaused = session.status === 'paused';
              const isActive = session.status === 'active';
              const sessionDate = new Date(session.start_time);
              
              const getStatusColor = () => {
                if (isCompleted) return getStateColor('complete');
                if (isPaused) return '#FF9800'; // Orange for paused
                return getStateColor('active'); // Blue for active
              };
              
              const getStatusText = () => {
                if (isCompleted) return 'COMPLETED';
                if (isPaused) return 'PAUSED';
                return 'IN PROGRESS';
              };

              // Get session duration from session_data
              const getSessionDuration = () => {
                try {
                  if (session.session_data) {
                    const data = JSON.parse(session.session_data);
                    const duration = data.totalDuration || 0;
                    console.log(`📊 Session ${session.id} duration data:`, { 
                      session_data: session.session_data, 
                      parsed_data: data, 
                      duration 
                    });
                    if (duration > 0) {
                      const hours = Math.floor(duration / 3600);
                      const minutes = Math.floor((duration % 3600) / 60);
                      if (hours > 0) {
                        return `${hours}h ${minutes}m`;
                      } else if (minutes > 0) {
                        return `${minutes}m`;
                      } else {
                        return `${duration}s`;
                      }
                    }
                  } else {
                    console.log(`📊 Session ${session.id} has no session_data`);
                  }
                } catch (e) {
                  console.warn('Failed to parse session data for duration:', e);
                }
                return null;
              };

              const sessionDuration = getSessionDuration();
              
              return (
                <TouchableOpacity
                  key={session.id}
                  onPress={() => handleSessionSelect(session)}
                  style={{
                    backgroundColor: AppColors.backgrounds.secondary,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                    borderLeftWidth: 4,
                    borderLeftColor: getStatusColor()
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{
                          fontSize: 16,
                          fontWeight: '600',
                          color: AppColors.text.primary,
                          marginRight: 8
                        }}>
                          {sessionDate.toLocaleDateString()}
                        </Text>
                        <View style={{
                          backgroundColor: getStatusColor() + '20',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4
                        }}>
                          <Text style={{
                            fontSize: 10,
                            color: getStatusColor(),
                            fontWeight: '600'
                          }}>
                            {getStatusText()}
                          </Text>
                        </View>
                      </View>
                      
                      <Text style={{
                        fontSize: 14,
                        color: AppColors.text.secondary
                      }}>
                        {sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {sessionDuration && ` • ${sessionDuration}`}
                      </Text>
                    </View>

                    <IconSymbol 
                      name={isCompleted ? "bookmark.fill" : isPaused ? "ellipsis" : "chevron.right"} 
                      size={24} 
                      color={getStatusColor()} 
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
} 