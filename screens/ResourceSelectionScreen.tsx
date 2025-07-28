import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ConnectivityIndicator } from '@/components/ui/ConnectivityIndicator';
import { IconButton } from '@/components/ui/IconButton';
import { AppColors } from '@/constants/AppColors';
import { useConnectivity } from '@/hooks/useConnectivity';
import { databaseService, ResourceRecord } from '@/services/databaseService';
import {
  Door43Language,
  Door43Resource,
  door43ServiceDCS as door43Service
} from '@/services/door43ServiceDCS';
import { DownloadProgress, resourceCacheService } from '@/services/resourceCacheService';

type ResourceType = 'scripture' | 'questions';
type SelectionMode = 'online' | 'local';

interface ResourceSelectionScreenProps {
  resourceType: ResourceType;
  onResourceSelected: (resource: Door43Resource | string) => void;
  onBack: () => void;
}

interface ResourceItem {
  id: string;
  name: string;
  owner: string;
  language: string;
  description?: string;
  isLocal: boolean;
  isDownloading?: boolean;
  downloadProgress?: number;
  isCached?: boolean;
  source: Door43Resource | ResourceRecord | string;
}

export function ResourceSelectionScreen({
  resourceType,
  onResourceSelected,
  onBack
}: ResourceSelectionScreenProps) {
  const [mode, setMode] = useState<SelectionMode>('online');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [languages, setLanguages] = useState<Door43Language[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [localResources, setLocalResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingResources, setDownloadingResources] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Map<string, number>>(new Map());
  const [cachedResources, setCachedResources] = useState<Set<string>>(new Set());
  const [hasAttemptedConnectivityCheck, setHasAttemptedConnectivityCheck] = useState(false);
  const [hasAttemptedResourceLoad, setHasAttemptedResourceLoad] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [languageSearchQuery, setLanguageSearchQuery] = useState('');

  const { isConnected, door43Available } = useConnectivity();

  // Check if ZIP extraction is available (not available in Expo Go)
  const canExtractZip = resourceCacheService.isZipExtractionAvailable();

  console.log('isConnected', isConnected);
  console.log('door43Available', door43Available);
  console.log('canExtractZip', canExtractZip);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Track when we've made our first connectivity check
  useEffect(() => {
    // Mark connectivity check as complete once we have a definitive answer
    // or after a reasonable timeout
    if (isConnected !== false || door43Available !== false) {
      setHasAttemptedConnectivityCheck(true);
    } else {
      const timer = setTimeout(() => {
        setHasAttemptedConnectivityCheck(true);
      }, 3000); // 3 second timeout fallback

      return () => clearTimeout(timer);
    }
  }, [isConnected, door43Available]);

  useEffect(() => {
    if (mode === 'online' && selectedLanguage) {
      loadOnlineResources();
    } else if (mode === 'local') {
      loadLocalResources();
    }
  }, [mode, selectedLanguage, resourceType, isConnected, door43Available]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Load languages and local resources in parallel
      const [languagesResult, localResult] = await Promise.all([
        loadLanguages(),
        loadLocalResources()
      ]);
      
      if (mode === 'online' && selectedLanguage) {
        await loadOnlineResources();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const loadLanguages = async (): Promise<Door43Language[]> => {
    try {
      const langs = await door43Service.getAvailableLanguages();
      setLanguages(langs);
      return langs;
    } catch (err) {
      console.error('Failed to load languages:', err);
      // Set default languages if API fails
      const defaultLangs: Door43Language[] = [
        { identifier: 'en', title: 'English', direction: 'ltr' },
        { identifier: 'es', title: 'Español', direction: 'ltr' },
        { identifier: 'fr', title: 'Français', direction: 'ltr' },
      ];
      setLanguages(defaultLangs);
      return defaultLangs;
    }
  };

  const checkCachedResources = async (resources: Door43Resource[]) => {
    const cached = new Set<string>();
    
    // Check cache status for each resource
    await Promise.all(
      resources.map(async (resource) => {
        try {
          const isCached = await resourceCacheService.isResourceCached(resource.id);
          if (isCached) {
            cached.add(resource.id);
          }
        } catch (error) {
          console.warn('Failed to check cache status for resource:', resource.id, error);
        }
      })
    );
    
    setCachedResources(cached);
    return cached;
  };

  const loadOnlineResources = async () => {
    // Only show connectivity error after we've actually attempted to check connectivity
    if (!isConnected || !door43Available) {
      if (hasAttemptedConnectivityCheck) {
        setError('No internet connection. Switch to local mode or check your connection.');
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let onlineResources: Door43Resource[] = [];

      if (resourceType === 'scripture') {
        onlineResources = await door43Service.getScriptureResources(selectedLanguage, true);
      } else if (resourceType === 'questions') {
        onlineResources = await door43Service.getTranslationQuestions(selectedLanguage);
      }

      // Check which resources are already cached
      const cached = await checkCachedResources(onlineResources);

             const resourceItems: ResourceItem[] = onlineResources.map(resource => ({
         id: resource.id,
         name: resource.name,
         owner: resource.owner,
         language: resource.language.title,
         description: `${resource.subject} • ${resource.format.toUpperCase()}`,
         isLocal: false,
         isDownloading: downloadingResources.has(resource.id),
         downloadProgress: downloadProgress.get(resource.id),
         isCached: cached.has(resource.id),
         source: resource
       }));

             setResources(resourceItems);
     } catch (err) {
       setError(err instanceof Error ? err.message : 'Failed to load online resources');
       setResources([]);
     } finally {
       setLoading(false);
       setHasAttemptedResourceLoad(true);
     }
  };

  const loadLocalResources = async () => {
    try {
      const localRes = await databaseService.getDownloadedResources();
      
      const subjectFilter = resourceType === 'scripture' 
        ? ['Bible', 'Aligned Bible']
        : ['Translation Questions'];

      const filtered = localRes.filter(res => 
        subjectFilter.includes(res.subject)
      );

      const resourceItems: ResourceItem[] = filtered.map(resource => ({
        id: resource.id,
        name: resource.name,
        owner: resource.owner,
        language: resource.language,
        description: `${resource.subject} • Local • ${(resource.file_size / 1024 / 1024).toFixed(1)}MB`,
        isLocal: true,
        source: resource
      }));

      setLocalResources(resourceItems);
      
             if (mode === 'local') {
         setResources(resourceItems);
         setHasAttemptedResourceLoad(true);
       }
     } catch (err) {
       console.error('Failed to load local resources:', err);
       setLocalResources([]);
       if (mode === 'local') {
         setHasAttemptedResourceLoad(true);
       }
     }
  };

  const handleModeChange = (newMode: SelectionMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(newMode);
    setError(null);
    setHasAttemptedResourceLoad(false); // Reset when changing modes
  };

  const handleLanguageSelect = (languageId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLanguage(languageId);
    setHasAttemptedResourceLoad(false); // Reset when changing language
    setLanguageModalVisible(false);
    setLanguageSearchQuery('');
  };

  const getPopularLanguages = () => {
    const popularCodes = ['en', 'es', 'fr', 'pt', 'ar', 'hi', 'zh', 'ru', 'de', 'ja'];
    return languages.filter(lang => popularCodes.includes(lang.identifier));
  };

  const getFilteredLanguages = () => {
    if (!languageSearchQuery.trim()) {
      return languages;
    }
    
    const query = languageSearchQuery.toLowerCase();
    return languages.filter(lang => 
      lang.title.toLowerCase().includes(query) ||
      lang.identifier.toLowerCase().includes(query) ||
      (lang.anglicized_name && lang.anglicized_name.toLowerCase().includes(query))
    );
  };

  const handleResourceSelect = (item: ResourceItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (typeof item.source === 'string') {
      onResourceSelected(item.source);
    } else if ('zipball_url' in item.source) {
      onResourceSelected(item.source as Door43Resource);
    } else {
      // Convert ResourceRecord to a file path or handle appropriately
      console.warn('Local resource selection not fully implemented for ResourceRecord');
    }
  };

  const handleDownloadResource = async (resource: Door43Resource) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      setDownloadingResources(prev => new Set(prev).add(resource.id));
      setError(null);

             await resourceCacheService.downloadResource(resource, (progress: DownloadProgress) => {
         setDownloadProgress(prev => {
           const newMap = new Map(prev);
           newMap.set(resource.id, progress.progress);
           return newMap;
         });
         
         // Update the resources list to reflect download progress
         setResources(prev => prev.map(item => 
           item.id === resource.id 
             ? { ...item, isDownloading: true, downloadProgress: progress.progress }
             : item
         ));
       });

             // Refresh local resources to show the newly downloaded resource
       await loadLocalResources();
       
       // Update cached resources state
       setCachedResources(prev => new Set(prev).add(resource.id));
       
       Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
       Alert.alert('✅', `${resource.name} downloaded successfully!`);

    } catch (err) {
      console.error('Failed to download resource:', err);
      setError(`Failed to download ${resource.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
         } finally {
       setDownloadingResources(prev => {
         const newSet = new Set(prev);
         newSet.delete(resource.id);
         return newSet;
       });
       setDownloadProgress(prev => {
         const newMap = new Map(prev);
         newMap.delete(resource.id);
         return newMap;
       });
       
       // Update the resources list to reflect download completion
       setResources(prev => prev.map(item => 
         item.id === resource.id 
           ? { ...item, isDownloading: false, downloadProgress: undefined, isCached: cachedResources.has(resource.id) }
           : item
       ));
     }
  };

  const handleLocalFileSelect = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/zip', 'application/x-zip-compressed'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        onResourceSelected(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to select file: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const renderModeSelector = () => (
         <View style={{ flexDirection: 'row', marginBottom: 24, backgroundColor: AppColors.backgrounds.secondary, borderRadius: 12, padding: 4 }}>
      <TouchableOpacity
        style={{
          flex: 1,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 8,
                     backgroundColor: mode === 'online' ? AppColors.states.active : 'transparent',
          alignItems: 'center',
        }}
        onPress={() => handleModeChange('online')}
      >
        <Ionicons 
          name="cloud-download-outline" 
          size={20} 
          color={mode === 'online' ? 'white' : AppColors.text.secondary} 
        />
        <Text style={{ 
          color: mode === 'online' ? 'white' : AppColors.text.secondary, 
          fontWeight: mode === 'online' ? '600' : '400',
          fontSize: 12,
          marginTop: 4
        }}>
          Online
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={{
          flex: 1,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 8,
                     backgroundColor: mode === 'local' ? AppColors.states.active : 'transparent',
          alignItems: 'center',
        }}
        onPress={() => handleModeChange('local')}
      >
        <Ionicons 
          name="folder-outline" 
          size={20} 
          color={mode === 'local' ? 'white' : AppColors.text.secondary} 
        />
        <Text style={{ 
          color: mode === 'local' ? 'white' : AppColors.text.secondary, 
          fontWeight: mode === 'local' ? '600' : '400',
          fontSize: 12,
          marginTop: 4
        }}>
          Local
        </Text>
      </TouchableOpacity>
    </View>
  );

    const renderLanguageSelector = () => {
    if (mode === 'local') return null;

    const selectedLang = languages.find(lang => lang.identifier === selectedLanguage);

    return (
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: AppColors.text.primary, marginBottom: 12 }}>
          Select Language
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: AppColors.backgrounds.secondary,
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: AppColors.borders.light,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setLanguageModalVisible(true);
          }}
        >
          <View>
            <Text style={{ fontSize: 16, fontWeight: '600', color: AppColors.text.primary }}>
              {selectedLang ? selectedLang.title : 'Select Language'}
            </Text>
            {selectedLang && (
              <Text style={{ fontSize: 12, color: AppColors.text.secondary, marginTop: 2 }}>
                {selectedLang.identifier.toUpperCase()}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-down" size={20} color={AppColors.text.secondary} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderLanguageModal = () => {
    const filteredLanguages = getFilteredLanguages();
    const popularLanguages = getPopularLanguages();
    const showPopular = !languageSearchQuery.trim() && popularLanguages.length > 0;
    
    // When showing popular section, exclude popular languages from main list
    const mainLanguages = showPopular 
      ? filteredLanguages.filter(lang => !popularLanguages.find(pop => pop.identifier === lang.identifier))
      : filteredLanguages;

    const renderLanguageItem = ({ item }: { item: Door43Language }) => (
      <TouchableOpacity
        style={{
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: AppColors.borders.light,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        onPress={() => handleLanguageSelect(item.identifier)}
      >
        <View>
          <Text style={{ fontSize: 16, fontWeight: '500', color: AppColors.text.primary }}>
            {item.title}
          </Text>
          <Text style={{ fontSize: 12, color: AppColors.text.secondary, marginTop: 2 }}>
            {item.identifier.toUpperCase()}
            {item.anglicized_name && item.anglicized_name !== item.title && ` • ${item.anglicized_name}`}
          </Text>
        </View>
        {selectedLanguage === item.identifier && (
          <Ionicons name="checkmark" size={20} color={AppColors.states.active} />
        )}
      </TouchableOpacity>
    );

    return (
      <Modal
        visible={languageModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: AppColors.backgrounds.primary }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 48,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: AppColors.borders.light,
          }}>
            <IconButton
              icon="close"
              state="active"
              onPress={() => setLanguageModalVisible(false)}
              size="medium"
              style={{ marginRight: 16 }}
            />
            <Text style={{ flex: 1, fontSize: 20, fontWeight: '700', color: AppColors.text.primary }}>
              Select Language
            </Text>
          </View>

          {/* Search Bar */}
          <View style={{ padding: 16 }}>
            <View style={{
              backgroundColor: AppColors.backgrounds.secondary,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}>
              <Ionicons name="search" size={20} color={AppColors.text.secondary} style={{ marginRight: 12 }} />
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: AppColors.text.primary,
                }}
                placeholder="Search languages..."
                placeholderTextColor={AppColors.text.secondary}
                value={languageSearchQuery}
                onChangeText={setLanguageSearchQuery}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {languageSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setLanguageSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={AppColors.text.secondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Language List */}
          <FlatList
            data={mainLanguages}
            keyExtractor={(item: Door43Language) => item.identifier}
            renderItem={renderLanguageItem}
            ListHeaderComponent={showPopular ? (
              <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: AppColors.text.secondary, marginBottom: 12 }}>
                  POPULAR LANGUAGES
                </Text>
                                 {popularLanguages.map((lang) => (
                   <View key={`popular-${lang.identifier}`}>
                     {renderLanguageItem({ item: lang })}
                   </View>
                 ))}
                <View style={{ 
                  marginVertical: 16, 
                  paddingHorizontal: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: AppColors.borders.light 
                }} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: AppColors.text.secondary, marginBottom: 12 }}>
                  ALL LANGUAGES
                </Text>
              </View>
            ) : null}
            style={{ flex: 1 }}
          />
        </View>
      </Modal>
    );
  };

  const renderResourceItem = (item: ResourceItem) => (
    <TouchableOpacity
      style={{
                 backgroundColor: AppColors.backgrounds.primary,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
                 borderColor: AppColors.borders.light,
        flexDirection: 'row',
        alignItems: 'center',
      }}
      onPress={() => handleResourceSelect(item)}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: AppColors.text.primary, marginBottom: 4 }}>
          {item.name}
        </Text>
        <Text style={{ fontSize: 14, color: AppColors.text.secondary, marginBottom: 2 }}>
          by {item.owner}
        </Text>
        {item.description && (
          <Text style={{ fontSize: 12, color: AppColors.text.tertiary }}>
            {item.description}
          </Text>
        )}
      </View>
      
                           <View style={{ alignItems: 'center' }}>
          {item.isLocal && (
                        <View style={{ 
               backgroundColor: AppColors.semantic.success, 
               borderRadius: 12, 
               paddingHorizontal: 8, 
               paddingVertical: 4, 
               marginBottom: 8 
             }}>
               <Text style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>LOCAL</Text>
             </View>
          )}
          
          {!item.isLocal && item.isCached && mode === 'online' && (
            <View style={{ 
              backgroundColor: AppColors.states.complete, 
              borderRadius: 12, 
              paddingHorizontal: 8, 
              paddingVertical: 4, 
              marginBottom: 8 
            }}>
              <Text style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>CACHED</Text>
            </View>
          )}
          
                    {!item.isLocal && !item.isCached && mode === 'online' && (
            <TouchableOpacity
              onPress={(e: any) => {
                e.stopPropagation();
                if (!canExtractZip) {
                  Alert.alert(
                    'ZIP Extraction Not Available',
                    'Download and extraction requires a dev build. Please use "Local" mode to select files manually.',
                    [{ text: 'OK' }]
                  );
                  return;
                }
                if (typeof item.source === 'object' && 'zipball_url' in item.source) {
                  handleDownloadResource(item.source as Door43Resource);
                }
              }}
              disabled={item.isDownloading || !canExtractZip}
              style={{
                backgroundColor: !canExtractZip 
                  ? AppColors.text.tertiary 
                  : item.isDownloading 
                    ? AppColors.text.tertiary 
                    : AppColors.states.active,
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 4,
                marginBottom: 8,
                minWidth: 60,
                alignItems: 'center'
              }}
            >
                             {!canExtractZip ? (
                 <>
                   <Ionicons name="ban-outline" size={12} color="white" />
                   <Text style={{ color: 'white', fontSize: 10, fontWeight: '600', marginTop: 2 }}>
                     N/A
                   </Text>
                 </>
               ) : item.isDownloading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={{ color: 'white', fontSize: 10, fontWeight: '600', marginLeft: 4 }}>
                    {Math.round((item.downloadProgress || 0) * 100)}%
                  </Text>
                </View>
              ) : (
                <>
                  <Ionicons name="download-outline" size={12} color="white" />
                  <Text style={{ color: 'white', fontSize: 10, fontWeight: '600', marginTop: 2 }}>
                    DOWNLOAD
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
         
         <Ionicons name="chevron-forward" size={20} color={AppColors.text.secondary} />
       </View>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                     <ActivityIndicator size="large" color={AppColors.states.active} />
          <Text style={{ marginTop: 16, color: AppColors.text.secondary }}>
            {mode === 'online' && !hasAttemptedConnectivityCheck 
              ? 'Checking connection...' 
              : `Loading ${mode} resources...`}
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                     <Ionicons name="warning-outline" size={48} color={AppColors.semantic.warning} />
          <Text style={{ fontSize: 16, color: AppColors.text.primary, textAlign: 'center', marginTop: 16 }}>
            {error}
          </Text>
          <TouchableOpacity
            style={{
                             backgroundColor: AppColors.states.active,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
              marginTop: 16,
            }}
            onPress={handleRefresh}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {mode === 'local' && (
          <TouchableOpacity
            style={{
                             backgroundColor: AppColors.backgrounds.secondary,
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              borderWidth: 2,
                             borderColor: AppColors.borders.light,
              borderStyle: 'dashed',
              alignItems: 'center',
            }}
            onPress={handleLocalFileSelect}
          >
                         <Ionicons name="add-circle-outline" size={32} color={AppColors.states.active} />
             <Text style={{ fontSize: 16, fontWeight: '600', color: AppColors.states.active, marginTop: 8 }}>
              Select from Files
            </Text>
            <Text style={{ fontSize: 12, color: AppColors.text.secondary, textAlign: 'center', marginTop: 4 }}>
              Choose a ZIP file containing {resourceType === 'scripture' ? 'Bible text' : 'translation questions'}
            </Text>
          </TouchableOpacity>
        )}

                 {resources.length === 0 && hasAttemptedResourceLoad ? (
          <View style={{ alignItems: 'center', padding: 32 }}>
            <Ionicons 
              name={mode === 'online' ? "cloud-outline" : "folder-open-outline"} 
              size={48} 
              color={AppColors.text.tertiary} 
            />
            <Text style={{ fontSize: 16, color: AppColors.text.secondary, marginTop: 16, textAlign: 'center' }}>
              No {resourceType} resources found
            </Text>
            <Text style={{ fontSize: 14, color: AppColors.text.tertiary, marginTop: 8, textAlign: 'center' }}>
              {mode === 'online' 
                ? 'Try selecting a different language or check your connection'
                : 'Download resources online first or select files manually'
              }
            </Text>
          </View>
        ) : (
          resources.map((item) => (
            <View key={item.id}>
              {renderResourceItem(item)}
            </View>
          ))
        )}
      </ScrollView>
    );
  };

  return (
         <View style={{ flex: 1, backgroundColor: AppColors.backgrounds.primary }}>
      {/* Header */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 16, 
        paddingTop: 48, 
        paddingBottom: 16,
        borderBottomWidth: 1,
                 borderBottomColor: AppColors.borders.light,
      }}>
        <IconButton
          icon="arrow-back"
          state="active"
          onPress={onBack}
          size="medium"
          style={{ marginRight: 16 }}
        />
        
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: AppColors.text.primary }}>
            Select {resourceType === 'scripture' ? 'Scripture' : 'Questions'} Resource
          </Text>
        </View>

                 <ConnectivityIndicator compact={true} />
      </View>

             {/* Content */}
       <View style={{ flex: 1, padding: 16 }}>
                   {renderModeSelector()}
          {renderLanguageSelector()}
         {renderContent()}
       </View>

      {/* Language Selection Modal */}
      {renderLanguageModal()}
    </View>
  );
} 