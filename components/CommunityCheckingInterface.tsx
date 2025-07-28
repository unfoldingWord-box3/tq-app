import { ParagraphAwareScriptureRenderer } from '@/components/ParagraphAwareScriptureRenderer';
import { QuestionRecordingButton } from '@/components/QuestionRecordingButton';
import { ReferenceNavigator } from '@/components/ReferenceNavigator';
import { ScrollFadeIndicator } from '@/components/ScrollFadeIndicator';
import { SessionTimer } from '@/components/SessionTimer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslationQuestions } from '@/hooks/useTranslationQuestions';
import { useUSFMScripture } from '@/hooks/useUSFMScripture';
import { databaseService } from '@/services/databaseService';
import { getQuestionsForReference, getQuestionsForVerseRange } from '@/services/translationQuestionsService';
import { TranslationQuestion } from '@/types/translationQuestions';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Interfaces
interface RangeSelection {
  isSelectingRange: boolean;
  startVerse: number | null;
  endVerse: number | null;
  chapter: number;
}

interface CheckingSession {
  id: string;
  projectId: string;
  startTime: string;
  status: 'active' | 'paused' | 'completed';
  completedQuestions: string[];
  totalDuration: number; // in seconds
  lastResumedTime: string | null;
  pausedTime: number; // total paused time in seconds
}

interface CommunityCheckingInterfaceProps {
  bookCode: string;
  sessionId?: string;
  projectId?: string;
  resumeSession?: boolean;
  onSessionComplete?: (session: CheckingSession) => void;
  onExit?: () => void;
  initialReference?: string;
}

