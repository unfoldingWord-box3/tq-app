import React, { useState, useEffect } from 'react';
import { Text, View } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface CheckingSession {
  id: string;
  status: 'active' | 'paused' | 'completed';
  totalDuration: number;
  lastResumedTime: string | null;
}

interface SessionTimerProps {
  session: CheckingSession | null;
}

export function SessionTimer({ session }: SessionTimerProps) {
  const colorScheme = useColorScheme();
  const [displayTime, setDisplayTime] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (session && session.status === 'active' && session.lastResumedTime) {
      // Capture values to avoid stale closures
      const sessionStartTime = new Date(session.lastResumedTime).getTime();
      const baseDuration = session.totalDuration;
      
      // Update immediately
      const now = Date.now();
      const currentSessionTime = Math.floor((now - sessionStartTime) / 1000);
      setDisplayTime(baseDuration + currentSessionTime);
      
      interval = setInterval(() => {
        const now = Date.now();
        const currentSessionTime = Math.floor((now - sessionStartTime) / 1000);
        const newTimerValue = baseDuration + currentSessionTime;
        setDisplayTime(newTimerValue);
      }, 1000);
    } else if (session && session.status === 'paused') {
      setDisplayTime(session.totalDuration);
    } else {
      setDisplayTime(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [session?.id, session?.status, session?.lastResumedTime, session?.totalDuration]);

  // Format session time
  const formatSessionTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };

  if (!session) {
    return null;
  }

  return (
    <View style={{
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: session.status === 'active' 
        ? 'rgba(76, 175, 80, 0.1)' 
        : `${Colors[colorScheme ?? 'light'].tint}20`,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: session.status === 'active' 
        ? '#4CAF50' 
        : Colors[colorScheme ?? 'light'].tint
    }}>
      <Text style={{
        fontSize: 12,
        fontWeight: '600',
        color: session.status === 'active' 
          ? '#4CAF50' 
          : Colors[colorScheme ?? 'light'].tint
      }}>
        {formatSessionTime(displayTime)}
      </Text>
    </View>
  );
} 