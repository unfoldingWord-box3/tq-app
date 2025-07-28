import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { QuestionRecording, useQuestionRecording } from '@/hooks/useQuestionRecording';
import { databaseService } from '@/services/databaseService';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';

interface QuestionRecordingButtonProps {
  sessionId: string;
  questionId: string;
  questionReference: string;
  isSessionActive: boolean;
  onRecordingStateChange?: (questionId: string, hasRecording: boolean, isRecording: boolean) => void;
  size?: 'small' | 'medium' | 'large';
}

export function QuestionRecordingButton({
  sessionId,
  questionId,
  questionReference,
  isSessionActive,
  onRecordingStateChange,
  size = 'medium'
}: QuestionRecordingButtonProps) {
  const colorScheme = useColorScheme();
  
  // Long press state
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [longPressStarted, setLongPressStarted] = useState(false);

  const {
    hasPermission,
    isRecording,
    isPlaying,
    recordingDuration,
    existingRecording,
    hasRecording,
    startRecording,
    stopRecording,
    playRecording,
    stopPlayback,
    deleteRecording,
    reRecord,
    loadExistingRecording,
    formatDuration
  } = useQuestionRecording({
    sessionId,
    questionId,
    onRecordingComplete: handleRecordingComplete,
    onRecordingDeleted: handleRecordingDeleted
  });

  // Load existing recording on mount
  useEffect(() => {
    loadExistingRecordingFromDatabase();
  }, [loadExistingRecordingFromDatabase]);

  // Notify parent of recording state changes
  useEffect(() => {
    onRecordingStateChange?.(questionId, hasRecording, isRecording);
  }, [questionId, hasRecording, isRecording, onRecordingStateChange]);

  const loadExistingRecordingFromDatabase = useCallback(async () => {
    try {
      const dbRecording = await databaseService.getRecordingForQuestion(sessionId, questionId);
      if (dbRecording) {
        const recording: QuestionRecording = {
          id: dbRecording.id,
          questionId: dbRecording.question_id,
          sessionId: dbRecording.session_id,
          filePath: dbRecording.audio_file_path,
          duration: dbRecording.duration || 0,
          createdAt: dbRecording.timestamp
        };
        loadExistingRecording(recording);
      }
    } catch (error) {
      console.error('❌ Failed to load existing recording:', error);
    }
  }, [sessionId, questionId, loadExistingRecording]);

  async function handleRecordingComplete(recording: QuestionRecording) {
    try {
      // Save to database
      await databaseService.saveRecording(
        recording.id,
        recording.sessionId,
        recording.questionId,
        recording.filePath,
        recording.duration,
        questionReference
      );
      
      console.log('✅ Recording saved to database:', recording.id);
    } catch (error) {
      console.error('❌ Failed to save recording to database:', error);
      Alert.alert('Error', 'Failed to save recording');
    }
  }

  async function handleRecordingDeleted(questionId: string) {
    try {
      if (existingRecording) {
        await databaseService.deleteRecording(existingRecording.id);
        console.log('✅ Recording deleted from database');
      }
    } catch (error) {
      console.error('❌ Failed to delete recording from database:', error);
    }
  }

  const handlePress = async () => {
    // Don't handle press if a long press was started
    if (longPressStarted) {
      return;
    }

    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Microphone access is required to record answers.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (isRecording) {
      // Stop current recording
      await stopRecording();
    } else if (isPlaying) {
      // Stop playback and rewind
      await stopPlayback();
    } else if (hasRecording && isSessionActive) {
      // Play existing recording (only when session is active)
      await playRecording();
    } else if (hasRecording && !isSessionActive) {
      // Has recording but session is paused
      Alert.alert(
        'Session Paused',
        'Please resume the session to play recordings.',
        [{ text: 'OK' }]
      );
    } else if (isSessionActive) {
      // Start new recording
      await startRecording();
    } else {
      Alert.alert(
        'Session Required',
        'Please start a session to record answers.',
        [{ text: 'OK' }]
      );
    }
  };

  const handlePressIn = () => {
    // Only show long press state if there's a recording and session is active
    if (hasRecording && isSessionActive) {
      setIsLongPressing(true);
    }
  };

  const handlePressOut = () => {
    setIsLongPressing(false);
    // Don't reset longPressStarted immediately - let it reset after press handling
    setTimeout(() => setLongPressStarted(false), 100);
  };

  const handleLongPress = async () => {
    // Only re-record if there's a recording and session is active
    if (hasRecording && isSessionActive) {
      setLongPressStarted(true);
      await reRecord();
    }
  };

  // Dynamic sizing
  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return { buttonSize: 32, iconSize: 14, textSize: 10 };
      case 'large':
        return { buttonSize: 48, iconSize: 20, textSize: 14 };
      default:
        return { buttonSize: 36, iconSize: 16, textSize: 12 };
    }
  };

  const { buttonSize, iconSize, textSize } = getSizeConfig();

  // Dynamic colors and icons
  const getButtonConfig = () => {
    if (isRecording) {
      return {
        backgroundColor: '#FF4444',
        icon: 'stop' as const,
        showPulse: true
      };
    } else if (isLongPressing && hasRecording && isSessionActive) {
      // Long pressing to re-record - show mic icon
      return {
        backgroundColor: Colors[colorScheme ?? 'light'].tint,
        icon: 'mic' as const,
        showPulse: false
      };
    } else if (hasRecording && isSessionActive) {
      return {
        backgroundColor: isPlaying ? '#FF4444' : '#4CAF50',
        icon: (isPlaying ? 'stop' : 'play') as const,
        showPulse: false
      };
    } else if (hasRecording && !isSessionActive) {
      // Has recording but session is paused - show disabled play state
      return {
        backgroundColor: 'rgba(76, 175, 80, 0.4)', // Dimmed green
        icon: 'play' as const,
        showPulse: false
      };
    } else {
      return {
        backgroundColor: isSessionActive 
          ? Colors[colorScheme ?? 'light'].tint 
          : 'rgba(0, 0, 0, 0.3)',
        icon: 'mic' as const,
        showPulse: false
      };
    }
  };

  const { backgroundColor, icon, showPulse } = getButtonConfig();

  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleLongPress}
        delayLongPress={500}
        disabled={!isSessionActive && !isRecording && !isPlaying}
        style={{
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
          backgroundColor,
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.2,
          shadowRadius: 2,
          elevation: 2,
          opacity: (!isSessionActive && !isRecording && !isPlaying) ? 0.7 : 1,
          borderWidth: isLongPressing ? 2 : 0,
          borderColor: isLongPressing ? 'white' : 'transparent',
          transform: [{ scale: isLongPressing ? 1.1 : 1 }]
        }}
      >
        <Ionicons name={icon} size={iconSize} color="white" />
        
        {/* Recording pulse indicator */}
        {showPulse && (
          <View
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#FF4444',
              borderWidth: 1,
              borderColor: 'white'
            }}
          />
        )}
      </TouchableOpacity>

      {/* Duration/Status indicator */}
      {(isRecording || hasRecording || isLongPressing) && (
        <Text
          style={{
            fontSize: textSize,
            fontWeight: '600',
            color: isRecording 
              ? '#FF4444' 
              : isLongPressing
                ? Colors[colorScheme ?? 'light'].tint
                : hasRecording 
                  ? '#4CAF50' 
                  : Colors[colorScheme ?? 'light'].text,
            textAlign: 'center',
            minWidth: 50
          }}
        >
          {isLongPressing && hasRecording && isSessionActive
            ? 'Hold'
            : isRecording 
              ? formatDuration(recordingDuration) 
              : hasRecording && existingRecording 
                ? formatDuration(existingRecording.duration) 
                : ''}
        </Text>
      )}
    </View>
  );
} 