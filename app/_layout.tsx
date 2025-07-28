import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { databaseService } from '@/services/databaseService';
import { resourceCacheService } from '@/services/resourceCacheService';
import "../global.css";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    // Initialize services
    const initializeApp = async () => {
      try {
        await databaseService.initialize();
        await resourceCacheService.initialize();
      } catch (error) {
        console.error('Failed to initialize app services:', error);
      }
    };

    initializeApp();
  }, []);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="project-setup" options={{ headerShown: false }} />
        <Stack.Screen name="project-dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="community-session" options={{ headerShown: false }} />
        <Stack.Screen name="session-review" options={{ headerShown: false }} />
        <Stack.Screen name="session-overview" options={{ headerShown: false }} />
        <Stack.Screen name="developer-menu" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
