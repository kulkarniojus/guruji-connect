import React, { createContext, useContext, useState, ReactNode } from 'react';
import AchievementUnlocked from '@/components/journey/AchievementUnlocked';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
}

interface JourneyAnimationContextType {
  triggerMilestoneAnimation: (milestoneId: number) => void;
  unlockAchievement: (achievement: Achievement) => void;
  activeMilestoneAnimation: number | null;
}

const JourneyAnimationContext = createContext<JourneyAnimationContextType | undefined>(undefined);

export const useJourneyAnimation = () => {
  const context = useContext(JourneyAnimationContext);
  if (context === undefined) {
    throw new Error('useJourneyAnimation must be used within a JourneyAnimationProvider');
  }
  return context;
};

interface JourneyAnimationProviderProps {
  children: ReactNode;
}

export const JourneyAnimationProvider: React.FC<JourneyAnimationProviderProps> = ({ children }) => {
  const [activeMilestoneAnimation, setActiveMilestoneAnimation] = useState<number | null>(null);
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);

  const triggerMilestoneAnimation = (milestoneId: number) => {
    setActiveMilestoneAnimation(milestoneId);
    // Reset animation after a delay
    setTimeout(() => {
      setActiveMilestoneAnimation(null);
    }, 2000);
  };

  const unlockAchievement = (achievement: Achievement) => {
    setCurrentAchievement(achievement);
  };

  const handleAchievementClose = () => {
    setCurrentAchievement(null);
  };

  return (
    <JourneyAnimationContext.Provider 
      value={{ 
        triggerMilestoneAnimation, 
        unlockAchievement, 
        activeMilestoneAnimation 
      }}
    >
      {children}
      
      {/* Render achievement notification if one is active */}
      {currentAchievement && (
        <AchievementUnlocked 
          achievement={currentAchievement} 
          onClose={handleAchievementClose} 
        />
      )}
    </JourneyAnimationContext.Provider>
  );
};

export default JourneyAnimationProvider;