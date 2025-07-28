import { ConnectivityIndicator } from '@/components/ui/ConnectivityIndicator';
import { IconButton } from '@/components/ui/IconButton';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { AppColors, getStateColor } from '@/constants/AppColors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { databaseService, ResourceRecord } from '@/services/databaseService';
import { Door43Resource } from '@/services/door43ServiceDCS';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ResourceSelectionScreen } from './ResourceSelectionScreen';

// Bible books with their 3-letter codes
const BIBLE_BOOKS = [
  // Old Testament
  { code: 'GEN', name: 'Genesis' }, { code: 'EXO', name: 'Exodus' }, { code: 'LEV', name: 'Leviticus' },
  { code: 'NUM', name: 'Numbers' }, { code: 'DEU', name: 'Deuteronomy' }, { code: 'JOS', name: 'Joshua' },
  { code: 'JDG', name: 'Judges' }, { code: 'RUT', name: 'Ruth' }, { code: '1SA', name: '1 Samuel' },
  { code: '2SA', name: '2 Samuel' }, { code: '1KI', name: '1 Kings' }, { code: '2KI', name: '2 Kings' },
  { code: '1CH', name: '1 Chronicles' }, { code: '2CH', name: '2 Chronicles' }, { code: 'EZR', name: 'Ezra' },
  { code: 'NEH', name: 'Nehemiah' }, { code: 'EST', name: 'Esther' }, { code: 'JOB', name: 'Job' },
  { code: 'PSA', name: 'Psalms' }, { code: 'PRO', name: 'Proverbs' }, { code: 'ECC', name: 'Ecclesiastes' },
  { code: 'SNG', name: 'Song of Songs' }, { code: 'ISA', name: 'Isaiah' }, { code: 'JER', name: 'Jeremiah' },
  { code: 'LAM', name: 'Lamentations' }, { code: 'EZK', name: 'Ezekiel' }, { code: 'DAN', name: 'Daniel' },
  { code: 'HOS', name: 'Hosea' }, { code: 'JOL', name: 'Joel' }, { code: 'AMO', name: 'Amos' },
  { code: 'OBA', name: 'Obadiah' }, { code: 'JON', name: 'Jonah' }, { code: 'MIC', name: 'Micah' },
  { code: 'NAM', name: 'Nahum' }, { code: 'HAB', name: 'Habakkuk' }, { code: 'ZEP', name: 'Zephaniah' },
  { code: 'HAG', name: 'Haggai' }, { code: 'ZEC', name: 'Zechariah' }, { code: 'MAL', name: 'Malachi' },
  
  // New Testament  
  { code: 'MAT', name: 'Matthew' }, { code: 'MRK', name: 'Mark' }, { code: 'LUK', name: 'Luke' },
  { code: 'JHN', name: 'John' }, { code: 'ACT', name: 'Acts' }, { code: 'ROM', name: 'Romans' },
  { code: '1CO', name: '1 Corinthians' }, { code: '2CO', name: '2 Corinthians' }, { code: 'GAL', name: 'Galatians' },
  { code: 'EPH', name: 'Ephesians' }, { code: 'PHP', name: 'Philippians' }, { code: 'COL', name: 'Colossians' },
  { code: '1TH', name: '1 Thessalonians' }, { code: '2TH', name: '2 Thessalonians' }, { code: '1TI', name: '1 Timothy' },
  { code: '2TI', name: '2 Timothy' }, { code: 'TIT', name: 'Titus' }, { code: 'PHM', name: 'Philemon' },
  { code: 'HEB', name: 'Hebrews' }, { code: 'JAS', name: 'James' }, { code: '1PE', name: '1 Peter' },
  { code: '2PE', name: '2 Peter' }, { code: '1JN', name: '1 John' }, { code: '2JN', name: '2 John' },
  { code: '3JN', name: '3 John' }, { code: 'JUD', name: 'Jude' }, { code: 'REV', name: 'Revelation' }
];

