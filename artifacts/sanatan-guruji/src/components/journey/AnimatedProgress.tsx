import React, { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Sparkles, Award, Trophy, Star, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useJourneyAnimation } from '@/context/JourneyAnimationContext';

interface AnimatedProgressProps {
  progress: number; // 0-100
  showCelebration?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  journeyId?: number;
}

const AnimatedProgress: React.FC<AnimatedProgressProps> = ({
  progress,
  showCelebration = false,
  size = 'md',
  className,
  journeyId
}) => {
  const [prevProgress, setPrevProgress] = useState(0);
  const [isIncreasing, setIsIncreasing] = useState(false);
  const [showMilestoneTooltip, setShowMilestoneTooltip] = useState(false);
  const progressControls = useAnimation();
  const { unlockAchievement } = useJourneyAnimation();
  
  useEffect(() => {
    // Detect if progress is increasing
    if (progress > prevProgress) {
      setIsIncreasing(true);
      progressControls.start({
        width: `${progress}%`,
        transition: { 
          duration: 1.5, 
          ease: "easeOut",
          type: "spring",
          stiffness: 50,
          damping: 15
        }
      });
      
      // Check if reached a milestone (25%, 50%, 75%, 100%)
      const milestones = [25, 50, 75, 100];
      const prevMilestone = milestones.findIndex(m => prevProgress < m);
      const currentMilestone = milestones.findIndex(m => progress >= m && prevProgress < m);
      
      if (currentMilestone !== -1 && currentMilestone >= 0) {
        // Trigger milestone achievement animation
        setTimeout(() => {
          setShowMilestoneTooltip(true);
          unlockAchievement({
            id: `journey-${journeyId}-milestone-${milestones[currentMilestone]}`,
            title: `${milestones[currentMilestone]}% Complete!`,
            description: `You've reached ${milestones[currentMilestone]}% of your spiritual journey.`,
            icon: <Trophy className="h-5 w-5" />
          });
          
          // Hide tooltip after 3 seconds
          setTimeout(() => setShowMilestoneTooltip(false), 3000);
        }, 1000);
      }
      
      const timer = setTimeout(() => setIsIncreasing(false), 3000);
      return () => clearTimeout(timer);
    }
    setPrevProgress(progress);
    progressControls.set({ width: `${progress}%` });
  }, [progress, prevProgress, progressControls, unlockAchievement, journeyId]);

  // Size classes based on the size prop
  const sizeClasses = {
    sm: 'h-2 text-sm',
    md: 'h-2.5 text-base',
    lg: 'h-3 text-lg'
  };

  // Milestone markers positions
  const milestonePositions = [25, 50, 75, 100];

  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        {/* Progress bar */}
        <div className={cn("w-full bg-gray-200 rounded-full overflow-hidden", sizeClasses[size])}>
          <motion.div
            className="bg-primary rounded-full h-full"
            initial={{ width: `${prevProgress}%` }}
            animate={progressControls}
          />
        </div>
        
        {/* Milestone markers */}
        {milestonePositions.map(position => (
          <div 
            key={position}
            className={cn(
              "absolute top-0 w-0.5 h-full",
              progress >= position ? "bg-primary/30" : "bg-gray-300/50"
            )}
            style={{ left: `${position}%` }}
          />
        ))}
        
        {/* Milestone markers icons */}
        {milestonePositions.map((position, index) => (
          <motion.div
            key={position}
            className="absolute top-0 -mt-5 transform -translate-x-1/2"
            style={{ left: `${position}%` }}
            animate={progress >= position ? {
              scale: [1, 1.15, 1],
              y: [0, -2, 0],
              transition: { 
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
                delay: index * 0.2
              }
            } : {}}
          >
            <motion.div
              className={cn(
                "rounded-full w-4 h-4 flex items-center justify-center",
                progress >= position 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-gray-200 text-gray-400"
              )}
              whileHover={{ 
                scale: 1.2,
                transition: { duration: 0.2 }
              }}
              initial={progress >= position && prevProgress < position ? { scale: 0 } : { scale: 1 }}
              animate={progress >= position && prevProgress < position 
                ? { 
                    scale: [0, 1.5, 1],
                    transition: { duration: 0.5, delay: 1 }
                  } 
                : { scale: 1 }
              }
            >
              {position === 25 && <Star className="h-2.5 w-2.5" />}
              {position === 50 && <Zap className="h-2.5 w-2.5" />}
              {position === 75 && <Sparkles className="h-2.5 w-2.5" />}
              {position === 100 && <Trophy className="h-2.5 w-2.5" />}
            </motion.div>
          </motion.div>
        ))}

        {/* Animated progress tracker dot */}
        {progress > 0 && progress < 100 && (
          <motion.div
            className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 flex items-center justify-center"
            style={{ left: `${progress}%` }}
            animate={{ 
              y: ["-50%", "-65%", "-50%"],
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity,
              repeatType: "reverse"
            }}
          >
            <motion.div 
              className="w-3 h-3 bg-primary rounded-full"
              animate={{ 
                boxShadow: [
                  "0 0 0 0 rgba(var(--primary), 0.4)",
                  "0 0 0 4px rgba(var(--primary), 0)",
                  "0 0 0 0 rgba(var(--primary), 0)"
                ]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity
              }}
            />
          </motion.div>
        )}

        {/* Celebration effects when progress increases */}
        {isIncreasing && (
          <motion.div
            className="absolute top-0 -mt-1 transform -translate-x-1/2"
            style={{ left: `${progress}%` }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0] }}
            transition={{ duration: 2 }}
          >
            <Sparkles className="h-5 w-5 text-yellow-400" />
          </motion.div>
        )}

        {/* Milestone tooltip */}
        {showMilestoneTooltip && (
          <motion.div
            className="absolute -top-10 transform -translate-x-1/2"
            style={{ left: `${progress}%` }}
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium shadow-md whitespace-nowrap flex items-center">
              <Trophy className="h-3 w-3 mr-1" />
              {`${Math.round(progress)}% Milestone Reached!`}
              <motion.div
                className="absolute bottom-0 left-1/2 transform translate-x-1/2 w-2 h-2 rotate-45 -mb-1 bg-primary"
                style={{ left: '50%', translateX: '-50%' }}
              />
            </div>
          </motion.div>
        )}

        {/* Achievement unlocked animation at 100% */}
        {showCelebration && progress >= 100 && (
          <>
            <motion.div
              className="absolute -top-8 left-1/2 transform -translate-x-1/2"
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-medium flex items-center shadow-lg">
                <Award className="h-4 w-4 mr-2" />
                Journey Complete!
              </div>
            </motion.div>
            
            {/* Circle pulse effect */}
            <motion.div
              className="absolute top-1/2 left-full transform -translate-x-1/2 -translate-y-1/2"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ 
                opacity: [0, 0.7, 0],
                scale: [0.5, 1.5, 2]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                repeatDelay: 0.5
              }}
            >
              <div className="w-12 h-12 rounded-full border-2 border-yellow-400" />
            </motion.div>
            
            {/* Particle effects */}
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute top-1/2 transform -translate-y-1/2 rounded-full"
                style={{ 
                  left: '100%',
                  width: 2 + (i % 3),
                  height: 2 + (i % 3),
                  backgroundColor: ['#FFD700', '#4CAF50', '#2196F3', '#FF5722'][i % 4],
                }}
                initial={{ opacity: 0, x: 0, y: 0 }}
                animate={{ 
                  opacity: [0, 1, 0],
                  x: [0, -Math.random() * 60 - 20],
                  y: [0, (Math.random() * 2 - 1) * 40]
                }}
                transition={{ 
                  duration: 1 + Math.random(),
                  delay: 0.8 + (i * 0.1),
                  repeat: Infinity,
                  repeatDelay: 1 + Math.random() * 2
                }}
              />
            ))}
          </>
        )}
      </div>
      
      {/* Progress percentage display below the bar */}
      <div className="flex justify-between mt-1 text-xs text-gray-500">
        <div>0%</div>
        <motion.div 
          className="font-medium"
          animate={progress > 0 ? { 
            scale: [1, 1.1, 1],
            color: progress === 100 ? ['#6b7280', '#fbbf24', '#6b7280'] : undefined
          } : {}}
          transition={{ duration: 0.5 }}
        >
          {Math.round(progress)}%
        </motion.div>
        <div>100%</div>
      </div>
    </div>
  );
};

export default AnimatedProgress;