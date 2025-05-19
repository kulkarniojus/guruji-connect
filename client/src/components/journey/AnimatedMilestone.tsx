import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Star, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimatedMilestoneProps {
  title: string;
  isCompleted: boolean;
  completedAt?: string | null;
  sequence: number;
  onComplete?: () => void;
  glow?: boolean;
}

const AnimatedMilestone: React.FC<AnimatedMilestoneProps> = ({
  title,
  isCompleted,
  completedAt,
  sequence,
  onComplete,
  glow = false
}) => {
  const [animate, setAnimate] = useState(false);
  
  // Trigger animation when milestone is marked as completed
  useEffect(() => {
    if (isCompleted) {
      setAnimate(true);
      
      // Reset animation state after animation completes
      const timeout = setTimeout(() => {
        setAnimate(false);
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
  }, [isCompleted]);

  return (
    <div className="relative flex items-center mb-6">
      {/* Connector line */}
      {sequence > 1 && (
        <div className="absolute top-0 left-4 -translate-x-1/2 h-7 w-0.5 -mt-7 bg-gray-200"></div>
      )}
      
      {/* Milestone circle with animations */}
      <motion.div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center relative",
          isCompleted ? "bg-primary text-primary-foreground" : "bg-gray-200 text-gray-500",
          glow && isCompleted && "animate-pulse"
        )}
        initial={{ scale: 1 }}
        animate={animate ? { 
          scale: [1, 1.5, 1],
          rotate: [0, 0, 0, 0, 0, 15, -15, 0]
        } : {}}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      >
        {isCompleted ? <Check className="h-4 w-4" /> : sequence}
        
        {/* Celebration particles for completed milestone */}
        {animate && isCompleted && (
          <>
            <motion.div
              className="absolute -top-1 -right-1"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
              transition={{ duration: 1, delay: 0.2 }}
            >
              <Sparkles className="h-4 w-4 text-yellow-400" />
            </motion.div>
            <motion.div
              className="absolute -bottom-1 -left-1"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
              transition={{ duration: 1, delay: 0.4 }}
            >
              <Star className="h-3 w-3 text-yellow-400" />
            </motion.div>
            
            {/* Radiating circle effect */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary"
              initial={{ opacity: 0, scale: 1 }}
              animate={{ opacity: [0, 0.3, 0], scale: [1, 2, 2.5] }}
              transition={{ duration: 1.5 }}
            />
          </>
        )}
      </motion.div>
      
      {/* Title and completion info */}
      <div className="ml-4">
        <p className={cn(
          "font-medium",
          isCompleted ? "text-gray-900" : "text-gray-600"
        )}>
          {title}
        </p>
        {isCompleted && completedAt && (
          <motion.p 
            className="text-xs text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            Completed on {new Date(completedAt).toLocaleDateString()}
          </motion.p>
        )}
      </div>
    </div>
  );
};

export default AnimatedMilestone;