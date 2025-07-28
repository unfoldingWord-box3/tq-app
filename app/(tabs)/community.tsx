import { ParagraphAwareScriptureRenderer } from '@/components/ParagraphAwareScriptureRenderer';
import { ReferenceNavigator } from '@/components/ReferenceNavigator';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslationQuestions } from '@/hooks/useTranslationQuestions';
import { useUSFMScripture } from '@/hooks/useUSFMScripture';
import { getQuestionsForReference, getQuestionsForVerseRange } from '@/services/translationQuestionsService';
import { TranslationQuestion } from '@/types/translationQuestions';
import React, { useMemo, useState } from 'react';
import { Platform, SafeAreaView, ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';

// Add interface for range selection state
interface RangeSelection {
  isSelectingRange: boolean;
  startVerse: number | null;
  endVerse: number | null;
  chapter: number;
}

// Add interface for community checking session
interface CheckingSession {
  id: string;
  projectId: string;
  startTime: string;
  isActive: boolean;
  completedQuestions: string[];
}

export default function CommunityScreen() {
  const colorScheme = useColorScheme();
  // Navigation state
  const [selectedReference, setSelectedReference] = useState<string>('JON 1:2');
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
  const [audioProgress, setAudioProgress] = useState(0.3); // 30% progress for demo
  
  // Question expansion state
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  
  // Session management state
  const [checkingSession, setCheckingSession] = useState<CheckingSession | null>(null);
  
  // Load and process USFM content dynamically
  const { scripture, loading: scriptureLoading, error: scriptureError } = useUSFMScripture({
    bookCode: 'JON',
    enableSections: true
  });

  // Load translation questions
  const { questions: translationQuestionsData, loading: questionsLoading, error: questionsError } = useTranslationQuestions({
    bookCode: 'JON',
    enableGrouping: true
  });

  const [activeRecording, setActiveRecording] = useState<string | null>(null);
  
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
  const startCheckingSession = () => {
    const newSession: CheckingSession = {
      id: Date.now().toString(),
      projectId: 'jonah-project', // Will come from project selection later
      startTime: new Date().toISOString(),
      isActive: true,
      completedQuestions: []
    };
    setCheckingSession(newSession);
  };

  const endCheckingSession = () => {
    if (checkingSession) {
      // Save session data offline here
      console.log('Saving session:', checkingSession);
      setCheckingSession(null);
    }
  };
  
  // Always use paragraph renderer - no toggle needed

  // Handle scroll position for overflow indicators
  const handleScriptureScroll = (event: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const scrollY = contentOffset.y;
    const scrollViewHeight = layoutMeasurement.height;
    const contentHeight = contentSize.height;
    
    setScriptureScrollIndicator({
      showTop: scrollY > 20, // Show top indicator if scrolled down
      showBottom: scrollY < contentHeight - scrollViewHeight - 20 // Show bottom if not at bottom
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

  // Auto-select first section when sections become available
  React.useEffect(() => {
    if (dynamicSections.length > 0 && selectedReference === 'JON 1:2') {
      // Only auto-select if we're still on the default reference
      const firstSection = dynamicSections[0];
      console.log('🎯 Auto-selecting first section:', firstSection);
      handleSectionSelection(firstSection);
    }
  }, [dynamicSections.length, selectedReference]);
  
  // Generate clean range references from section data
  const getSectionRangeReference = (section: any) => {
    const startRef = section.startReference;
    const endRef = section.endReference;

    console.log({section})
    
    if (endRef) {
      // Has end reference, create range like "1:1-5"
      const startPart = startRef.replace('JON ', '');
      const endPart = endRef.replace('JON ', '');
      
      // Extract chapter and verse numbers
      const startMatch = startPart.match(/(\d+):(\d+)/);
      const endMatch = endPart.match(/(\d+):(\d+)/);
      
      if (startMatch && endMatch) {
        const startChapter = startMatch[1];
        const startVerse = startMatch[2];
        const endChapter = endMatch[1];
        const endVerse = endMatch[2];
        
        if (startChapter === endChapter) {
          // Same chapter range
          return `${startChapter}:${startVerse}-${endVerse}`;
        } else {
          // Cross-chapter range
          return `${startChapter}:${startVerse}-${endChapter}:${endVerse}`;
        }
      }
      
      return `${startPart}-${endPart.split(':')[1]}`; // fallback
    } else {
      // Open-ended section, just show start like "1:1+"
      return `${startRef.replace('JON ', '')}+`;
    }
  };

  // Helper function to create reference string from current selection
  const getCurrentReference = (): string => {
    if (rangeSelection.isSelectingRange && rangeSelection.startVerse && rangeSelection.endVerse) {
      return `JON ${rangeSelection.chapter}:${rangeSelection.startVerse}-${rangeSelection.endVerse}`;
    } else if (rangeSelection.isSelectingRange && rangeSelection.startVerse) {
      return `JON ${rangeSelection.chapter}:${rangeSelection.startVerse}`;
    }
    return selectedReference;
  };

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
        // First verse selection
        setRangeSelection(prev => ({
          ...prev,
          startVerse: verse.number,
          chapter: selectedChapter
        }));
      } else if (!rangeSelection.endVerse) {
        // Second verse selection - complete the range
        const start = Math.min(rangeSelection.startVerse, verse.number);
        const end = Math.max(rangeSelection.startVerse, verse.number);
        
        setRangeSelection(prev => ({
          ...prev,
          startVerse: start,
          endVerse: end
        }));
        
        // Update selected reference to the range
        const newRef = `JON ${selectedChapter}:${start}-${end}`;
        setSelectedReference(newRef);
      } else {
        // Reset and start new range
        setRangeSelection(prev => ({
          ...prev,
          startVerse: verse.number,
          endVerse: null
        }));
      }
    } else {
      // Normal single verse selection
      setSelectedReference(verse.reference);
    }
  };

  // Toggle range selection mode
  const toggleRangeMode = () => {
    if (rangeSelection.isSelectingRange) {
      // Exit range mode
      setRangeSelection({
        isSelectingRange: false,
        startVerse: null,
        endVerse: null,
        chapter: selectedChapter
      });
    } else {
      // Enter range mode
      setRangeSelection({
        isSelectingRange: true,
        startVerse: null,
        endVerse: null,
        chapter: selectedChapter
      });
    }
  };

  // Handle section selection - use full range
  const handleSectionSelection = (section: any) => {
    if (section.endReference) {
      // Create range reference from start to end
      const startRef = section.startReference.replace('JON ', '');
      const endRef = section.endReference.replace('JON ', '');
      
      const startMatch = startRef.match(/(\d+):(\d+)/);
      const endMatch = endRef.match(/(\d+):(\d+)/);
      
      if (startMatch && endMatch) {
        const startChapter = parseInt(startMatch[1]);
        const startVerse = parseInt(startMatch[2]);
        const endChapter = parseInt(endMatch[1]);
        const endVerse = parseInt(endMatch[2]);
        
        let rangeRef: string;
        if (startChapter === endChapter) {
          rangeRef = `JON ${startChapter}:${startVerse}-${endVerse}`;
        } else {
          rangeRef = `JON ${startChapter}:${startVerse}-${endChapter}:${endVerse}`;
        }
        
        setSelectedReference(rangeRef);
        setSelectedChapter(startChapter);
        
        // Update range selection state to reflect the section range
        setRangeSelection({
          isSelectingRange: false,
          startVerse: startVerse,
          endVerse: endVerse,
          chapter: startChapter
        });
      }
    } else {
      // Single verse section
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
  };

  // State for managing UI properties of questions (bookmarks, recordings, etc.)
  const [questionUIState, setQuestionUIState] = useState<Record<string, {
    isBookmarked: boolean;
    isRecorded: boolean;
  }>>({});

    // Prepare sections data for ReferenceNavigator (moved up to be available early)
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

  // Get currently selected section (using transformed sections data to match ReferenceNavigator types)
  const selectedSection = useMemo(() => {
    const sectionsData = getSectionsData();
    if (!sectionsData.length) return null;
    
    return sectionsData.find(section => {
      if (section.endReference) {
        // Range section - check if current reference matches section range
        let rangeRef: string;
        if (section.startChapter === section.endChapter) {
          rangeRef = `JON ${section.startChapter}:${section.startVerse}-${section.endVerse}`;
        } else {
          rangeRef = `JON ${section.startChapter}:${section.startVerse}-${section.endChapter}:${section.endVerse}`;
        }
        
        return selectedReference === rangeRef;
      } else {
        // Single verse section
        const singleRef = `JON ${section.startChapter}:${section.startVerse}`;
        return selectedReference === singleRef;
      }
    }) || null;
  }, [selectedReference, dynamicSections]);

  // Debug log selected section changes
  React.useEffect(() => {
    if (selectedSection) {
      console.log('📍 Selected section updated:', selectedSection.id, selectedReference);
    } else {
      console.log('📍 No section selected for reference:', selectedReference);
    }
  }, [selectedSection, selectedReference]);

  // Get questions for current reference/selection
  const currentQuestions = useMemo(() => {
    if (!translationQuestionsData) return [];

    let questions: TranslationQuestion[] = [];
    const currentRef = getCurrentReference();

    // Check if current reference is a range (e.g., "JON 1:1-1:2" or "JON 1:1-2:3")
    const rangeMatch = currentRef.match(/^([A-Z]+)\s+(\d+):(\d+)-(?:(\d+):)?(\d+)$/);
    
    if (rangeMatch) {
      // It's a range reference
      const [, bookCode, startChapter, startVerse, endChapter, endVerse] = rangeMatch;
      const startChapterNum = parseInt(startChapter);
      const startVerseNum = parseInt(startVerse);
      const endChapterNum = endChapter ? parseInt(endChapter) : startChapterNum;
      const endVerseNum = parseInt(endVerse);
      
      console.log(`📋 Processing range: ${bookCode} ${startChapterNum}:${startVerseNum}-${endChapterNum}:${endVerseNum}`);
      
      // Get questions for all verses in the range
      if (startChapterNum === endChapterNum) {
        // Same chapter range
        questions = getQuestionsForVerseRange(
          translationQuestionsData,
          bookCode,
          startChapterNum,
          startVerseNum,
          endVerseNum
        );
      } else {
        // Cross-chapter range - handle this case too
        for (let chapter = startChapterNum; chapter <= endChapterNum; chapter++) {
          const chapterStartVerse = chapter === startChapterNum ? startVerseNum : 1;
          const chapterEndVerse = chapter === endChapterNum ? endVerseNum : 999; // Large number for last verse
          
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
      
      console.log(`📋 Range questions found:`, questions.length);
    } else if (rangeSelection.isSelectingRange && rangeSelection.startVerse && rangeSelection.endVerse) {
      // Manual range selection mode
      questions = getQuestionsForVerseRange(
        translationQuestionsData,
        'JON',
        rangeSelection.chapter,
        rangeSelection.startVerse,
        rangeSelection.endVerse
      );
      console.log(`📋 Manual range questions found:`, questions.length);
    } else {
      // Single verse reference
      questions = getQuestionsForReference(translationQuestionsData, currentRef);
      console.log(`📋 Single verse questions found:`, questions.length);
    }

    // Merge with UI state
    return questions.map(q => ({
      ...q,
      isBookmarked: questionUIState[q.id]?.isBookmarked ?? false,
      isRecorded: questionUIState[q.id]?.isRecorded ?? false,
    }));
  }, [translationQuestionsData, selectedReference, rangeSelection, questionUIState]);

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

  const toggleRecording = (id: string) => {
    if (activeRecording === id) {
      // Stop recording
      setActiveRecording(null);
      setQuestionUIState(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          isBookmarked: prev[id]?.isBookmarked ?? false,
          isRecorded: true
        }
      }));
      
      // Mark question as completed in session
      if (checkingSession) {
        setCheckingSession(prev => prev ? {
          ...prev,
          completedQuestions: [...prev.completedQuestions, id]
        } : null);
      }
    } else {
      // Start recording
      setActiveRecording(id);
    }
  };

  const handleQuestionPress = (question: TranslationQuestion) => {
    // Toggle expansion instead of navigating
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
    
    // Extract verse info from selectedReference
    const match = selectedReference.match(/JON\s+(\d+):(\d+)(?:-(\d+))?/);
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
    
    // Update selectedChapter based on new reference
    const match = reference.match(/^([A-Z]+)\s+(\d+)/i);
    if (match) {
      setSelectedChapter(parseInt(match[2]));
    }
    
    // Reset range selection
    setRangeSelection({
      isSelectingRange: false,
      startVerse: null,
      endVerse: null,
      chapter: parseInt(match?.[2] || '1')
    });
    
    // Close dropdowns
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
      case 'collapsed': return 'expand.less'; // Show expand icon (to expand panel)
      case 'expanded': return 'fullscreen'; // Show fullscreen icon (to go fullscreen)
      case 'fullscreen': return 'expand.more'; // Show collapse icon (to exit fullscreen)
      default: return 'expand.more';
    }
  };

  

  return (
    <SafeAreaView 
      className="flex-1"
      style={{ 
        backgroundColor: Colors[colorScheme ?? 'light'].background,
        paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
      }}
    >
      {/* Collapsible Navigation */}
      <ThemedView className="border-b border-gray-200 relative">
        {/* Collapsed Header */}
        <TouchableOpacity 
          className="flex-row items-center justify-center gap-2 px-4 py-3.5 bg-gray-50"
          onPress={() => setShowReferenceNavigator(true)}
        >
          <ThemedText className="text-lg font-semibold">
            {getCurrentReference()}
          </ThemedText>
          <IconSymbol 
            name="chevron.down" 
            size={18} 
            color={Colors[colorScheme ?? 'light'].tabIconDefault}
            style={{
              transform: [{ rotate: !navigationCollapsed ? '90deg' : '0deg' }]
            }}
          />
        </TouchableOpacity>

        {/* Session Status */}
        {!checkingSession ? (
          <TouchableOpacity 
            className="px-4 py-2 bg-blue-50 border-b border-blue-200"
            onPress={startCheckingSession}
          >
            <View className="flex-row items-center justify-center gap-2">
                             <IconSymbol name="paperplane.fill" size={16} color={Colors[colorScheme ?? 'light'].tint} />
              <Text style={{ color: Colors[colorScheme ?? 'light'].tint }} className="font-semibold">
                Start Community Checking Session
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View className="px-4 py-2 bg-green-50 border-b border-green-200">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <IconSymbol name="mic.fill" size={16} color="#4CAF50" />
                <Text className="font-semibold text-green-700">
                  Session Active • {checkingSession.completedQuestions.length} completed
                </Text>
              </View>
              <TouchableOpacity 
                className="px-3 py-1 bg-green-600 rounded-full"
                onPress={endCheckingSession}
              >
                <Text className="text-white text-xs font-semibold">End Session</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Expanded Navigation */}
        {!navigationCollapsed && (
          <View className="px-4 py-3">
            {/* Chapter Navigation */}
            <View className="flex-row items-center py-2 px-4 border-b border-gray-100">
              <ThemedText className="text-sm font-semibold mr-3 min-w-16">Chapter:</ThemedText>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                className="flex-1 max-h-10"
                contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 4 }}
              >
                {scripture?.chapters.map((chapter) => (
                  <TouchableOpacity
                    key={chapter.number}
                    className="p-2"
                    style={{
                      backgroundColor: selectedChapter === chapter.number ? Colors[colorScheme ?? 'light'].tint : 'transparent'
                    }}
                    onPress={() => {
                      setSelectedChapter(chapter.number);
                      // Reset to first verse when changing chapters
                      if (chapter.verses.length > 0) {
                        const firstVerse = chapter.verses[0];
                        setSelectedReference(`${scripture.bookCode} ${chapter.number}:${firstVerse.number}`);
                        // Reset range selection
                        setRangeSelection({
                          isSelectingRange: false,
                          startVerse: null,
                          endVerse: null,
                          chapter: chapter.number
                        });
                      }
                    }}
                  >
                    <Text 
                      className="text-sm font-medium"
                      style={{
                        color: selectedChapter === chapter.number ? 'white' : Colors[colorScheme ?? 'light'].text
                      }}
                    >
                      {chapter.number}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Verse Navigation with Range Support */}
            <View className="py-2 px-4 border-b border-gray-100">
              <View className="flex-row justify-between items-center mb-2">
                <ThemedText className="text-sm font-semibold">
                  Verse: {getSelectionDisplayText()}
                </ThemedText>
                <TouchableOpacity 
                  className="flex-row items-center px-2 py-1 rounded gap-1"
                  style={{
                    backgroundColor: rangeSelection.isSelectingRange ? Colors[colorScheme ?? 'light'].tint : 'rgba(0,0,0,0.1)'
                  }}
                  onPress={toggleRangeMode}
                >
                  <IconSymbol 
                    name="plus" 
                    size={14} 
                    color={rangeSelection.isSelectingRange ? "white" : Colors[colorScheme ?? 'light'].tabIconDefault}
                  />
                  <Text 
                    className="text-xs font-semibold"
                    style={{
                      color: rangeSelection.isSelectingRange ? 'white' : '#666'
                    }}
                  >
                    {rangeSelection.isSelectingRange ? 'Range' : 'Single'}
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                className="flex-1 max-h-10"
                contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 4 }}
              >
                {scripture?.chapters
                  .find(ch => ch.number === selectedChapter)
                  ?.verses.map((verse) => {
                    const isSelected = isVerseSelected(verse);
                    const isRangeStart = rangeSelection.isSelectingRange && rangeSelection.startVerse === verse.number;
                    const isRangeEnd = rangeSelection.isSelectingRange && rangeSelection.endVerse === verse.number;
                    const isRangeMiddle = rangeSelection.isSelectingRange && 
                                         rangeSelection.startVerse && 
                                         rangeSelection.endVerse && 
                                         verse.number > rangeSelection.startVerse && 
                                         verse.number < rangeSelection.endVerse;
                    
                    return (
                      <TouchableOpacity
                        key={verse.number}
                        className="p-2"
                        style={{
                          backgroundColor: isSelected || isRangeStart || isRangeEnd 
                            ? Colors[colorScheme ?? 'light'].tint 
                            : isRangeMiddle 
                              ? 'rgba(0, 122, 255, 0.3)' 
                              : 'transparent',
                          borderTopRightRadius: isRangeStart && !isRangeEnd ? 0 : undefined,
                          borderBottomRightRadius: isRangeStart && !isRangeEnd ? 0 : undefined,
                          borderTopLeftRadius: isRangeEnd && !isRangeStart ? 0 : undefined,
                          borderBottomLeftRadius: isRangeEnd && !isRangeStart ? 0 : undefined,
                          borderRadius: isRangeMiddle ? 0 : undefined,
                        }}
                        onPress={() => handleVerseSelection(verse)}
                      >
                        <Text 
                          className="text-sm font-medium"
                          style={{
                            color: isSelected || isRangeStart || isRangeEnd ? 'white' : Colors[colorScheme ?? 'light'].text
                          }}
                        >
                          {verse.number}
                        </Text>
                      </TouchableOpacity>
                                         );
                   })}
                </ScrollView>
            </View>

            {/* Sections Dropdown */}
            <View className="px-4 py-2 relative">
              <TouchableOpacity 
                className="flex-row items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                onPress={() => setShowSectionsDropdown(!showSectionsDropdown)}
              >
                <ThemedText className="text-sm font-semibold">
                  Sections ({dynamicSections.length})
                </ThemedText>
                <IconSymbol 
                  name="chevron.right" 
                  size={16} 
                  color={Colors[colorScheme ?? 'light'].tabIconDefault} 
                />
              </TouchableOpacity>
              
              {showSectionsDropdown && (
                <View 
                  className="max-h-96 rounded-lg border border-gray-200 mt-2"
                  style={{ backgroundColor: Colors[colorScheme ?? 'light'].background }}
                >
                  <ScrollView className="max-h-48" showsVerticalScrollIndicator={true}>
                                          {dynamicSections.map((section: any) => {
                        const isActive = selectedReference.includes(section.startReference.replace('JON ', ''));
                        return (
                          <TouchableOpacity
                            key={section.id}
                            className="flex-row items-center justify-between px-3 py-3 mb-2 rounded-lg border"
                            style={{
                              backgroundColor: isActive ? 'rgba(0, 122, 255, 0.1)' : 'rgba(0,0,0,0.03)',
                              borderColor: isActive ? Colors[colorScheme ?? 'light'].tint : 'rgba(0,0,0,0.1)',
                            }}
                            onPress={() => handleSectionSelection(section)}
                          >
                            <View className="flex-1">
                              <Text 
                                className="text-sm font-semibold"
                                style={{
                                  color: isActive ? Colors[colorScheme ?? 'light'].tint : '#333'
                                }}
                              >
                                {getSectionRangeReference(section)}
                              </Text>
                              <Text 
                                className="text-xs mt-0.5"
                                style={{
                                  color: isActive ? Colors[colorScheme ?? 'light'].tint : '#666'
                                }}
                              >
                                {section.endReference ? `${section.startReference} to ${section.endReference}` : section.startReference}
                              </Text>
                            </View>
                            {isActive && (
                              <IconSymbol 
                                name="info.circle.fill" 
                                size={16} 
                                color={Colors[colorScheme ?? 'light'].tint}
                              />
                            )}
                          </TouchableOpacity>
                                                 );
                       })}
                   </ScrollView>
                </View>
              )}
            </View>
          </View>
        )}
      </ThemedView>

      {/* Split Layout */}
      <View className="flex-1">
        {/* TOP PANEL - Bible Text */}
        {communityPanelMode !== 'fullscreen' && (
          <ThemedView className={`flex-1 border-b-2 border-gray-200 relative ${
            communityPanelMode === 'collapsed' ? 'flex-[3]' : ''
          }`}>
            {/* Scripture Scroll Indicators */}
            {scriptureScrollIndicator.showTop && (
              <View className="absolute top-0 left-0 right-0 h-1 z-20 pointer-events-none">
                <View 
                  className="h-full"
                  style={{ backgroundColor: Colors[colorScheme ?? 'light'].tint }}
                />
              </View>
            )}
            {scriptureScrollIndicator.showBottom && (
              <View className="absolute bottom-12 left-0 right-0 h-1 z-20 pointer-events-none">
                <View 
                  className="h-full"
                  style={{ backgroundColor: Colors[colorScheme ?? 'light'].tint }}
                />
              </View>
            )}
            
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

            {/* Audio Player Bar */}
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
                                     <IconSymbol 
                     name={isPlaying ? "fullscreen" : "paperplane.fill"} 
                     size={14} 
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
                {currentQuestions.filter(q => q.isRecorded).length}/{currentQuestions.length}
              </Text>
            </View>
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
          
                    {communityPanelMode !== 'collapsed' && (
            <>
              {/* Questions Scroll Indicators */}
              {questionsScrollIndicator.showTop && (
                <View className="absolute top-16 left-0 right-0 h-1 z-20 pointer-events-none">
                  <View 
                    className="h-full"
                    style={{ backgroundColor: Colors[colorScheme ?? 'light'].tint }}
                  />
                </View>
              )}
              {questionsScrollIndicator.showBottom && (
                <View className="absolute bottom-0 left-0 right-0 h-1 z-20 pointer-events-none">
                  <View 
                    className="h-full"
                    style={{ backgroundColor: Colors[colorScheme ?? 'light'].tint }}
                  />
                </View>
              )}
              
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
                    borderColor: activeRecording === question.id 
                      ? Colors[colorScheme ?? 'light'].tint 
                      : Colors[colorScheme ?? 'light'].tabIconDefault,
                    backgroundColor: activeRecording === question.id 
                      ? `${Colors[colorScheme ?? 'light'].tint}20` 
                      : 'rgba(0,0,0,0.02)'
                  }}
                  onPress={() => handleQuestionPress(question)}
                >
                  <View className="flex-row items-start gap-3">
                                     <TouchableOpacity 
                     className="w-9 h-9 rounded-full justify-center items-center relative"
                     style={{
                       backgroundColor: activeRecording === question.id 
                         ? Colors[colorScheme ?? 'light'].tint 
                         : question.isRecorded 
                           ? '#4CAF50' 
                           : Colors[colorScheme ?? 'light'].tabIconDefault 
                     }}
                     onPress={(e) => {
                       e.stopPropagation();
                       toggleRecording(question.id);
                     }}
                   >
                     <IconSymbol 
                       name="mic.fill" 
                       size={16} 
                       color="white"
                     />
                     {activeRecording === question.id && (
                       <View className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
                     )}
                   </TouchableOpacity>
                   
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
                         <Text className="text-xs font-semibold mb-2 opacity-70">SUGGESTED ANSWER:</Text>
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
                         JON {question.reference}
                       </Text>
                       {question.isRecorded && (
                         <Text className="text-xs font-semibold text-green-500">
                           • Recorded
                         </Text>
                       )}
                       {activeRecording === question.id && (
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
            bookCode="JON"
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

 