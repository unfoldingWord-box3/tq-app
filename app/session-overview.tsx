import { IconButton } from '@/components/ui/IconButton';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { AppColors, getStateColor } from '@/constants/AppColors';
import { databaseService } from '@/services/databaseService';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SessionOverviewData {
  sessionId: string;
  projectName: string;
  bookCode: string;
  totalQuestions: number;
  answeredQuestions: number;
  clearAnswers: number;
  unclearAnswers: number;
  sessionDuration: number;
  comprehensionScore: number;
  textClarityAssessment: 'Excellent' | 'Good' | 'Needs Improvement' | 'Poor';
}

export default function SessionOverview() {
  const { sessionId, projectId } = useLocalSearchParams<{
    sessionId: string;
    projectId: string;
  }>();

  const [overviewData, setOverviewData] = useState<SessionOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOverviewData();
  }, [sessionId, projectId]);

  const loadOverviewData = async () => {
    if (!sessionId || !projectId) return;

    try {
      setIsLoading(true);

      // Load project data
      const project = await databaseService.getProject(projectId);
      if (!project) {
        Alert.alert('Error', 'Project not found');
        router.back();
        return;
      }

      // Load session data
      const sessions = await databaseService.getSessionsForProject(projectId);
      const session = sessions.find(s => s.id === sessionId);
      if (!session) {
        Alert.alert('Error', 'Session not found');
        router.back();
        return;
      }

      // Load recordings and reviews
      const recordings = await databaseService.getRecordingsForSession(sessionId);
      const reviews = await databaseService.getReviewsForSession(sessionId);

      // Calculate statistics
      const totalQuestions = recordings.length;
      const answeredQuestions = recordings.length;
      const clearAnswers = reviews.filter(r => r.understanding === 'clear').length;
      const unclearAnswers = reviews.filter(r => r.understanding === 'unclear').length;
      
      const comprehensionScore = totalQuestions > 0 ? Math.round((clearAnswers / totalQuestions) * 100) : 0;
      
      // Determine text clarity assessment
      let textClarityAssessment: 'Excellent' | 'Good' | 'Needs Improvement' | 'Poor';
      if (comprehensionScore >= 90) textClarityAssessment = 'Excellent';
      else if (comprehensionScore >= 75) textClarityAssessment = 'Good';
      else if (comprehensionScore >= 50) textClarityAssessment = 'Needs Improvement';
      else textClarityAssessment = 'Poor';

      // Parse session duration
      const sessionData = session.session_data ? JSON.parse(session.session_data) : {};
      const sessionDuration = sessionData.totalDuration || 0;

      setOverviewData({
        sessionId,
        projectName: project.name,
        bookCode: project.book_code,
        totalQuestions,
        answeredQuestions,
        clearAnswers,
        unclearAnswers,
        sessionDuration,
        comprehensionScore,
        textClarityAssessment
      });

    } catch (error) {
      console.error('Failed to load overview data:', error);
      Alert.alert('Error', 'Failed to load session overview');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return getStateColor('complete');
    else if (score >= 75) return getStateColor('active');
    else if (score >= 50) return '#FFA500';
    else return getStateColor('recording');
  };

  const handleFinish = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Navigate back to project dashboard
    router.push(`/project-dashboard?projectId=${projectId}`);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: AppColors.backgrounds.primary, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: AppColors.text.primary }}>Loading overview...</Text>
      </SafeAreaView>
    );
  }

  if (!overviewData) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: AppColors.backgrounds.primary, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: AppColors.text.primary }}>No data available.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20, padding: 10 }}>
          <Text style={{ color: getStateColor('active') }}>Go Back</Text>
        </TouchableOpacity>
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
        borderBottomColor: AppColors.borders.subtle
      }}>
        <IconButton
          icon="chevron.left"
          state="active"
          onPress={() => router.back()}
          accessibilityLabel="Back"
        />

        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: AppColors.text.primary }}>
            Session Complete
          </Text>
          <Text style={{ fontSize: 14, color: AppColors.text.secondary }}>
            {overviewData.projectName}
          </Text>
        </View>

        <IconButton
          icon="checkmark.circle.fill"
          state="complete"
          onPress={handleFinish}
          accessibilityLabel="Finish"
        />
      </View>

      {/* Content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {/* Comprehension Score */}
        <View style={{
          backgroundColor: AppColors.backgrounds.secondary,
          borderRadius: 16,
          padding: 24,
          marginBottom: 20,
          alignItems: 'center'
        }}>
          <ProgressRing 
            progress={overviewData.comprehensionScore / 100} 
            size={120} 
            strokeWidth={8}
            color={getScoreColor(overviewData.comprehensionScore)}
          >
            <Text style={{ fontSize: 32, fontWeight: 'bold', color: getScoreColor(overviewData.comprehensionScore) }}>
              {overviewData.comprehensionScore}%
            </Text>
          </ProgressRing>
          <Text style={{ fontSize: 18, fontWeight: '600', color: AppColors.text.primary, marginTop: 16 }}>
            Comprehension Score
          </Text>
          <Text style={{ fontSize: 14, color: AppColors.text.secondary, textAlign: 'center', marginTop: 4 }}>
            Based on {overviewData.totalQuestions} questions
          </Text>
        </View>

        {/* Text Clarity Assessment */}
        <View style={{
          backgroundColor: AppColors.backgrounds.secondary,
          borderRadius: 12,
          padding: 16,
          marginBottom: 20
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <IconSymbol name="doc.text.fill" size={20} color={getScoreColor(overviewData.comprehensionScore)} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: AppColors.text.primary, marginLeft: 8 }}>
              Text Clarity Assessment
            </Text>
          </View>
          <Text style={{ 
            fontSize: 18, 
            fontWeight: 'bold', 
            color: getScoreColor(overviewData.comprehensionScore),
            marginBottom: 8
          }}>
            {overviewData.textClarityAssessment}
          </Text>
          <Text style={{ fontSize: 14, color: AppColors.text.secondary, lineHeight: 20 }}>
            {overviewData.textClarityAssessment === 'Excellent' && 
              'The translation is very clear and easy to understand. Community members demonstrated excellent comprehension.'}
            {overviewData.textClarityAssessment === 'Good' && 
              'The translation is generally clear with good comprehension. Minor areas might benefit from review.'}
            {overviewData.textClarityAssessment === 'Needs Improvement' && 
              'The translation has some unclear areas that may need revision to improve comprehension.'}
            {overviewData.textClarityAssessment === 'Poor' && 
              'The translation needs significant revision to improve clarity and comprehension.'}
          </Text>
        </View>

        {/* Statistics */}
        <View style={{
          backgroundColor: AppColors.backgrounds.secondary,
          borderRadius: 12,
          padding: 16,
          marginBottom: 20
        }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: AppColors.text.primary, marginBottom: 16 }}>
            Session Statistics
          </Text>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: AppColors.text.secondary }}>Total Questions:</Text>
            <Text style={{ color: AppColors.text.primary, fontWeight: '600' }}>{overviewData.totalQuestions}</Text>
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: AppColors.text.secondary }}>Answered Questions:</Text>
            <Text style={{ color: AppColors.text.primary, fontWeight: '600' }}>{overviewData.answeredQuestions}</Text>
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: AppColors.text.secondary }}>Clear Answers:</Text>
            <Text style={{ color: getStateColor('complete'), fontWeight: '600' }}>{overviewData.clearAnswers}</Text>
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: AppColors.text.secondary }}>Unclear Answers:</Text>
            <Text style={{ color: getStateColor('recording'), fontWeight: '600' }}>{overviewData.unclearAnswers}</Text>
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: AppColors.text.secondary }}>Session Duration:</Text>
            <Text style={{ color: AppColors.text.primary, fontWeight: '600' }}>{formatDuration(overviewData.sessionDuration)}</Text>
          </View>
        </View>

        {/* Recommendations */}
        <View style={{
          backgroundColor: AppColors.backgrounds.secondary,
          borderRadius: 12,
          padding: 16,
          marginBottom: 40
        }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: AppColors.text.primary, marginBottom: 12 }}>
            Recommendations
          </Text>
          
          {overviewData.comprehensionScore >= 90 ? (
            <Text style={{ color: AppColors.text.secondary, lineHeight: 20 }}>
              • The translation shows excellent clarity{'\n'}
              • Consider this text ready for community use{'\n'}
              • Share results with the translation team
            </Text>
          ) : overviewData.comprehensionScore >= 75 ? (
            <Text style={{ color: AppColors.text.secondary, lineHeight: 20 }}>
              • The translation is generally good{'\n'}
              • Review questions with unclear answers{'\n'}
              • Consider minor revisions if needed
            </Text>
          ) : overviewData.comprehensionScore >= 50 ? (
            <Text style={{ color: AppColors.text.secondary, lineHeight: 20 }}>
              • The translation needs some improvement{'\n'}
              • Focus on areas where answers were unclear{'\n'}
              • Consider additional community testing
            </Text>
          ) : (
            <Text style={{ color: AppColors.text.secondary, lineHeight: 20 }}>
              • The translation needs significant revision{'\n'}
              • Review and revise unclear sections{'\n'}
              • Conduct additional testing after revisions
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 