import { ProjectSetupScreen } from '@/screens/ProjectSetupScreen';
import { router } from 'expo-router';
import React from 'react';

export default function ProjectSetupRoute() {
  const handleProjectCreated = (projectId: string) => {
    // Navigate to the project dashboard for the newly created project
    router.replace({
      pathname: '/project-dashboard',
      params: { projectId }
    });
  };

  const handleBack = () => {
    // Go back to main screen
    router.back();
  };

  return (
    <ProjectSetupScreen 
      onProjectCreated={handleProjectCreated}
      onBack={handleBack}
    />
  );
} 