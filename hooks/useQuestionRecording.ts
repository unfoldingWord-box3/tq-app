import {
    AudioModule,
    RecordingPresets,
    setAudioModeAsync,
    useAudioPlayer,
    useAudioRecorder,
    useAudioRecorderState
} from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

export interface QuestionRecording {
  id: string;
  questionId: string;
  sessionId: string;
  filePath: string;
  duration: number;
  createdAt: string;
}

interface UseQuestionRecordingParams {
  sessionId: string;
  questionId: string;
  onRecordingComplete?: (recording: QuestionRecording) => void;
  onRecordingDeleted?: (questionId: string) => void;
}

export function useQuestionRecording({
  sessionId,
  questionId,
  onRecordingComplete,
  onRecordingDeleted
}: UseQuestionRecordingParams) {
  const [hasPermission, setHasPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [existingRecording, setExistingRecording] = useState<QuestionRecording | null>(null);

  // Audio recorder setup
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  
  // Audio player for playback
  const audioPlayer = useAudioPlayer(recordingUri || '');

  // Recording timer
  const recordingStartTime = useRef<number>(0);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  // Set up audio player event listeners for auto-stop
  useEffect(() => {
    if (!audioPlayer || !recordingUri) return;

    let playbackStatusSubscription: any;

    try {
      // Listen for playback status updates
      playbackStatusSubscription = audioPlayer.addListener('onPlaybackStatusUpdate', (status: any) => {
        // Auto-stop when playback finishes
        if (status.isLoaded && status.didJustFinish && isPlaying) {
          console.log('🔄 Audio finished playing, auto-stopping');
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.log('⚠️ Could not set up audio event listeners:', error);
    }

    return () => {
      try {
        playbackStatusSubscription?.remove();
      } catch (error) {
        console.log('⚠️ Could not remove audio event listeners:', error);
      }
    };
  }, [audioPlayer, recordingUri, isPlaying]);

  // Initialize permissions and audio mode
  useEffect(() => {
    setupAudio();
  }, []);

  // Update recording status based on recorder state
  useEffect(() => {
    setIsRecording(recorderState.isRecording);
    
    if (recorderState.isRecording && !timerInterval.current) {
      // Start timer
      recordingStartTime.current = Date.now();
      timerInterval.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime.current) / 1000);
        setRecordingDuration(elapsed);
      }, 1000);
    } else if (!recorderState.isRecording && timerInterval.current) {
      // Stop timer
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  }, [recorderState.isRecording]);

  const setupAudio = async () => {
    try {
      // Request recording permissions
      const permissionResponse = await AudioModule.requestRecordingPermissionsAsync();
      setHasPermission(permissionResponse.granted);
      
      if (!permissionResponse.granted) {
        Alert.alert(
          'Permission Required',
          'Microphone access is required to record answers to questions.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Set audio mode for recording
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
        staysActiveInBackground: false,
      });

      console.log('✅ Audio setup complete');
    } catch (error) {
      console.error('❌ Failed to setup audio:', error);
      Alert.alert('Error', 'Failed to setup audio recording');
    }
  };

  const startRecording = async () => {
    if (!hasPermission) {
      await setupAudio();
      return;
    }

    try {
      console.log('🎙️ Starting recording for question:', questionId);
      
      // Stop any existing playback
      if (audioPlayer) {
        audioPlayer.pause();
        setIsPlaying(false);
      }

      // Prepare and start recording
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      
      setRecordingDuration(0);
      console.log('✅ Recording started');
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recorderState.isRecording) return;

    try {
      console.log('⏹️ Stopping recording for question:', questionId);
      
      // Stop recording
      await audioRecorder.stop();
      
      // Get the recording URI
      const uri = audioRecorder.uri;
      if (!uri) {
        throw new Error('No recording URI available');
      }

      console.log('📁 Recording saved to:', uri);
      
      // Move to permanent location
      const permanentUri = await saveRecordingToPermanentLocation(uri);
      setRecordingUri(permanentUri);

      // Create recording metadata
      const recording: QuestionRecording = {
        id: `recording_${sessionId}_${questionId}_${Date.now()}`,
        questionId,
        sessionId,
        filePath: permanentUri,
        duration: recordingDuration,
        createdAt: new Date().toISOString()
      };

      setExistingRecording(recording);
      onRecordingComplete?.(recording);
      
      console.log('✅ Recording completed:', recording);
    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to save recording');
    }
  };

  const saveRecordingToPermanentLocation = async (tempUri: string): Promise<string> => {
    const recordingsDir = `${FileSystem.documentDirectory}recordings/`;
    
    // Ensure recordings directory exists
    const dirInfo = await FileSystem.getInfoAsync(recordingsDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(recordingsDir, { intermediates: true });
    }

    // Create permanent file path
    const fileName = `recording_${sessionId}_${questionId}_${Date.now()}.m4a`;
    const permanentUri = recordingsDir + fileName;

    // Move file
    await FileSystem.moveAsync({
      from: tempUri,
      to: permanentUri
    });

    return permanentUri;
  };

  const playRecording = async () => {
    if (!recordingUri) return;

    try {
      console.log('▶️ Playing recording:', recordingUri);
      audioPlayer.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('❌ Failed to play recording:', error);
      Alert.alert('Error', 'Failed to play recording');
      setIsPlaying(false);
    }
  };

  const stopPlayback = async () => {
    if (!isPlaying) return;

    try {
      console.log('⏹️ Stopping playback');
      audioPlayer.pause();
      setIsPlaying(false);
      console.log('✅ Playback stopped');
    } catch (error) {
      console.error('❌ Failed to stop playback:', error);
      setIsPlaying(false);
    }
  };

  const deleteRecording = async () => {
    if (!existingRecording) return;

    try {
      console.log('🗑️ Deleting recording:', existingRecording.filePath);
      
      // Stop playback if active
      if (isPlaying) {
        await stopPlayback();
      }

      // Delete file
      const fileInfo = await FileSystem.getInfoAsync(existingRecording.filePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(existingRecording.filePath);
      }

      // Clear state
      setRecordingUri(null);
      setExistingRecording(null);
      setRecordingDuration(0);
      
      onRecordingDeleted?.(questionId);
      
      console.log('✅ Recording deleted');
    } catch (error) {
      console.error('❌ Failed to delete recording:', error);
      Alert.alert('Error', 'Failed to delete recording');
    }
  };

  const reRecord = async () => {
    if (existingRecording) {
      // Delete the existing recording first
      await deleteRecording();
    }
    // Start new recording
    await startRecording();
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Load existing recording if available
  const loadExistingRecording = (recording: QuestionRecording) => {
    setExistingRecording(recording);
    setRecordingUri(recording.filePath);
    setRecordingDuration(recording.duration);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, []);

  return {
    // State
    hasPermission,
    isRecording,
    isPlaying,
    recordingDuration,
    existingRecording,
    hasRecording: !!existingRecording,
    
    // Actions
    startRecording,
    stopRecording,
    playRecording,
    stopPlayback,
    deleteRecording,
    reRecord,
    loadExistingRecording,
    
    // Utilities
    formatDuration
  };
} 