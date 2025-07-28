import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, TouchableOpacity, View, Text, Alert } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

// Project types following unfoldingWord RC specification
interface TranslationProject {
  id: string;
  name: string;
  bookCode: string;
  bookName: string;
  scriptureResource: {
    id: string;
    name: string;
    language: string;
    url: string;
  };
  questionResource: {
    id: string;
    name: string;
    language: string;
    url: string;
  };
  progress: {
    totalQuestions: number;
    completedQuestions: number;
    lastActivity: string;
  };
  createdAt: string;
  isActive: boolean;
}

// Available books following Door43 standards
const AVAILABLE_BOOKS = [
  { code: 'JON', name: 'Jonah', chapters: 4 },
  { code: 'MAT', name: 'Matthew', chapters: 28 },
  { code: 'MRK', name: 'Mark', chapters: 16 },
  { code: 'LUK', name: 'Luke', chapters: 24 },
  { code: 'JHN', name: 'John', chapters: 21 },
  { code: 'ACT', name: 'Acts', chapters: 28 },
  { code: 'ROM', name: 'Romans', chapters: 16 },
  { code: '1CO', name: '1 Corinthians', chapters: 16 },
  { code: 'GAL', name: 'Galatians', chapters: 6 },
  { code: 'EPH', name: 'Ephesians', chapters: 6 },
  { code: 'PHP', name: 'Philippians', chapters: 4 },
  { code: 'COL', name: 'Colossians', chapters: 4 },
  { code: '1TH', name: '1 Thessalonians', chapters: 5 },
  { code: '2TH', name: '2 Thessalonians', chapters: 3 },
  { code: '1TI', name: '1 Timothy', chapters: 6 },
  { code: '2TI', name: '2 Timothy', chapters: 4 },
  { code: 'TIT', name: 'Titus', chapters: 3 },
  { code: 'PHM', name: 'Philemon', chapters: 1 },
];

