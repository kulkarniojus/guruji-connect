import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimatedProgressProps {
  progress: number; // 0-100
  showCelebration?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const AnimatedProgress: React.FC<AnimatedProgressProps> = ({
  progress,
  showCelebration = false,
  size = 'md',
  className
}) => {
  const [prevProgress, setPrevProgress] = useState(0);
  const [isIncreasing, setIsIncreasing] = useState(false);
  
  useEffect(() => {
    // Detect if progress is increasing
    if (progress > prevProgress) {
      setIsIncreasing(true);
      const timer = setTimeout(() => setIsIncreasing(false), 3000);
      return () => clearTimeout(timer);
    }
    setPrevProgress(progress);
  }, [progress, prevProgress]);

  // Size classes
  const sizeClasses = {
    sm: 'h-2 text-sm',
    md: 'h-2.5 text-base',
    lg: 'h-3 text-lg'
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        {/* Progress bar */}
        <div className={cn("w-full bg-gray-200 rounded-full", sizeClasses[size])}>
          <motion.div
            className="bg-primary rounded-full h-full"
            initial={{ width: `${prevProgress}%` }}
            animate={{ width: `${progress}%` }}
            transition={{ 
              duration: 1.5, 
              ease: "easeOut" 
            }}
          />
        </div>

        {/* Celebration effects when progress increases */}
        {isIncreasing && (
          <motion.div
            className="absolute top-0 right-0 -mt-1 -mr-1"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0] }}
            transition={{ duration: 2 }}
          >
            <Sparkles className="h-5 w-5 text-yellow-400" />
          </motion.div>
        )}

        {/* Achievement sparkles at 100% */}
        {showCelebration && progress >= 100 && (
          <>
            <motion.div
              className="absolute -top-6 left-1/2 transform -translate-x-1/2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <div className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-medium flex items-center">
                <Award className="h-3 w-3 mr-1" />
                Achievement Unlocked!
              </div>
            </motion.div>
            
            {/* Particle effects */}
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute top-1/2 right-0 w-1.5 h-1.5 rounded-full bg-yellow-400"
                initial={{ opacity: 0, x: 0, y: 0 }}
                animate={{ 
                  opacity: [0, 1, 0],
                  x: [0, -20 - (i * 15)],
                  y: [0, -10 + (i % 2 === 0 ? -10 : 10)]
                }}
                transition={{ 
                  duration: 1.5, 
                  delay: 0.1 * i,
                  ease: "easeOut"
                }}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default AnimatedProgress;