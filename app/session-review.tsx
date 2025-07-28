import { IconButton } from '@/components/ui/IconButton';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { AppColors, getStateColor } from '@/constants/AppColors';
import { databaseService } from '@/services/databaseService';
import { getQuestionsForReference } from '@/services/translationQuestionsService';
import { TranslationQuestion } from '@/types/translationQuestions';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ReviewAnswer {
  questionId: string;
  understanding: 'clear' | 'unclear' | 'unreviewed';
}

interface QuestionWithRecording extends TranslationQuestion {
  recording?: {
    id: string;
    filePath: string;
    duration: number;
  };
}

export default function SessionReview() {
  const { sessionId, projectId } = useLocalSearchParams<{ 
    sessionId: string;
    projectId: string;
  }>();
  
  const [questions, setQuestions] = useState<QuestionWithRecording[]>([]);
  const [answers, setAnswers] = useState<ReviewAnswer[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentRecordingPath, setCurrentRecordingPath] = useState<string | null>(null);
  const [project, setProject] = useState<any>(null);

  // Audio player hook - must be at component level
  const audioPlayer = useAudioPlayer(currentRecordingPath || '');

  // Load session data, questions, and recordings
  useEffect(() => {
    loadSessionData();
  }, [sessionId, projectId]);

  // Set up audio player event listener
  useEffect(() => {
    if (!currentRecordingPath || !audioPlayer) return;

    const subscription = audioPlayer.addListener('playbackStatusUpdate', (status) => {
      if (status.isLoaded && status.didJustFinish) {
        setIsPlaying(false);
        setCurrentRecordingPath(null);
      }
    });

    return () => subscription?.remove();
  }, [audioPlayer, currentRecordingPath]);

  const loadSessionData = async () => {
    if (!sessionId || !projectId) return;

    try {
      setIsLoading(true);

      // Load project to get book code
      const projectData = await databaseService.getProject(projectId);
      if (!projectData) {
        Alert.alert('Error', 'Project not found');
        router.back();
        return;
      }
      setProject(projectData);

      // Load session to get current reference
      const sessions = await databaseService.getSessionsForProject(projectId);
      const session = sessions.find(s => s.id === sessionId);
      if (!session) {
        Alert.alert('Error', 'Session not found');
        router.back();
        return;
      }

      // Load translation questions for the book
      const translationQuestionsModule = await import('@/services/translationQuestionsService');
      const questionsData = await translationQuestionsModule.fetchTranslationQuestions(projectData.book_code);
      
      if (!questionsData) {
        Alert.alert('Error', 'Translation questions not found');
        router.back();
        return;
      }

      // Get questions for current reference (assuming TIT 1:1-2 for now, should be from session)
      const currentReference = session.current_reference || `${projectData.book_code} 1:1-2`;
      const sessionQuestions = getQuestionsForReference(questionsData, currentReference);

      // Load recordings for this session
      const recordings = await databaseService.getRecordingsForSession(sessionId);
      
      // Match questions with recordings
      const questionsWithRecordings: QuestionWithRecording[] = sessionQuestions.map(question => {
        const recording = recordings.find(r => r.question_id === question.id);
        return {
          ...question,
          recording: recording ? {
            id: recording.id,
            filePath: recording.audio_file_path,
            duration: recording.duration || 0
          } : undefined
        };
      });

      setQuestions(questionsWithRecordings);
      setAnswers(questionsWithRecordings.map(q => ({ 
        questionId: q.id, 
        understanding: 'unreviewed' 
      })));

    } catch (error) {
      console.error('Failed to load session data:', error);
      Alert.alert('Error', 'Failed to load session data');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  // Audio playback functions
  const playRecording = async (filePath: string) => {
    try {
      console.log('🎵 Starting playback:', filePath);
      
      // Stop any existing playback
      if (isPlaying) {
        stopPlayback();
        return;
      }

      setCurrentRecordingPath(filePath);
      setIsPlaying(true);
      audioPlayer.play();
      
    } catch (error) {
      console.error('Failed to play recording:', error);
      Alert.alert('Error', 'Failed to play recording');
      setIsPlaying(false);
      setCurrentRecordingPath(null);
    }
  };

  const stopPlayback = () => {
    try {
      if (audioPlayer && isPlaying) {
        audioPlayer.pause();
        setIsPlaying(false);
        setCurrentRecordingPath(null);
      }
    } catch (error) {
      console.error('Failed to stop playback:', error);
    }
  };

  const handleUnderstandingSelect = async (understanding: 'clear' | 'unclear') => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const updatedAnswers = [...answers];
    updatedAnswers[currentIndex].understanding = understanding;
    setAnswers(updatedAnswers);

    try {
      await databaseService.addReview(
        `review_${Date.now()}`,
        sessionId,
        answers[currentIndex].questionId,
        understanding,
        ''
      );
    } catch (error) {
      console.error('Failed to save review:', error);
    }
  };

  const handleNext = () => {
    if (currentIndex < answers.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleComplete = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Navigate to overview stage
    router.push({
      pathname: '/session-overview',
      params: {
        sessionId,
        projectId
      }
    });
  };

  // Show loading state
  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: AppColors.backgrounds.primary, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: AppColors.text.primary }}>Loading session data...</Text>
      </SafeAreaView>
    );
  }

  // Show error if no questions
  if (questions.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: AppColors.backgrounds.primary, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: AppColors.text.primary }}>No questions found for this session.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20, padding: 10 }}>
          <Text style={{ color: getStateColor('active') }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentIndex];
  const progress = (currentIndex + 1) / answers.length;
  const reviewedCount = answers.filter(a => a.understanding !== 'unreviewed').length;

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
        <IconButton
          icon="chevron.left"
          state="active"
          onPress={() => router.back()}
          accessibilityLabel="Back"
        />

        <View style={{ alignItems: 'center' }}>
          <ProgressRing 
            progress={progress} 
            size={32} 
            strokeWidth={3}
            color={getStateColor('active')}
          >
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: getStateColor('active') }}>
              {currentIndex + 1}/{answers.length}
            </Text>
          </ProgressRing>
          <Text style={{ fontSize: 14, color: AppColors.text.secondary, marginTop: 4 }}>
            Review
          </Text>
        </View>

        <IconButton
          icon="bookmark.fill"
          state={reviewedCount === answers.length ? 'complete' : 'inactive'}
          onPress={handleComplete}
          disabled={reviewedCount !== answers.length}
          accessibilityLabel="Complete Review"
        />
      </View>

      {/* Content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {/* Question */}
        <View style={{
          backgroundColor: AppColors.backgrounds.secondary,
          borderRadius: 12,
          padding: 16,
          marginBottom: 20
        }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: AppColors.text.primary, marginBottom: 8 }}>
            Question {currentIndex + 1}
          </Text>
          <Text style={{ fontSize: 15, color: AppColors.text.primary, lineHeight: 22 }}>
            {currentQuestion.question}
          </Text>
        </View>

        {/* Audio Recording */}
        {currentQuestion.recording ? (
          <View style={{
            backgroundColor: getStateColor('active') + '10',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderLeftWidth: 4,
            borderLeftColor: getStateColor('active')
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="volume-medium" size={16} color={getStateColor('active')} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: getStateColor('active'), marginLeft: 6 }}>
                  Community Answer Recording
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: AppColors.text.secondary }}>
                {Math.floor(currentQuestion.recording.duration / 60)}:{(currentQuestion.recording.duration % 60).toString().padStart(2, '0')}
              </Text>
            </View>
            
            <TouchableOpacity
              onPress={() => playRecording(currentQuestion.recording!.filePath)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isPlaying && currentRecordingPath === currentQuestion.recording!.filePath ? '#FF4444' : getStateColor('active'),
                borderRadius: 8,
                padding: 12
              }}
            >
              <Ionicons 
                name={isPlaying && currentRecordingPath === currentQuestion.recording!.filePath ? 'stop' : 'play'} 
                size={16} 
                color="white" 
                style={{ marginRight: 8 }}
              />
              <Text style={{ color: 'white', fontWeight: '600' }}>
                {isPlaying && currentRecordingPath === currentQuestion.recording!.filePath ? 'Stop' : 'Play Recording'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{
            backgroundColor: AppColors.backgrounds.secondary,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderLeftWidth: 4,
            borderLeftColor: AppColors.borders.light
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="alert-circle-outline" size={16} color={AppColors.text.secondary} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: AppColors.text.secondary, marginLeft: 6 }}>
                No Recording Available
              </Text>
            </View>
            <Text style={{ fontSize: 15, color: AppColors.text.secondary, lineHeight: 22 }}>
              This question was not answered during the session.
            </Text>
          </View>
        )}

        {/* Expected Answer Reference */}
        {currentQuestion.response && (
          <View style={{
            backgroundColor: getStateColor('complete') + '10',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            borderLeftWidth: 4,
            borderLeftColor: getStateColor('complete')
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="checkmark-circle" size={16} color={getStateColor('complete')} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: getStateColor('complete'), marginLeft: 6 }}>
                Expected Answer
              </Text>
            </View>
            <Text style={{ fontSize: 15, color: AppColors.text.primary, lineHeight: 22 }}>
              {currentQuestion.response}
            </Text>
          </View>
        )}

        {/* Understanding Assessment */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: AppColors.text.primary, marginBottom: 16, textAlign: 'center' }}>
            Translation Understanding
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity
              onPress={() => handleUnderstandingSelect('clear')}
              style={{
                flex: 1,
                backgroundColor: currentAnswer.understanding === 'clear' ? getStateColor('complete') : AppColors.backgrounds.secondary,
                borderRadius: 12,
                padding: 16,
                marginRight: 8,
                alignItems: 'center',
                borderWidth: 2,
                borderColor: currentAnswer.understanding === 'clear' ? getStateColor('complete') : AppColors.borders.light
              }}
            >
              <Ionicons name="checkmark-circle" size={24} color={currentAnswer.understanding === 'clear' ? '#FFFFFF' : getStateColor('complete')} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: currentAnswer.understanding === 'clear' ? '#FFFFFF' : AppColors.text.primary, marginTop: 8 }}>
                Clear
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleUnderstandingSelect('unclear')}
              style={{
                flex: 1,
                backgroundColor: currentAnswer.understanding === 'unclear' ? getStateColor('recording') : AppColors.backgrounds.secondary,
                borderRadius: 12,
                padding: 16,
                marginLeft: 8,
                alignItems: 'center',
                borderWidth: 2,
                borderColor: currentAnswer.understanding === 'unclear' ? getStateColor('recording') : AppColors.borders.light
              }}
            >
              <Ionicons name="help-circle" size={24} color={currentAnswer.understanding === 'unclear' ? '#FFFFFF' : getStateColor('recording')} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: currentAnswer.understanding === 'unclear' ? '#FFFFFF' : AppColors.text.primary, marginTop: 8 }}>
                Unclear
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Navigation */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: AppColors.borders.light
      }}>
        <IconButton
          icon="chevron.left"
          state={currentIndex > 0 ? 'active' : 'inactive'}
          onPress={handlePrevious}
          disabled={currentIndex === 0}
          accessibilityLabel="Previous"
        />

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {answers.map((answer, index) => (
            <View
              key={index}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: index === currentIndex 
                  ? getStateColor('active')
                  : answer.understanding === 'unreviewed'
                  ? getStateColor('inactive')
                  : answer.understanding === 'clear'
                  ? getStateColor('complete')
                  : getStateColor('recording'),
                marginHorizontal: 2
              }}
            />
          ))}
        </View>

        <IconButton
          icon="chevron.right"
          state={currentIndex < answers.length - 1 ? 'active' : 'inactive'}
          onPress={handleNext}
          disabled={currentIndex === answers.length - 1}
          accessibilityLabel="Next"
        />
      </View>
    </SafeAreaView>
  );
} 