import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { IconSymbol } from './ui/IconSymbol';

interface Chapter {
  number: number;
  verseCount: number;
}

interface Section {
  id: string;
  startReference: string;
  endReference?: string;
  startChapter: number;
  startVerse: number;
  endChapter?: number;
  endVerse?: number;
}

interface ReferenceNavigatorProps {
  chapters: Chapter[];
  sections?: Section[];
  bookCode: string;
  onReferenceSelect: (reference: string) => void;
  onClose: () => void;
  currentReference?: string;
  selectedSection?: Section | null;
}

export const ReferenceNavigator: React.FC<ReferenceNavigatorProps> = ({
  chapters,
  sections = [],
  bookCode,
  onReferenceSelect,
  onClose,
  currentReference,
  selectedSection
}) => {
  const colorScheme = useColorScheme();

  const [selectedStartVerse, setSelectedStartVerse] = useState<number | null>(null);
  const [selectedEndVerse, setSelectedEndVerse] = useState<number | null>(null);
  const [selectedStartChapter, setSelectedStartChapter] = useState<number | null>(null);
  const [selectedEndChapter, setSelectedEndChapter] = useState<number | null>(null);
  const [showSectionsDropdown, setShowSectionsDropdown] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());

  // Use the passed selectedSection directly
  const currentSection = selectedSection;

  // Initialize selection state based on currentReference
  React.useEffect(() => {
    if (currentReference) {
      console.log('🎯 Initializing ReferenceNavigator with:', currentReference);
      
      // Parse the current reference to set selection state
      const rangeMatch = currentReference.match(/^([A-Z]+)\s+(\d+):(\d+)(?:-(?:(\d+):)?(\d+))?$/);
      if (rangeMatch) {
        const [, , startChapter, startVerse, endChapter, endVerse] = rangeMatch;
        const startChapterNum = parseInt(startChapter);
        const startVerseNum = parseInt(startVerse);
        
        if (endVerse) {
          // Range selection
          const endChapterNum = endChapter ? parseInt(endChapter) : startChapterNum;
          const endVerseNum = parseInt(endVerse);
          
          setSelectedStartChapter(startChapterNum);
          setSelectedStartVerse(startVerseNum);
          setSelectedEndChapter(endChapterNum);
          setSelectedEndVerse(endVerseNum);
          
          // Expand all chapters in the range
          const chaptersToExpand = new Set<number>();
          for (let ch = startChapterNum; ch <= endChapterNum; ch++) {
            chaptersToExpand.add(ch);
          }
          setExpandedChapters(chaptersToExpand);
          
          console.log(`📖 Initialized range: ${startChapterNum}:${startVerseNum}-${endChapterNum}:${endVerseNum}`);
        } else {
          // Single verse selection
          setSelectedStartChapter(startChapterNum);
          setSelectedStartVerse(startVerseNum);
          setSelectedEndChapter(null);
          setSelectedEndVerse(null);
          
          // Expand the chapter containing the verse
          setExpandedChapters(new Set([startChapterNum]));
          
          console.log(`📖 Initialized single verse: ${startChapterNum}:${startVerseNum}`);
        }
      }
    }
  }, [currentReference]);

  // Get the current section index for display
  const getCurrentSectionIndex = (): number | null => {
    if (!currentSection) return null;
    return sections.findIndex(section => section.id === currentSection.id) + 1;
  };

  // Get verses for selected chapter
  const getVersesForChapter = (chapterNumber: number): number[] => {
    const chapter = chapters.find(ch => ch.number === chapterNumber);
    if (!chapter) return [];
    return Array.from({ length: chapter.verseCount }, (_, i) => i + 1);
  };

  // Handle chapter accordion toggle
  const toggleChapter = (chapterNumber: number) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterNumber)) {
      newExpanded.delete(chapterNumber);
    } else {
      newExpanded.add(chapterNumber);
    }
    setExpandedChapters(newExpanded);
  };

  // Handle verse selection (now supports cross-chapter ranges)
  const handleVerseSelect = (verseNumber: number, chapterNumber: number) => {
    if (!selectedStartVerse || !selectedStartChapter) {
      // No verse selected - select this verse
      setSelectedStartVerse(verseNumber);
      setSelectedStartChapter(chapterNumber);
      setSelectedEndVerse(null);
      setSelectedEndChapter(null);
    } else if (selectedStartVerse === verseNumber && selectedStartChapter === chapterNumber && !selectedEndVerse) {
      // Single verse selected and user tapped it again - deselect
      setSelectedStartVerse(null);
      setSelectedStartChapter(null);
      setSelectedEndVerse(null);
      setSelectedEndChapter(null);
    } else if (selectedEndVerse && isVerseSelected(verseNumber, chapterNumber)) {
      // Range selected and user tapped a verse in the range - clear selection
      setSelectedStartVerse(null);
      setSelectedStartChapter(null);
      setSelectedEndVerse(null);
      setSelectedEndChapter(null);
    } else {
      // Create or modify range (can span chapters)
      const startPos = selectedStartChapter * 1000 + selectedStartVerse;
      const newPos = chapterNumber * 1000 + verseNumber;
      
      if (startPos <= newPos) {
        // Forward range
        setSelectedEndVerse(verseNumber);
        setSelectedEndChapter(chapterNumber);
      } else {
        // Backward range - swap start and end
        setSelectedStartVerse(verseNumber);
        setSelectedStartChapter(chapterNumber);
        setSelectedEndVerse(selectedStartVerse);
        setSelectedEndChapter(selectedStartChapter);
      }
    }
  };

  // Generate reference string
  const getSelectedReference = (): string => {
    if (!selectedStartChapter || !selectedStartVerse) return '';
    
    if (selectedEndVerse && selectedEndChapter) {
      if (selectedStartChapter === selectedEndChapter) {
        // Same chapter range
        return `${bookCode} ${selectedStartChapter}:${selectedStartVerse}-${selectedEndVerse}`;
      } else {
        // Cross-chapter range
        return `${bookCode} ${selectedStartChapter}:${selectedStartVerse}-${selectedEndChapter}:${selectedEndVerse}`;
      }
    } else {
      // Single verse
      return `${bookCode} ${selectedStartChapter}:${selectedStartVerse}`;
    }
  };

  // Check if verse is in selection range
  const isVerseSelected = (verseNumber: number, chapterNumber: number): boolean => {
    if (!selectedStartVerse || !selectedStartChapter) return false;
    
    if (selectedEndVerse && selectedEndChapter) {
      const startPos = selectedStartChapter * 1000 + selectedStartVerse;
      const endPos = selectedEndChapter * 1000 + selectedEndVerse;
      const currentPos = chapterNumber * 1000 + verseNumber;
      return currentPos >= startPos && currentPos <= endPos;
    } else {
      return verseNumber === selectedStartVerse && chapterNumber === selectedStartChapter;
    }
  };

  // Clear all selections
  const clearSelections = () => {
    setSelectedStartVerse(null);
    setSelectedEndVerse(null);
    setSelectedStartChapter(null);
    setSelectedEndChapter(null);
  };

  // Navigate to selected reference
  const navigateToReference = () => {
    const reference = getSelectedReference();
    if (reference) {
      onReferenceSelect(reference);
      onClose();
    }
  };

  // Handle section selection
  const handleSectionSelect = (section: Section) => {
    if (section.endReference) {
      // Range section - use consistent format with community component
      let reference: string;
      if (section.startChapter === section.endChapter) {
        // Same chapter range: "JON 1:3-4"
        reference = `${bookCode} ${section.startChapter}:${section.startVerse}-${section.endVerse}`;
      } else {
        // Cross-chapter range: "JON 1:3-2:4"  
        reference = `${bookCode} ${section.startChapter}:${section.startVerse}-${section.endChapter}:${section.endVerse}`;
      }
      console.log(`🎯 ReferenceNavigator selecting section:`, section.id, `->`, reference);
      onReferenceSelect(reference);
    } else {
      // Single verse section
      const reference = `${bookCode} ${section.startChapter}:${section.startVerse}`;
      onReferenceSelect(reference);
    }
    onClose();
  };

  // Generate section display reference
  const getSectionDisplayReference = (section: Section): string => {
    if (section.endReference) {
      if (section.startChapter === section.endChapter) {
        return `${section.startChapter}:${section.startVerse}-${section.endVerse}`;
      } else {
        return `${section.startChapter}:${section.startVerse}-${section.endChapter}:${section.endVerse}`;
      }
    } else {
      return `${section.startChapter}:${section.startVerse}`;
    }
  };

  return (
    <ThemedView className="flex-1 pt-5" style={{ backgroundColor: Colors[colorScheme ?? 'light'].background }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center flex-1">
          <ThemedText className="text-lg font-semibold">
            {bookCode}
          </ThemedText>
        </View>
        <TouchableOpacity onPress={onClose} className="p-1" style={{ transform: [{ rotate: '45deg' }] }}>
          <IconSymbol name="plus" size={20} color={Colors[colorScheme ?? 'light'].text} />
        </TouchableOpacity>
      </View>

                                      {/* Quick Sections */}
        {sections.length > 0 && (
          <View className="px-4 pt-3 border-b border-gray-200">
            <TouchableOpacity 
              className="flex-row items-center justify-between py-3 px-4 bg-gray-50 rounded-lg mb-3"
              onPress={() => setShowSectionsDropdown(!showSectionsDropdown)}
            >
              <View className="flex-row items-center gap-2">
                {currentSection ? (
                  <>
                    <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: Colors[colorScheme ?? 'light'].tint }}>
                      <Text className="text-xs font-bold text-white">
                        {getCurrentSectionIndex()}
                      </Text>
                    </View>
                    <Text className="text-base font-medium flex-1" style={{ color: Colors[colorScheme ?? 'light'].text }}>
                      {getSectionDisplayReference(currentSection)}
                    </Text>
                    <View className="flex-row items-center gap-0.5 ml-auto mr-2">
                      <View className="w-1 h-1 rounded-full" style={{ backgroundColor: Colors[colorScheme ?? 'light'].tint }} />
                      <View className="w-2 h-0.5" style={{ backgroundColor: Colors[colorScheme ?? 'light'].tint }} />
                      <View className="w-1 h-1 rounded-full" style={{ backgroundColor: Colors[colorScheme ?? 'light'].tint }} />
                    </View>
                  </>
                ) : (
                  <>
                    <View className="flex-row items-center gap-0.5">
                      <View className="w-1 h-1 rounded-full bg-blue-500" />
                      <View className="w-2 h-0.5 bg-blue-500" />
                      <View className="w-1 h-1 rounded-full bg-blue-500" />
                    </View>
                    <View className="flex-col gap-0.5 items-end">
                      <View className="h-0.5 rounded-sm" style={{ backgroundColor: Colors[colorScheme ?? 'light'].tint, width: 12 }} />
                      <View className="h-0.5 rounded-sm" style={{ backgroundColor: Colors[colorScheme ?? 'light'].tint, width: 16 }} />
                      <View className="h-0.5 rounded-sm" style={{ backgroundColor: Colors[colorScheme ?? 'light'].tint, width: 10 }} />
                    </View>
                  </>
                )}
              </View>
              <IconSymbol 
                name="chevron.right" 
                size={16} 
                color={Colors[colorScheme ?? 'light'].tabIconDefault}
                style={{
                  transform: [{ rotate: showSectionsDropdown ? '90deg' : '0deg' }]
                }}
              />
            </TouchableOpacity>
           
           {showSectionsDropdown && (
             <View className="mb-3 rounded-lg border border-gray-200 overflow-hidden" style={{ backgroundColor: Colors[colorScheme ?? 'light'].background }}>
               <ScrollView className="max-h-50" showsVerticalScrollIndicator={true}>
                                                    {sections.map((section, index) => {
                   const isCurrentSection = currentSection?.id === section.id;
                   return (
                     <TouchableOpacity
                       key={section.id}
                       className={`flex-row items-center justify-between px-4 py-3.5 border-b border-gray-100 ${
                         isCurrentSection ? 'bg-blue-50' : ''
                       }`}
                       style={{
                         borderColor: isCurrentSection ? Colors[colorScheme ?? 'light'].tint : Colors[colorScheme ?? 'light'].tabIconDefault
                       }}
                       onPress={() => handleSectionSelect(section)}
                     >
                       <View className="flex-row items-center gap-3 flex-1">
                         <View 
                           className="w-6 h-6 rounded-full items-center justify-center"
                           style={{ backgroundColor: isCurrentSection ? Colors[colorScheme ?? 'light'].tint : '#007AFF' }}
                         >
                           <Text className="text-xs font-bold text-white">
                             {index + 1}
                           </Text>
                         </View>
                         <Text 
                           className="text-base font-medium flex-1"
                           style={{ color: isCurrentSection ? Colors[colorScheme ?? 'light'].tint : Colors[colorScheme ?? 'light'].text }}
                         >
                           {getSectionDisplayReference(section)}
                         </Text>
                         <View className="flex-row items-center gap-0.5 ml-auto mr-2">
                           <View 
                             className="w-1 h-1 rounded-full" 
                             style={{ backgroundColor: isCurrentSection ? 'white' : Colors[colorScheme ?? 'light'].tint }}
                           />
                           <View 
                             className="w-2 h-0.5" 
                             style={{ backgroundColor: isCurrentSection ? 'white' : Colors[colorScheme ?? 'light'].tint }}
                           />
                           <View 
                             className="w-1 h-1 rounded-full" 
                             style={{ backgroundColor: isCurrentSection ? 'white' : Colors[colorScheme ?? 'light'].tint }}
                           />
                         </View>
                       </View>
                       <IconSymbol 
                         name="chevron.right" 
                         size={12} 
                         color={Colors[colorScheme ?? 'light'].tabIconDefault}
                       />
                     </TouchableOpacity>
                   );
                 })}
                </ScrollView>
              </View>
            )}
          </View>
        )}

               {/* Controls Bar */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
          <View className="flex-1" />
          <TouchableOpacity
            className={`px-4 py-2 rounded-2xl min-w-12 items-center justify-center ${
              !getSelectedReference() ? 'opacity-50' : ''
            }`}
            style={{
              backgroundColor: getSelectedReference() 
                ? Colors[colorScheme ?? 'light'].tint 
                : 'rgba(0,0,0,0.1)'
            }}
            onPress={getSelectedReference() ? navigateToReference : undefined}
            disabled={!getSelectedReference()}
          >
            <IconSymbol 
              name="chevron.right" 
              size={18} 
              color={getSelectedReference() ? "white" : Colors[colorScheme ?? 'light'].tabIconDefault}
            />
          </TouchableOpacity>
        </View>

        {/* Chapter Accordion */}
        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={true}>
          {chapters.map((chapter) => (
            <View key={chapter.number} className="mt-4">
              {/* Chapter Header */}
              <TouchableOpacity
                className="flex-row items-center justify-between px-4 py-2.5 border rounded-lg bg-gray-50"
                style={{
                  backgroundColor: Colors[colorScheme ?? 'light'].background,
                  borderColor: Colors[colorScheme ?? 'light'].tabIconDefault
                }}
                onPress={() => toggleChapter(chapter.number)}
              >
                <View className="flex-1 flex-row items-center justify-between">
                  <Text className="text-base font-semibold" style={{ color: Colors[colorScheme ?? 'light'].text }}>
                    {bookCode} {chapter.number}
                  </Text>
                  <Text className="text-xs font-medium" style={{ color: Colors[colorScheme ?? 'light'].tabIconDefault }}>
                    {chapter.verseCount}
                  </Text>
                </View>
                <IconSymbol 
                  name="chevron.right" 
                  size={16} 
                  color={Colors[colorScheme ?? 'light'].tabIconDefault}
                  style={{
                    transform: [{ rotate: expandedChapters.has(chapter.number) ? '90deg' : '0deg' }]
                  }}
                />
              </TouchableOpacity>

              {/* Verses Grid (when expanded) */}
              {expandedChapters.has(chapter.number) && (
                <View className="px-4 pt-4">
                  <View className="flex-row flex-wrap gap-2
">
                    {getVersesForChapter(chapter.number).map((verse) => (
                      <TouchableOpacity
                        key={verse}
                        className="w-[18%] border-2 rounded-lg items-center justify-center min-h-10"
                        style={{
                          backgroundColor: isVerseSelected(verse, chapter.number) 
                            ? Colors[colorScheme ?? 'light'].tint 
                            : 'transparent',
                          borderColor: isVerseSelected(verse, chapter.number) 
                            ? Colors[colorScheme ?? 'light'].tint 
                            : Colors[colorScheme ?? 'light'].tabIconDefault
                        }}
                        onPress={() => handleVerseSelect(verse, chapter.number)}
                      >
                        <Text 
                          className="text-sm font-semibold"
                          style={{ 
                            color: isVerseSelected(verse, chapter.number) 
                              ? 'white' 
                              : Colors[colorScheme ?? 'light'].text 
                          }}
                        >
                          {verse}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
    </ThemedView>
  );
 };  