export function CommunityCheckingInterface({ 
  bookCode, 
  sessionId,
  projectId,
  resumeSession = false,
  onSessionComplete, 
  onExit,
  initialReference = `${bookCode} 1:1`
}: CommunityCheckingInterfaceProps) {
  const colorScheme = useColorScheme();
  
  // Navigation state
  const [selectedReference, setSelectedReference] = useState<string>(initialReference);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [showSectionsDropdown, setShowSectionsDropdown] = useState(false);
  const [navigationCollapsed, setNavigationCollapsed] = useState(true);
  const [showReferenceNavigator, setShowReferenceNavigator] = useState(false);
  
  // Community panel state
  type PanelMode = 'collapsed' | 'expanded' | 'fullscreen';
  const [communityPanelMode, setCommunityPanelMode] = useState<PanelMode>('expanded');
  
  // Range selection state  
  const [rangeSelection, setRangeSelection] = useState<RangeSelection>({
    isSelectingRange: false,
    startVerse: null,
    endVerse: null,
    chapter: 1
  });

  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0.3);
  
  // Question expansion state
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  
  // Session management state
  const [checkingSession, setCheckingSession] = useState<CheckingSession | null>(null);
  
  // Load and process USFM content dynamically
  const { scripture, loading: scriptureLoading, error: scriptureError } = useUSFMScripture({
    bookCode,
    enableSections: true
  });

  // Load translation questions
  const { questions: translationQuestionsData, loading: questionsLoading, error: questionsError } = useTranslationQuestions({
    bookCode,
    enableGrouping: true
  });

  // Recording state - tracks which questions have recordings
  const [questionRecordingStates, setQuestionRecordingStates] = useState<Record<string, {
    hasRecording: boolean;
    isRecording: boolean;
  }>>({});
  
  // Scroll indicators state
  const [scriptureScrollIndicator, setScriptureScrollIndicator] = useState({
    showTop: false,
    showBottom: false
  });
  const [questionsScrollIndicator, setQuestionsScrollIndicator] = useState({
    showTop: false,
    showBottom: false
  });

  // Audio player functions
  const toggleAudioPlayback = () => {
    setIsPlaying(!isPlaying);
  };

  // Question expansion functions
  const toggleQuestionExpansion = (questionId: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

     // Session management functions
   const startCheckingSession = async () => {
     const now = new Date().toISOString();
     const newSession: CheckingSession = {
       id: sessionId || Date.now().toString(),
       projectId: projectId || `${bookCode.toLowerCase()}-project`,
       startTime: now,
       status: 'active',
       completedQuestions: [],
       totalDuration: 0,
       lastResumedTime: now,
       pausedTime: 0
     };
     
           console.log('🚀 Starting new session:', newSession);
      setCheckingSession(newSession);
     
     // Update session status in database (if this is a resume of an existing session)
     if (sessionId) {
       try {
         await databaseService.updateSessionStatus(newSession.id, 'active');
         console.log('✅ Session started and saved to database');
       } catch (error) {
         console.error('❌ Failed to update session in database:', error);
       }
     }
   };

  const pauseCheckingSession = async () => {
    if (checkingSession && checkingSession.status === 'active') {
      const now = Date.now();
      const lastResumed = new Date(checkingSession.lastResumedTime!).getTime();
      const sessionDuration = Math.floor((now - lastResumed) / 1000);
      
      // Note: Individual recording states are managed by QuestionRecordingButton components
      
      const updatedSession = {
        ...checkingSession,
        status: 'paused' as const,
        totalDuration: checkingSession.totalDuration + sessionDuration,
        lastResumedTime: null
      };
      
      setCheckingSession(updatedSession);
      
      // Update session status and duration in database
      try {
        await databaseService.updateSessionStatus(checkingSession.id, 'paused');
        await databaseService.updateSessionDuration(checkingSession.id, updatedSession.totalDuration);
        console.log('✅ Session paused and saved to database:', {
          sessionId: checkingSession.id,
          status: 'paused',
          totalDuration: updatedSession.totalDuration,
          sessionDuration: sessionDuration,
          lastResumed: new Date(checkingSession.lastResumedTime!).getTime(),
          now: now
        });
      } catch (error) {
        console.error('❌ Failed to update session in database:', error);
      }
    }
  };

     const resumeCheckingSession = async () => {
     if (checkingSession && checkingSession.status === 'paused') {
       const now = new Date().toISOString();
       const updatedSession = {
         ...checkingSession,
         status: 'active' as const,
         lastResumedTime: now
       };
       
       setCheckingSession(updatedSession);
       
       // Update session status in database
       try {
         await databaseService.updateSessionStatus(checkingSession.id, 'active');
         console.log('✅ Session resumed and saved to database:', {
           sessionId: updatedSession.id,
           status: updatedSession.status,
           lastResumedTime: updatedSession.lastResumedTime,
           totalDuration: updatedSession.totalDuration
         });
       } catch (error) {
         console.error('❌ Failed to update session in database:', error);
       }
     }
   };

     // Handle session end confirmation
   const handleEndSessionConfirmation = () => {
     Alert.alert(
       'End Session',
       'Are you sure you want to end this session? You will move to the answers review stage and cannot return to recording.',
       [
         {
           text: 'Cancel',
           style: 'cancel'
         },
         {
           text: 'End Session',
           style: 'destructive',
           onPress: async () => await endCheckingSession()
         }
       ]
     );
   };

     const endCheckingSession = async () => {
     if (checkingSession) {
       let finalSession = { ...checkingSession };
       
       // If session is active, calculate final duration
       if (checkingSession.status === 'active' && checkingSession.lastResumedTime) {
         const now = Date.now();
         const lastResumed = new Date(checkingSession.lastResumedTime).getTime();
         const finalDuration = Math.floor((now - lastResumed) / 1000);
         finalSession.totalDuration += finalDuration;
       }
       
       finalSession.status = 'completed';
       
       // Update session status and duration in database
       try {
         await databaseService.updateSessionStatus(checkingSession.id, 'completed');
         await databaseService.updateSessionDuration(checkingSession.id, finalSession.totalDuration);
         console.log('✅ Session completed and saved to database:', finalSession);
         
         // Navigate to answers review stage
         router.push({
           pathname: '/session-review',
           params: {
             sessionId: finalSession.id,
             projectId: finalSession.projectId
           }
         });
       } catch (error) {
         console.error('❌ Failed to update session in database:', error);
       }
       
       onSessionComplete?.(finalSession);
       setCheckingSession(null);
       // Note: Individual recording states are managed by QuestionRecordingButton components
     }
   };

  // Handle scroll position for overflow indicators
  const handleScriptureScroll = (event: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const scrollY = contentOffset.y;
    const scrollViewHeight = layoutMeasurement.height;
    const contentHeight = contentSize.height;
    
    setScriptureScrollIndicator({
      showTop: scrollY > 20,
      showBottom: scrollY < contentHeight - scrollViewHeight - 20
    });
  };

  const handleQuestionsScroll = (event: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const scrollY = contentOffset.y;
    const scrollViewHeight = layoutMeasurement.height;
    const contentHeight = contentSize.height;
    
    setQuestionsScrollIndicator({
      showTop: scrollY > 20,
      showBottom: scrollY < contentHeight - scrollViewHeight - 20
    });
  };

  // Dynamic sections from USFM data
  const dynamicSections = scripture?.sections || [];

       const loadExistingSession = useCallback(async () => {
       if (!sessionId) return;
       
       try {
         const sessions = await databaseService.getSessionsForProject(projectId || '');
         const existingSession = sessions.find(s => s.id === sessionId);
         
         if (existingSession) {
           // Get session data to retrieve saved duration
           const sessionData = await databaseService.getSessionData(sessionId);
           const savedDuration = sessionData.totalDuration || 0;
           
           console.log('🔍 Loading existing session:', {
             sessionId,
             existingSession: {
               id: existingSession.id,
               status: existingSession.status,
               session_data: existingSession.session_data
             },
             sessionData,
             savedDuration
           });
           
           // Convert database session to our CheckingSession format
           // Always restore as paused so user has to manually resume
           const restoredSession: CheckingSession = {
             id: existingSession.id,
             projectId: existingSession.project_id,
             startTime: existingSession.start_time,
             status: 'paused', // Always start as paused when resuming existing sessions
             completedQuestions: [],
             totalDuration: savedDuration, // Use saved duration from database
             lastResumedTime: null, // Will be set when user clicks resume
             pausedTime: 0
           };
           
                       setCheckingSession(restoredSession);
           
           console.log('✅ Restored session:', restoredSession, 'from DB session:', existingSession, 'with duration:', savedDuration);
         } else {
           console.log('❌ No existing session found with ID:', sessionId);
         }
       } catch (error) {
         console.error('❌ Failed to load existing session:', error);
       }
     }, [sessionId, projectId]);

  // Load existing session on mount if resuming
  React.useEffect(() => {
    if (resumeSession && sessionId) {
      loadExistingSession();
    }
  }, [resumeSession, sessionId, loadExistingSession]);

           
  
  // Generate clean range references from section data
  const getSectionRangeReference = (section: any) => {
    const startRef = section.startReference;
    const endRef = section.endReference;
    
    if (endRef) {
      const startPart = startRef.replace(`${bookCode} `, '');
      const endPart = endRef.replace(`${bookCode} `, '');
      
      const startMatch = startPart.match(/(\d+):(\d+)/);
      const endMatch = endPart.match(/(\d+):(\d+)/);
      
      if (startMatch && endMatch) {
        const startChapter = startMatch[1];
        const startVerse = startMatch[2];
        const endChapter = endMatch[1];
        const endVerse = endMatch[2];
        
        if (startChapter === endChapter) {
          return `${startChapter}:${startVerse}-${endVerse}`;
        } else {
          return `${startChapter}:${startVerse}-${endChapter}:${endVerse}`;
        }
      }
      
      return `${startPart}-${endPart.split(':')[1]}`;
    } else {
      return `${startRef.replace(`${bookCode} `, '')}+`;
    }
  };

     // Helper function to create reference string from current selection
   const getCurrentReference = useCallback((): string => {
     if (rangeSelection.isSelectingRange && rangeSelection.startVerse && rangeSelection.endVerse) {
       return `${bookCode} ${rangeSelection.chapter}:${rangeSelection.startVerse}-${rangeSelection.endVerse}`;
     } else if (rangeSelection.isSelectingRange && rangeSelection.startVerse) {
       return `${bookCode} ${rangeSelection.chapter}:${rangeSelection.startVerse}`;
     }
     return selectedReference;
   }, [rangeSelection.isSelectingRange, rangeSelection.startVerse, rangeSelection.endVerse, rangeSelection.chapter, selectedReference, bookCode]);

  // Helper function to check if a verse is in current selection
  const isVerseSelected = (verse: any): boolean => {
    if (rangeSelection.isSelectingRange) {
      if (rangeSelection.startVerse && rangeSelection.endVerse) {
        return verse.number >= rangeSelection.startVerse && verse.number <= rangeSelection.endVerse;
      } else if (rangeSelection.startVerse) {
        return verse.number === rangeSelection.startVerse;
      }
      return false;
    }
    return selectedReference === verse.reference;
  };

  // Handle verse selection with range support
  const handleVerseSelection = (verse: any) => {
    if (rangeSelection.isSelectingRange) {
      if (!rangeSelection.startVerse) {
        setRangeSelection(prev => ({
          ...prev,
          startVerse: verse.number,
          chapter: selectedChapter
        }));
      } else if (!rangeSelection.endVerse) {
        const start = Math.min(rangeSelection.startVerse, verse.number);
        const end = Math.max(rangeSelection.startVerse, verse.number);
        
        setRangeSelection(prev => ({
          ...prev,
          startVerse: start,
          endVerse: end
        }));
        
        const newRef = `${bookCode} ${selectedChapter}:${start}-${end}`;
        setSelectedReference(newRef);
      } else {
        setRangeSelection(prev => ({
          ...prev,
          startVerse: verse.number,
          endVerse: null
        }));
      }
    } else {
      setSelectedReference(verse.reference);
    }
  };

  // Toggle range selection mode
  const toggleRangeMode = () => {
    if (rangeSelection.isSelectingRange) {
      setRangeSelection({
        isSelectingRange: false,
        startVerse: null,
        endVerse: null,
        chapter: selectedChapter
      });
    } else {
      setRangeSelection({
        isSelectingRange: true,
        startVerse: null,
        endVerse: null,
        chapter: selectedChapter
      });
    }
  };

  // Handle section selection - use full range
  const handleSectionSelection = useCallback((section: any) => {
    if (section.endReference) {
      const startRef = section.startReference.replace(`${bookCode} `, '');
      const endRef = section.endReference.replace(`${bookCode} `, '');
      
      const startMatch = startRef.match(/(\d+):(\d+)/);
      const endMatch = endRef.match(/(\d+):(\d+)/);
      
      if (startMatch && endMatch) {
        const startChapter = parseInt(startMatch[1]);
        const startVerse = parseInt(startMatch[2]);
        const endChapter = parseInt(endMatch[1]);
        const endVerse = parseInt(endMatch[2]);
        
        let rangeRef: string;
        if (startChapter === endChapter) {
          rangeRef = `${bookCode} ${startChapter}:${startVerse}-${endVerse}`;
        } else {
          rangeRef = `${bookCode} ${startChapter}:${startVerse}-${endChapter}:${endVerse}`;
        }
        
        setSelectedReference(rangeRef);
        setSelectedChapter(startChapter);
        
        setRangeSelection({
          isSelectingRange: false,
          startVerse: startVerse,
          endVerse: endVerse,
          chapter: startChapter
        });
      }
    } else {
      setSelectedReference(section.startReference);
      setSelectedChapter(section.startChapter);
      setRangeSelection({
        isSelectingRange: false,
        startVerse: null,
        endVerse: null,
        chapter: section.startChapter
      });
    }
    
    setShowSectionsDropdown(false);
  }, [bookCode]);

  // Auto-select first section when sections become available
  React.useEffect(() => {
    if (dynamicSections.length > 0 && selectedReference === initialReference) {
      const firstSection = dynamicSections[0];
      handleSectionSelection(firstSection);
    }
  }, [dynamicSections.length, selectedReference, initialReference, handleSectionSelection]);

  // State for managing UI properties of questions
  const [questionUIState, setQuestionUIState] = useState<Record<string, {
    isBookmarked: boolean;
    isRecorded: boolean;
  }>>({});

  // Prepare sections data for ReferenceNavigator
  const getSectionsData = () => {
    if (!dynamicSections) return [];
    return dynamicSections.map(section => ({
      id: section.id,
      startReference: section.startReference,
      endReference: section.endReference || undefined,
      startChapter: section.startChapter,
      startVerse: parseInt(section.startReference.match(/:(\d+)/)?.[1] || '1'),
      endChapter: section.endReference ? parseInt(section.endReference.match(/(\d+):/)?.[1] || section.startChapter.toString()) : undefined,
      endVerse: section.endReference ? parseInt(section.endReference.match(/:(\d+)/)?.[1] || '1') : undefined,
    }));
  };

  // Get currently selected section
  const selectedSection = useMemo(() => {
    const sectionsData = getSectionsData();
    if (!sectionsData.length) return null;
    
    return sectionsData.find(section => {
      if (section.endReference) {
        let rangeRef: string;
        if (section.startChapter === section.endChapter) {
          rangeRef = `${bookCode} ${section.startChapter}:${section.startVerse}-${section.endVerse}`;
        } else {
          rangeRef = `${bookCode} ${section.startChapter}:${section.startVerse}-${section.endChapter}:${section.endVerse}`;
        }
        
        return selectedReference === rangeRef;
      } else {
        const singleRef = `${bookCode} ${section.startChapter}:${section.startVerse}`;
        return selectedReference === singleRef;
      }
    }) || null;
  }, [selectedReference, dynamicSections, bookCode]);

     // Get questions for current reference/selection
   const currentQuestions = useMemo(() => {
     if (!translationQuestionsData) return [];

     let questions: TranslationQuestion[] = [];
     const currentRef = getCurrentReference();

     const rangeMatch = currentRef.match(/^([A-Z]+)\s+(\d+):(\d+)-(?:(\d+):)?(\d+)$/);
     
     if (rangeMatch) {
       const [, , startChapter, startVerse, endChapter, endVerse] = rangeMatch;
       const startChapterNum = parseInt(startChapter);
       const startVerseNum = parseInt(startVerse);
       const endChapterNum = endChapter ? parseInt(endChapter) : startChapterNum;
       const endVerseNum = parseInt(endVerse);
       
       if (startChapterNum === endChapterNum) {
         questions = getQuestionsForVerseRange(
           translationQuestionsData,
           bookCode,
           startChapterNum,
           startVerseNum,
           endVerseNum
         );
       } else {
         for (let chapter = startChapterNum; chapter <= endChapterNum; chapter++) {
           const chapterStartVerse = chapter === startChapterNum ? startVerseNum : 1;
           const chapterEndVerse = chapter === endChapterNum ? endVerseNum : 999;
           
           const chapterQuestions = getQuestionsForVerseRange(
             translationQuestionsData,
             bookCode,
             chapter,
             chapterStartVerse,
             chapterEndVerse
           );
           questions.push(...chapterQuestions);
         }
       }
     } else if (rangeSelection.isSelectingRange && rangeSelection.startVerse && rangeSelection.endVerse) {
       questions = getQuestionsForVerseRange(
         translationQuestionsData,
         bookCode,
         rangeSelection.chapter,
         rangeSelection.startVerse,
         rangeSelection.endVerse
       );
     } else {
       questions = getQuestionsForReference(translationQuestionsData, currentRef);
     }

     return questions.map(q => ({
       ...q,
       isBookmarked: questionUIState[q.id]?.isBookmarked ?? false,
       isRecorded: questionUIState[q.id]?.isRecorded ?? false,
     }));
   }, [
     translationQuestionsData, 
     getCurrentReference,
     rangeSelection.isSelectingRange,
     rangeSelection.startVerse,
     rangeSelection.endVerse,
     rangeSelection.chapter,
     questionUIState,
     bookCode
   ]);

  const toggleBookmark = (id: string) => {
    setQuestionUIState(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        isBookmarked: !(prev[id]?.isBookmarked ?? false),
        isRecorded: prev[id]?.isRecorded ?? false
      }
    }));
  };

     // Handle recording state changes from QuestionRecordingButton components
   const handleRecordingStateChange = useCallback((questionId: string, hasRecording: boolean, isRecording: boolean) => {
     setQuestionRecordingStates(prev => ({
       ...prev,
       [questionId]: { hasRecording, isRecording }
     }));

     // Update question UI state when recording is completed
     if (hasRecording && !isRecording) {
       setQuestionUIState(prev => ({
         ...prev,
         [questionId]: {
           ...prev[questionId],
           isBookmarked: prev[questionId]?.isBookmarked ?? false,
           isRecorded: true
         }
       }));
       
       // Add to completed questions if in session
       setCheckingSession(prev => prev ? {
         ...prev,
         completedQuestions: [...prev.completedQuestions.filter(id => id !== questionId), questionId]
       } : prev);
     } else if (!hasRecording) {
       // Remove from completed questions if recording was deleted
       setQuestionUIState(prev => ({
         ...prev,
         [questionId]: {
           ...prev[questionId],
           isBookmarked: prev[questionId]?.isBookmarked ?? false,
           isRecorded: false
         }
       }));
       
       setCheckingSession(prev => prev ? {
         ...prev,
         completedQuestions: prev.completedQuestions.filter(id => id !== questionId)
       } : prev);
     }
   }, []); // Remove checkingSession dependency to prevent recreations

  const handleQuestionPress = (question: TranslationQuestion) => {
    toggleQuestionExpansion(question.id);
  };

  // Helper to get display text for current selection
  const getSelectionDisplayText = (): string => {
    if (rangeSelection.isSelectingRange) {
      if (rangeSelection.startVerse && rangeSelection.endVerse) {
        return `${rangeSelection.startVerse}-${rangeSelection.endVerse}`;
      } else if (rangeSelection.startVerse) {
        return `${rangeSelection.startVerse} (selecting range...)`;
      } else {
        return "Select start verse...";
      }
    }
    
    const match = selectedReference.match(new RegExp(`${bookCode}\\s+(\\d+):(\\d+)(?:-(\\d+))?`));
    if (match) {
      const chapter = match[1];
      const startVerse = match[2];
      const endVerse = match[3];
      
      if (endVerse) {
        return `${startVerse}-${endVerse}`;
      } else {
        return startVerse;
      }
    }
    
    return "1";
  };

  // Prepare chapter data for ReferenceNavigator
  const getChapterData = () => {
    if (!scripture?.chapters) return [];
    return scripture.chapters.map(chapter => ({
      number: chapter.number,
      verseCount: chapter.verses.length
    }));
  };

  // Handle reference selection from ReferenceNavigator
  const handleReferenceNavigatorSelect = (reference: string) => {
    setSelectedReference(reference);
    
    const match = reference.match(/^([A-Z]+)\s+(\d+)/i);
    if (match) {
      setSelectedChapter(parseInt(match[2]));
    }
    
    setRangeSelection({
      isSelectingRange: false,
      startVerse: null,
      endVerse: null,
      chapter: parseInt(match?.[2] || '1')
    });
    
    setShowSectionsDropdown(false);
    setNavigationCollapsed(true);
  };

  // Handle community panel mode cycling
  const cycleCommunityPanelMode = () => {
    setCommunityPanelMode(current => {
      switch (current) {
        case 'collapsed': return 'expanded';
        case 'expanded': return 'fullscreen';
        case 'fullscreen': return 'collapsed';
        default: return 'expanded';
      }
    });
  };

  // Get panel mode icon
  const getPanelModeIcon = (): 'expand.less' | 'fullscreen' | 'expand.more' => {
    switch (communityPanelMode) {
      case 'collapsed': return 'expand.less';
      case 'expanded': return 'fullscreen';
      case 'fullscreen': return 'expand.more';
      default: return 'expand.more';
    }
  };

  

   // Handle exit with auto-pause
   const handleExit = async () => {
     // If there's an active session, pause it before leaving
     if (checkingSession && checkingSession.status === 'active') {
       await pauseCheckingSession();
       console.log('✅ Session auto-paused before exit');
     }
     
     // Call the original onExit handler
     onExit?.();
   };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors[colorScheme ?? 'light'].background }}>
      
      {/* Header with Navigation */}
      <View style={{
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.1)',
        backgroundColor: Colors[colorScheme ?? 'light'].background
      }}>
        {/* Main Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(0, 0, 0, 0.1)'
        }}>
                                           {onExit ? (
              <TouchableOpacity 
                onPress={handleExit} 
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
            ) : (
              <View style={{ width: 44, height: 44 }} />
            )}
          
                     <TouchableOpacity 
             style={{ alignItems: 'center', flexDirection: 'row' }}
             onPress={() => setShowReferenceNavigator(true)}
           >
             <Text style={{
               fontSize: 24,
               fontWeight: 'bold',
               color: Colors[colorScheme ?? 'light'].text
             }}>
               {getCurrentReference()}
             </Text>
             <IconSymbol 
                 name="chevron.down" 
                 size={16} 
                 color={Colors[colorScheme ?? 'light'].tabIconDefault}
               />
           </TouchableOpacity>

                                   <View style={{ width: 44, height: 44 }} />
                 </View>
       </View>

      {/* Split Layout */}
      <View className="flex-1">
        {/* TOP PANEL - Bible Text */}
        {communityPanelMode !== 'fullscreen' && (
          <ThemedView className={`flex-1 border-b-2 border-gray-200 relative ${
            communityPanelMode === 'collapsed' ? 'flex-[3]' : ''
          }`}>
                         {/* Scripture Scroll Indicators */}
             <ScrollFadeIndicator
               position="top"
               show={scriptureScrollIndicator.showTop}
               backgroundColor={Colors[colorScheme ?? 'light'].background}
               height={32}
             />
             <ScrollFadeIndicator
               position="bottom"
               show={scriptureScrollIndicator.showBottom}
               backgroundColor={Colors[colorScheme ?? 'light'].background}
               height={32}
             />
            
            <ScrollView 
              className="flex-1 p-4"
              showsVerticalScrollIndicator={true}
              onScroll={handleScriptureScroll}
              scrollEventThrottle={16}
            >
              {scriptureLoading ? (
                <ThemedText className="text-base text-center italic opacity-70 p-5">Loading scripture...</ThemedText>
              ) : scriptureError ? (
                <ThemedText className="text-base text-center text-red-500 p-5">Error: {scriptureError}</ThemedText>
              ) : scripture ? (
                <ParagraphAwareScriptureRenderer 
                  scripture={scripture}
                  reference={getCurrentReference()}
                  showVerseNumbers={true}
                  showReference={false}
                />
                             ) : (
                 <ThemedText className="text-base text-center text-red-500 p-5">No scripture data available</ThemedText>
               )}
             </ScrollView>

                           {/* Audio Player Bar - Only show during active sessions */}
              {checkingSession && checkingSession.status === 'active' && (
               <View 
                 className="absolute bottom-0 left-0 right-0 px-4 py-3 border-t border-gray-200"
                 style={{ backgroundColor: Colors[colorScheme ?? 'light'].background }}
               >
                 <View className="flex-row items-center gap-3">
                                       <TouchableOpacity 
                      className="w-10 h-10 rounded-full justify-center items-center"
                      style={{ backgroundColor: Colors[colorScheme ?? 'light'].tint }}
                      onPress={toggleAudioPlayback}
                    >
                      <Ionicons 
                        name={isPlaying ? "pause" : "play"} 
                        size={16} 
                        color="white" 
                      />
                    </TouchableOpacity>
                   
                   <View className="flex-1 flex-row items-center gap-3">
                     <View className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                       <View 
                         className="h-full rounded-full"
                         style={{ 
                           backgroundColor: Colors[colorScheme ?? 'light'].tint,
                           width: `${audioProgress * 100}%`
                         }}
                       />
                     </View>
                     <Text className="text-xs opacity-70 min-w-10">1:23</Text>
                   </View>
                 </View>
               </View>
             )}
           </ThemedView>
         )}

        {/* BOTTOM PANEL - Questions & Recording */}
        <ThemedView className={`flex-1 p-4 relative ${
          communityPanelMode === 'collapsed' ? 'flex-none min-h-20 max-h-20' : 
          communityPanelMode === 'fullscreen' ? 'flex-1' : ''
        }`}>
                                           <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center gap-3 flex-1">
                <IconSymbol 
                  name="questionmark.circle.fill" 
                  size={24} 
                  color={Colors[colorScheme ?? 'light'].tint}
                />
                <Text 
                  className="text-lg font-semibold"
                  style={{ color: Colors[colorScheme ?? 'light'].text }}
                                                  >
                    {checkingSession ? (
                      `${Object.values(questionRecordingStates).filter(state => state.hasRecording).length}/${currentQuestions.length}`
                    ) : (
                      `${currentQuestions.length} Questions`
                    )}
                 </Text>
                 {!checkingSession && (
                   <View style={{
                     paddingHorizontal: 8,
                     paddingVertical: 2,
                     backgroundColor: 'rgba(0, 122, 255, 0.1)',
                     borderRadius: 12
                   }}>
                     <Text style={{
                       fontSize: 12,
                       fontWeight: '600',
                       color: Colors[colorScheme ?? 'light'].tint
                     }}>
                       Review Mode
                     </Text>
                   </View>
                 )}
                                  {checkingSession && checkingSession.status === 'paused' && (
                    <View style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      backgroundColor: `${Colors[colorScheme ?? 'light'].tint}20`,
                      borderRadius: 12
                    }}>
                      <Text style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: Colors[colorScheme ?? 'light'].tint
                      }}>
                        Session Paused
                      </Text>
                    </View>
                  )}
              </View>
              
              {/* Session Control Buttons and Panel Toggle */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                 {/* Session Timer - Only show when session exists */}
                 <SessionTimer session={checkingSession} />

                                                   {/* Main Session Button */}
                  <TouchableOpacity 
                    onPress={async () => {
                      if (!checkingSession) {
                        await startCheckingSession();
                      } else if (checkingSession.status === 'active') {
                        await pauseCheckingSession();
                      } else if (checkingSession.status === 'paused') {
                        await resumeCheckingSession();
                      }
                    }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: !checkingSession 
                        ? Colors[colorScheme ?? 'light'].tint
                        : checkingSession.status === 'active'
                          ? '#4CAF50'
                          : Colors[colorScheme ?? 'light'].tint,
                      justifyContent: 'center',
                      alignItems: 'center',
                      position: 'relative',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.2,
                      shadowRadius: 2,
                      elevation: 2
                    }}
                 >
                  <Ionicons 
                    name={!checkingSession 
                      ? "mic" 
                      : checkingSession.status === 'active'
                        ? "pause" 
                        : "play"}
                    size={18} 
                    color="white"
                  />
                 {checkingSession && checkingSession.status === 'active' && (
                   <View style={{
                     position: 'absolute',
                     top: -2,
                     right: -2,
                     width: 10,
                     height: 10,
                     borderRadius: 5,
                     backgroundColor: '#FF4444',
                     borderWidth: 1,
                     borderColor: 'white'
                   }} />
                 )}
               </TouchableOpacity>

                                 {/* End Session Button - Only show when session exists */}
                 {checkingSession && (
                   <TouchableOpacity 
                     onPress={handleEndSessionConfirmation}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: '#F44336',
                      justifyContent: 'center',
                      alignItems: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.2,
                      shadowRadius: 1,
                      elevation: 1
                    }}
                  >
                    <Ionicons 
                      name="stop" 
                      size={14} 
                      color="white"
                    />
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  className="p-2 rounded-lg bg-gray-50"
                  onPress={cycleCommunityPanelMode}
                >
                  <IconSymbol 
                    name={getPanelModeIcon()}
                    size={18}
                    color={Colors[colorScheme ?? 'light'].tabIconDefault}
                  />
                </TouchableOpacity>
              </View>
            </View>
          
          {communityPanelMode !== 'collapsed' && (
            <>
                             {/* Questions Scroll Indicators */}
               <ScrollFadeIndicator
                 position="top"
                 show={questionsScrollIndicator.showTop}
                 backgroundColor={Colors[colorScheme ?? 'light'].background}
                 height={32}
               />
               <ScrollFadeIndicator
                 position="bottom"
                 show={questionsScrollIndicator.showBottom}
                 backgroundColor={Colors[colorScheme ?? 'light'].background}
                 height={32}
               />
              
              <ScrollView 
                className="flex-1"
                showsVerticalScrollIndicator={true}
                onScroll={handleQuestionsScroll}
                scrollEventThrottle={16}
              >
                {questionsLoading ? (
                  <ThemedText className="text-base text-center italic opacity-70 p-5">Loading questions...</ThemedText>
                ) : questionsError ? (
                  <ThemedText className="text-base text-center text-red-500 p-5">Error loading questions: {questionsError}</ThemedText>
                ) : currentQuestions.length === 0 ? (
                  <ThemedText className="text-base text-center italic opacity-70 p-5">No questions available for this reference.</ThemedText>
                ) : (
                                     currentQuestions.map((question) => (
                                           <TouchableOpacity 
                        key={question.id} 
                        className="border rounded-lg p-4 mb-3"
                        style={{ 
                          borderColor: checkingSession && checkingSession.status === 'active' && questionRecordingStates[question.id]?.isRecording 
                            ? Colors[colorScheme ?? 'light'].tint 
                            : Colors[colorScheme ?? 'light'].tabIconDefault,
                          backgroundColor: checkingSession && checkingSession.status === 'active' && questionRecordingStates[question.id]?.isRecording 
                            ? `${Colors[colorScheme ?? 'light'].tint}20` 
                            : 'rgba(0,0,0,0.02)',
                          opacity: checkingSession && checkingSession.status === 'paused' ? 0.7 : 1
                        }}
                       onPress={() => handleQuestionPress(question)}
                     >
                                               <View className="flex-row items-start gap-3">
                          {/* Recording Button - Show for both session and review modes */}
                          {checkingSession ? (
                            <QuestionRecordingButton
                              sessionId={checkingSession.id}
                              questionId={question.id}
                              questionReference={question.reference}
                              isSessionActive={checkingSession.status === 'active'}
                              onRecordingStateChange={handleRecordingStateChange}
                              size="medium"
                            />
                          ) : (
                            /* Question number indicator for review mode */
                            <View 
                              className="w-9 h-9 rounded-full justify-center items-center"
                              style={{
                                backgroundColor: 'rgba(0, 122, 255, 0.1)',
                                borderWidth: 1,
                                borderColor: Colors[colorScheme ?? 'light'].tint
                              }}
                            >
                              <Text style={{
                                fontSize: 14,
                                fontWeight: '600',
                                color: Colors[colorScheme ?? 'light'].tint
                              }}>
                                {currentQuestions.indexOf(question) + 1}
                              </Text>
                            </View>
                          )}
                         
                         <View className="flex-1">
                           <Text 
                             className="text-base leading-6 mb-2"
                             style={{ color: Colors[colorScheme ?? 'light'].text }}
                           >
                             {question.question}
                           </Text>
                           
                           {/* Expandable Answer Section */}
                           {expandedQuestions.has(question.id) && question.response && (
                             <View className="mt-3 p-3 bg-gray-50 rounded-lg border-l-4" style={{ borderLeftColor: Colors[colorScheme ?? 'light'].tint }}>
                               <Text className="text-xs font-semibold mb-2 opacity-70">
                                 {checkingSession ? "SUGGESTED ANSWER:" : "ANSWER:"}
                               </Text>
                               <Text 
                                 className="text-sm leading-5"
                                 style={{ color: Colors[colorScheme ?? 'light'].text }}
                               >
                                 {question.response}
                               </Text>
                             </View>
                           )}
                           
                           <View className="flex-row items-center gap-3 mt-2">
                             <Text 
                               className="text-xs italic"
                               style={{ color: Colors[colorScheme ?? 'light'].tabIconDefault }}
                             >
                               {bookCode} {question.reference}
                             </Text>
                             {/* Only show recording status in session mode */}
                             {checkingSession && question.isRecorded && (
                               <Text className="text-xs font-semibold text-green-500">
                                 • Recorded
                               </Text>
                             )}
                             {checkingSession && questionRecordingStates[question.id]?.isRecording && (
                               <Text 
                                 className="text-xs font-semibold"
                                 style={{ color: Colors[colorScheme ?? 'light'].tint }}
                               >
                                 • Recording...
                               </Text>
                             )}
                             {expandedQuestions.has(question.id) && (
                               <Text className="text-xs font-semibold opacity-50">
                                 • Tap to collapse
                               </Text>
                             )}
                           </View>
                         </View>
                         
                         {/* Bookmark button - available in both modes */}
                         <TouchableOpacity 
                           onPress={(e) => {
                             e.stopPropagation();
                             toggleBookmark(question.id);
                           }}
                           className="p-1"
                         >
                           <IconSymbol 
                             name={question.isBookmarked ? "bookmark.fill" : "bookmark"}
                             size={18} 
                             color={question.isBookmarked ? Colors[colorScheme ?? 'light'].tint : Colors[colorScheme ?? 'light'].tabIconDefault}
                           />
                         </TouchableOpacity>
                       </View>
                     </TouchableOpacity>
                   ))
                )}
              </ScrollView>
            </>
          )}
        </ThemedView>
      </View>

      {/* Reference Navigator Modal */}
      {showReferenceNavigator && (
        <View 
          className="absolute top-0 left-0 right-0 bottom-0 z-50"
          style={{ backgroundColor: Colors[colorScheme ?? 'light'].background }}
        >
          <ReferenceNavigator
            chapters={getChapterData()}
            sections={getSectionsData()}
            bookCode={bookCode}
            onReferenceSelect={handleReferenceNavigatorSelect}
            onClose={() => setShowReferenceNavigator(false)}
            currentReference={selectedReference}
            selectedSection={selectedSection}
          />
        </View>
      )}
    </SafeAreaView>
  );
} 