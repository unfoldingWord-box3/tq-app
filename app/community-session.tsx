import { CommunityCheckingInterface } from '@/components/CommunityCheckingInterface';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function CommunitySessionRoute() {
  const { sessionId, projectId, bookCode, resumeSession } = useLocalSearchParams<{ 
    sessionId: string;
    projectId: string; 
    bookCode: string;
    resumeSession?: string;
  }>();

  const handleSessionComplete = () => {
    // Navigate to session review
    router.replace({
      pathname: '/session-review',
      params: { sessionId, projectId }
    });
  };

  const handleExit = () => {
    // Go back to project dashboard
    router.back();
  };

  return (
    <CommunityCheckingInterface
      bookCode={bookCode || 'JON'}
      sessionId={sessionId}
      projectId={projectId}
      resumeSession={resumeSession === 'true'}
      onSessionComplete={handleSessionComplete}
      onExit={handleExit}
    />
  );
} 