// Available resources from Door43 (simplified for now)
const AVAILABLE_RESOURCES = {
  scripture: [
    { id: 'en_ult', name: 'Unlocked Literal Bible (ULT)', language: 'English' },
    { id: 'en_ust', name: 'Unlocked Simplified Text (UST)', language: 'English' },
    { id: 'en_uhb', name: 'Hebrew Bible (UHB)', language: 'Hebrew' },
    { id: 'en_ugnt', name: 'Greek New Testament (UGNT)', language: 'Greek' },
  ],
  questions: [
    { id: 'en_tq', name: 'Translation Questions (TQ)', language: 'English' },
    { id: 'es_tq', name: 'Translation Questions (TQ)', language: 'Spanish' },
    { id: 'fr_tq', name: 'Translation Questions (TQ)', language: 'French' },
  ]
};

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const [projects, setProjects] = useState<TranslationProject[]>([]);
  const [showNewProject, setShowNewProject] = useState(false);
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [selectedScriptureResource, setSelectedScriptureResource] = useState<string>('');
  const [selectedQuestionResource, setSelectedQuestionResource] = useState<string>('');

  // Load existing projects (from local storage in real implementation)
  useEffect(() => {
    // Mock data for demonstration
    const mockProjects: TranslationProject[] = [
      {
        id: '1',
        name: 'Jonah Community Check',
    bookCode: 'JON',
        bookName: 'Jonah',
        scriptureResource: {
          id: 'en_ult',
          name: 'Unlocked Literal Bible (ULT)',
          language: 'English',
          url: 'https://git.door43.org/unfoldingWord/en_ult'
        },
        questionResource: {
          id: 'en_tq',
          name: 'Translation Questions (TQ)',
          language: 'English',
          url: 'https://git.door43.org/unfoldingWord/en_tq'
        },
        progress: {
          totalQuestions: 42,
          completedQuestions: 15,
          lastActivity: '2024-01-15'
        },
        createdAt: '2024-01-10',
        isActive: true
      }
    ];
    setProjects(mockProjects);
  }, []);

  const createNewProject = () => {
    if (!selectedBook || !selectedScriptureResource || !selectedQuestionResource) {
      Alert.alert('Missing Information', 'Please select a book, scripture resource, and question resource.');
      return;
    }

    const book = AVAILABLE_BOOKS.find(b => b.code === selectedBook);
    const scriptureRes = AVAILABLE_RESOURCES.scripture.find(r => r.id === selectedScriptureResource);
    const questionRes = AVAILABLE_RESOURCES.questions.find(r => r.id === selectedQuestionResource);

    if (!book || !scriptureRes || !questionRes) return;

    const newProject: TranslationProject = {
      id: Date.now().toString(),
      name: `${book.name} Community Check`,
      bookCode: book.code,
      bookName: book.name,
      scriptureResource: {
        ...scriptureRes,
        url: `https://git.door43.org/unfoldingWord/${scriptureRes.id}`
      },
      questionResource: {
        ...questionRes,
        url: `https://git.door43.org/unfoldingWord/${questionRes.id}`
      },
      progress: {
        totalQuestions: 0, // Will be calculated after loading resources
        completedQuestions: 0,
        lastActivity: new Date().toISOString().split('T')[0]
      },
      createdAt: new Date().toISOString().split('T')[0],
      isActive: false
    };

    setProjects(prev => [...prev, newProject]);
    setShowNewProject(false);
    setSelectedBook('');
    setSelectedScriptureResource('');
    setSelectedQuestionResource('');

    Alert.alert('Project Created', `${newProject.name} has been created successfully.`);
  };

  const getProgressPercentage = (project: TranslationProject) => {
    if (project.progress.totalQuestions === 0) return 0;
    return Math.round((project.progress.completedQuestions / project.progress.totalQuestions) * 100);
  };

  return (
    <SafeAreaView 
      className="flex-1"
      style={{ backgroundColor: Colors[colorScheme ?? 'light'].background }}
    >
      <ScrollView className="flex-1 p-6">
        {/* Header */}
        <ThemedView className="mb-8">
          <ThemedText className="text-3xl font-bold mb-2">
            Community Checking
          </ThemedText>
          <ThemedText className="text-lg opacity-70">
            Bible Translation Quality Assurance
          </ThemedText>
        </ThemedView>

        {/* Quick Stats */}
        <ThemedView className="flex-row justify-between mb-6 p-4 bg-gray-50 rounded-lg">
          <View className="items-center">
            <ThemedText className="text-2xl font-bold" style={{ color: Colors[colorScheme ?? 'light'].tint }}>
              {projects.length}
            </ThemedText>
            <ThemedText className="text-sm opacity-70">Projects</ThemedText>
            </View>
          <View className="items-center">
            <ThemedText className="text-2xl font-bold" style={{ color: Colors[colorScheme ?? 'light'].tint }}>
              {projects.filter(p => p.isActive).length}
            </ThemedText>
            <ThemedText className="text-sm opacity-70">Active</ThemedText>
            </View>
          <View className="items-center">
            <ThemedText className="text-2xl font-bold" style={{ color: Colors[colorScheme ?? 'light'].tint }}>
              {projects.reduce((sum, p) => sum + p.progress.completedQuestions, 0)}
            </ThemedText>
            <ThemedText className="text-sm opacity-70">Completed</ThemedText>
          </View>
        </ThemedView>

        {/* Projects List */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <ThemedText className="text-xl font-semibold">Your Projects</ThemedText>
            <TouchableOpacity
              className="flex-row items-center px-4 py-2 rounded-lg"
              style={{ backgroundColor: Colors[colorScheme ?? 'light'].tint }}
              onPress={() => setShowNewProject(true)}
            >
              <IconSymbol name="plus" size={16} color="white" />
              <Text className="text-white font-semibold ml-2">New Project</Text>
            </TouchableOpacity>
          </View>

          {projects.length === 0 ? (
            <ThemedView className="p-8 items-center bg-gray-50 rounded-lg">
                             <IconSymbol name="house.fill" size={48} color={Colors[colorScheme ?? 'light'].tabIconDefault} />
              <ThemedText className="text-lg font-semibold mt-4 mb-2">No Projects Yet</ThemedText>
              <ThemedText className="text-center opacity-70 mb-4">
                Create your first Bible translation checking project to get started.
              </ThemedText>
              <TouchableOpacity
                className="px-6 py-3 rounded-lg"
                style={{ backgroundColor: Colors[colorScheme ?? 'light'].tint }}
                onPress={() => setShowNewProject(true)}
              >
                <Text className="text-white font-semibold">Create Project</Text>
              </TouchableOpacity>
            </ThemedView>
          ) : (
            projects.map(project => (
              <TouchableOpacity
                key={project.id}
                className="p-4 mb-3 border rounded-lg"
                style={{ 
                  borderColor: project.isActive ? Colors[colorScheme ?? 'light'].tint : Colors[colorScheme ?? 'light'].tabIconDefault,
                  backgroundColor: project.isActive ? `${Colors[colorScheme ?? 'light'].tint}10` : 'rgba(0,0,0,0.02)'
                }}
              >
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1">
                    <ThemedText className="text-lg font-semibold mb-1">{project.name}</ThemedText>
                    <ThemedText className="text-sm opacity-70">
                      {project.scriptureResource.name} • {project.questionResource.name}
                    </ThemedText>
                  </View>
                  {project.isActive && (
                    <View className="px-2 py-1 rounded-full" style={{ backgroundColor: Colors[colorScheme ?? 'light'].tint }}>
                      <Text className="text-xs text-white font-semibold">Active</Text>
                    </View>
                  )}
                </View>

                <View className="flex-row justify-between items-center">
                  <View className="flex-1">
                    <View className="flex-row justify-between mb-1">
                      <ThemedText className="text-xs opacity-70">Progress</ThemedText>
                      <ThemedText className="text-xs opacity-70">
                        {project.progress.completedQuestions}/{project.progress.totalQuestions}
                      </ThemedText>
                    </View>
                    <View className="h-2 bg-gray-200 rounded-full">
                      <View 
                        className="h-2 rounded-full"
                        style={{ 
                          backgroundColor: Colors[colorScheme ?? 'light'].tint,
                          width: `${getProgressPercentage(project)}%`
                        }}
                      />
                    </View>
                  </View>
                  <ThemedText className="text-xs opacity-70 ml-4">
                    {project.progress.lastActivity}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* New Project Modal */}
        {showNewProject && (
          <ThemedView className="p-6 border-2 rounded-lg mb-6" style={{ borderColor: Colors[colorScheme ?? 'light'].tint }}>
            <View className="flex-row justify-between items-center mb-4">
              <ThemedText className="text-xl font-semibold">New Project</ThemedText>
                             <TouchableOpacity onPress={() => setShowNewProject(false)}>
                 <IconSymbol name="ellipsis" size={20} color={Colors[colorScheme ?? 'light'].tabIconDefault} />
               </TouchableOpacity>
            </View>

            {/* Book Selection */}
            <View className="mb-4">
              <ThemedText className="text-sm font-semibold mb-2">Select Book</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                {AVAILABLE_BOOKS.map(book => (
                  <TouchableOpacity
                    key={book.code}
                    className="px-3 py-2 mr-2 rounded-lg border"
                    style={{
                      backgroundColor: selectedBook === book.code ? Colors[colorScheme ?? 'light'].tint : 'transparent',
                      borderColor: selectedBook === book.code ? Colors[colorScheme ?? 'light'].tint : Colors[colorScheme ?? 'light'].tabIconDefault
                    }}
                    onPress={() => setSelectedBook(book.code)}
                  >
                    <Text style={{ color: selectedBook === book.code ? 'white' : Colors[colorScheme ?? 'light'].text }}>
                      {book.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Scripture Resource Selection */}
            <View className="mb-4">
              <ThemedText className="text-sm font-semibold mb-2">Scripture Resource</ThemedText>
              {AVAILABLE_RESOURCES.scripture.map(resource => (
                <TouchableOpacity
                  key={resource.id}
                  className="flex-row items-center p-3 mb-2 border rounded-lg"
                  style={{
                    backgroundColor: selectedScriptureResource === resource.id ? Colors[colorScheme ?? 'light'].tint : 'transparent',
                    borderColor: selectedScriptureResource === resource.id ? Colors[colorScheme ?? 'light'].tint : Colors[colorScheme ?? 'light'].tabIconDefault
                  }}
                  onPress={() => setSelectedScriptureResource(resource.id)}
                >
                  <View className="flex-1">
                    <Text style={{ color: selectedScriptureResource === resource.id ? 'white' : Colors[colorScheme ?? 'light'].text }}>
                      {resource.name}
                    </Text>
                    <Text style={{ color: selectedScriptureResource === resource.id ? 'rgba(255,255,255,0.8)' : Colors[colorScheme ?? 'light'].tabIconDefault }}>
                      {resource.language}
                    </Text>
                  </View>
                                     {selectedScriptureResource === resource.id && (
                     <IconSymbol name="info.circle.fill" size={16} color="white" />
                   )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Question Resource Selection */}
            <View className="mb-6">
              <ThemedText className="text-sm font-semibold mb-2">Question Resource</ThemedText>
              {AVAILABLE_RESOURCES.questions.map(resource => (
                <TouchableOpacity
                  key={resource.id}
                  className="flex-row items-center p-3 mb-2 border rounded-lg"
                  style={{
                    backgroundColor: selectedQuestionResource === resource.id ? Colors[colorScheme ?? 'light'].tint : 'transparent',
                    borderColor: selectedQuestionResource === resource.id ? Colors[colorScheme ?? 'light'].tint : Colors[colorScheme ?? 'light'].tabIconDefault
                  }}
                  onPress={() => setSelectedQuestionResource(resource.id)}
                >
                  <View className="flex-1">
                    <Text style={{ color: selectedQuestionResource === resource.id ? 'white' : Colors[colorScheme ?? 'light'].text }}>
                      {resource.name}
                    </Text>
                    <Text style={{ color: selectedQuestionResource === resource.id ? 'rgba(255,255,255,0.8)' : Colors[colorScheme ?? 'light'].tabIconDefault }}>
                      {resource.language}
                    </Text>
                  </View>
                                     {selectedQuestionResource === resource.id && (
                     <IconSymbol name="info.circle.fill" size={16} color="white" />
                   )}
            </TouchableOpacity>
              ))}
            </View>

            {/* Create Button */}
            <TouchableOpacity
              className="p-4 rounded-lg items-center"
              style={{ backgroundColor: Colors[colorScheme ?? 'light'].tint }}
              onPress={createNewProject}
            >
              <Text className="text-white font-semibold">Create Project</Text>
            </TouchableOpacity>
        </ThemedView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