interface ProjectSetupScreenProps {
  onProjectCreated: (projectId: string) => void;
  onBack?: () => void;
}

interface ResourceSelection {
  scripture?: Door43Resource | ResourceRecord | string;
  questions?: Door43Resource | ResourceRecord | string;
  book?: string;
}

type ViewMode = 'setup' | 'resource-selection';
type ResourceSelectionType = 'scripture' | 'questions';

export function ProjectSetupScreen({ onProjectCreated, onBack }: ProjectSetupScreenProps) {
  const colorScheme = useColorScheme();
  const [viewMode, setViewMode] = useState<ViewMode>('setup');
  const [currentResourceType, setCurrentResourceType] = useState<ResourceSelectionType>('scripture');
  const [selection, setSelection] = useState<ResourceSelection>({});
  const [step, setStep] = useState<'scripture' | 'questions' | 'book'>('scripture');
  const [isCreating, setIsCreating] = useState(false);

  const handleResourceSelectionPress = async (type: ResourceSelectionType) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentResourceType(type);
    setViewMode('resource-selection');
  };

  const handleResourceSelected = async (resource: Door43Resource | ResourceRecord | string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (currentResourceType === 'scripture') {
      setSelection(prev => ({ ...prev, scripture: resource }));
      setStep('questions');
    } else {
      setSelection(prev => ({ ...prev, questions: resource }));
      setStep('book');
    }
    
    setViewMode('setup');
  };

  const handleResourceSelectionBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewMode('setup');
  };

  const handleBookSelect = async (bookCode: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelection(prev => ({ ...prev, book: bookCode }));
  };

  const getResourceId = (resource: Door43Resource | ResourceRecord | string): string => {
    if (typeof resource === 'string') {
      // File path - generate a unique ID
      return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return resource.id;
  };

  const getResourceName = (resource: Door43Resource | ResourceRecord | string): string => {
    if (typeof resource === 'string') {
      // Extract filename from path
      return resource.split('/').pop() || 'Local File';
    }
    return resource.name;
  };

  const handleCreateProject = async () => {
    if (!selection.scripture || !selection.questions || !selection.book) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      setIsCreating(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Generate project ID
      const projectId = `project_${Date.now()}`;
      
      // Ensure resources are saved to database first (for foreign key constraints)
      await ensureResourcesInDatabase();
      
      // Create project in database
      await databaseService.createProject(
        projectId,
        selection.book,
        getResourceId(selection.scripture),
        getResourceId(selection.questions)
      );

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onProjectCreated(projectId);
    } catch (error) {
      console.error('Failed to create project:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('⚠️', 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const ensureResourcesInDatabase = async () => {
    // Save scripture resource if it's a Door43Resource object
    if (selection.scripture && typeof selection.scripture === 'object' && 'zipball_url' in selection.scripture) {
      try {
        await databaseService.saveResourceMetadata(selection.scripture);
      } catch (error) {
        console.log('Scripture resource already exists in database');
      }
    }

    // Save questions resource if it's a Door43Resource object
    if (selection.questions && typeof selection.questions === 'object' && 'zipball_url' in selection.questions) {
      try {
        await databaseService.saveResourceMetadata(selection.questions);
      } catch (error) {
        console.log('Questions resource already exists in database');
      }
    }
  };

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (step === 'questions') {
      setStep('scripture');
    } else if (step === 'book') {
      setStep('questions');
    } else if (onBack) {
      onBack();
    }
  };

  const getStepProgress = () => {
    switch (step) {
      case 'scripture': return 0.33;
      case 'questions': return 0.66;
      case 'book': return 1.0;
      default: return 0;
    }
  };

  const canProceed = () => {
    return selection.scripture && selection.questions && selection.book;
  };

  // Handle resource selection view
  if (viewMode === 'resource-selection') {
    return (
      <ResourceSelectionScreen
        resourceType={currentResourceType}
        onResourceSelected={handleResourceSelected}
        onBack={handleResourceSelectionBack}
      />
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
          onPress={handleBack}
          accessibilityLabel="Back"
        />
        
        <View style={{ alignItems: 'center' }}>
          <ProgressRing 
            progress={getStepProgress()} 
            size={32} 
            strokeWidth={3}
            color={getStateColor('active')}
          >
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: getStateColor('active') }}>
              {step === 'scripture' ? '1' : step === 'questions' ? '2' : '3'}
            </Text>
          </ProgressRing>
          <ConnectivityIndicator 
            compact={true} 
            style={{ marginTop: 8 }} 
          />
        </View>

        <IconButton
          icon="checkmark.circle.fill"
          state={canProceed() ? 'complete' : 'inactive'}
          onPress={handleCreateProject}
          disabled={!canProceed() || isCreating}
          accessibilityLabel="Create Project"
        />
      </View>

      {/* Content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {step === 'scripture' && (
          <View>
            <View style={{ marginBottom: 24, alignItems: 'center' }}>
              <IconSymbol name="book.fill" size={32} color={getStateColor('active')} />
              <Text style={{ 
                fontSize: 18, 
                fontWeight: '600', 
                color: AppColors.text.primary,
                marginTop: 8 
              }}>
                Scripture Resource
              </Text>
              <Text style={{ 
                fontSize: 14, 
                color: AppColors.text.secondary,
                marginTop: 4,
                textAlign: 'center'
              }}>
                Select a Bible translation resource (ULT, UST, etc.)
              </Text>
            </View>

            {selection.scripture ? (
              <TouchableOpacity
                onPress={() => handleResourceSelectionPress('scripture')}
                style={{
                  backgroundColor: getStateColor('complete') + '20',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 2,
                  borderColor: getStateColor('complete')
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ 
                      fontSize: 16, 
                      fontWeight: '600', 
                      color: AppColors.text.primary 
                    }}>
                      {getResourceName(selection.scripture)}
                    </Text>
                    <Text style={{ 
                      fontSize: 14, 
                      color: AppColors.text.secondary, 
                      marginTop: 2 
                    }}>
                      Selected • Tap to change
                    </Text>
                  </View>
                  <IconSymbol 
                    name="checkmark.circle.fill" 
                    size={24} 
                    color={getStateColor('complete')} 
                  />
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => handleResourceSelectionPress('scripture')}
                style={{
                  backgroundColor: AppColors.backgrounds.secondary,
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 12,
                  borderWidth: 2,
                  borderColor: AppColors.borders.subtle,
                  alignItems: 'center'
                }}
              >
                <IconSymbol name="plus.circle.fill" size={32} color={getStateColor('active')} />
                <Text style={{ 
                  fontSize: 16, 
                  fontWeight: '600', 
                  color: getStateColor('active'),
                  marginTop: 8
                }}>
                  Choose Scripture Resource
                </Text>
                <Text style={{ 
                  fontSize: 14, 
                  color: AppColors.text.secondary,
                  marginTop: 4,
                  textAlign: 'center'
                }}>
                  Browse online catalog or select local files
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

                 {step === 'questions' && (
           <View>
             <View style={{ marginBottom: 24, alignItems: 'center' }}>
               <IconSymbol name="questionmark.circle.fill" size={32} color={getStateColor('active')} />
               <Text style={{ 
                 fontSize: 18, 
                 fontWeight: '600', 
                 color: AppColors.text.primary,
                 marginTop: 8 
               }}>
                 Questions Resource
               </Text>
               <Text style={{ 
                 fontSize: 14, 
                 color: AppColors.text.secondary,
                 marginTop: 4,
                 textAlign: 'center'
               }}>
                 Select translation questions for community checking
               </Text>
             </View>

             {selection.questions ? (
               <TouchableOpacity
                 onPress={() => handleResourceSelectionPress('questions')}
                 style={{
                   backgroundColor: getStateColor('complete') + '20',
                   borderRadius: 12,
                   padding: 16,
                   marginBottom: 12,
                   borderWidth: 2,
                   borderColor: getStateColor('complete')
                 }}
               >
                 <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                   <View style={{ flex: 1 }}>
                     <Text style={{ 
                       fontSize: 16, 
                       fontWeight: '600', 
                       color: AppColors.text.primary 
                     }}>
                       {getResourceName(selection.questions)}
                     </Text>
                     <Text style={{ 
                       fontSize: 14, 
                       color: AppColors.text.secondary, 
                       marginTop: 2 
                     }}>
                       Selected • Tap to change
                     </Text>
                   </View>
                   <IconSymbol 
                     name="checkmark.circle.fill" 
                     size={24} 
                     color={getStateColor('complete')} 
                   />
                 </View>
               </TouchableOpacity>
             ) : (
               <TouchableOpacity
                 onPress={() => handleResourceSelectionPress('questions')}
                 style={{
                   backgroundColor: AppColors.backgrounds.secondary,
                   borderRadius: 12,
                   padding: 20,
                   marginBottom: 12,
                   borderWidth: 2,
                   borderColor: AppColors.borders.subtle,
                   alignItems: 'center'
                 }}
               >
                 <IconSymbol name="questionmark.circle.fill" size={32} color={getStateColor('active')} />
                 <Text style={{ 
                   fontSize: 16, 
                   fontWeight: '600', 
                   color: getStateColor('active'),
                   marginTop: 8
                 }}>
                   Choose Questions Resource
                 </Text>
                 <Text style={{ 
                   fontSize: 14, 
                   color: AppColors.text.secondary,
                   marginTop: 4,
                   textAlign: 'center'
                 }}>
                   Browse online catalog or select local files
                 </Text>
               </TouchableOpacity>
             )}
           </View>
         )}

        {step === 'book' && (
          <View>
            <View style={{ marginBottom: 24, alignItems: 'center' }}>
              <IconSymbol name="text.book.closed.fill" size={32} color={getStateColor('active')} />
              <Text style={{ 
                fontSize: 18, 
                fontWeight: '600', 
                color: AppColors.text.primary,
                marginTop: 8 
              }}>
                Book
              </Text>
            </View>

            <View style={{ 
              flexDirection: 'row', 
              flexWrap: 'wrap', 
              justifyContent: 'space-between' 
            }}>
              {BIBLE_BOOKS.map((book) => (
                <TouchableOpacity
                  key={book.code}
                  onPress={() => handleBookSelect(book.code)}
                  style={{
                    width: '30%',
                    backgroundColor: selection.book === book.code 
                      ? getStateColor('active') 
                      : AppColors.backgrounds.secondary,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: selection.book === book.code 
                      ? getStateColor('active') 
                      : AppColors.borders.subtle
                  }}
                >
                  <Text style={{ 
                    fontSize: 16, 
                    fontWeight: 'bold', 
                    color: selection.book === book.code 
                      ? '#FFFFFF' 
                      : AppColors.text.primary 
                  }}>
                    {book.code}
                  </Text>
                  <Text style={{ 
                    fontSize: 11, 
                    color: selection.book === book.code 
                      ? '#FFFFFF' 
                      : AppColors.text.secondary,
                    marginTop: 2,
                    textAlign: 'center'
                  }}>
                    {book.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Progress Indicator */}
      <View style={{ 
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        alignItems: 'center'
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: getStateColor('complete'),
            marginHorizontal: 4
          }} />
          <View style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: step === 'questions' || step === 'book' 
              ? getStateColor('complete') 
              : getStateColor('inactive'),
            marginHorizontal: 4
          }} />
          <View style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: step === 'book' 
              ? getStateColor('complete') 
              : getStateColor('inactive'),
            marginHorizontal: 4
          }} />
        </View>
      </View>
    </SafeAreaView>
  );
} 