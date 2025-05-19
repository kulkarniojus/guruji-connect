import React from 'react';
import { motion } from 'framer-motion';
import AnimatedMilestone from './AnimatedMilestone';
import { cn } from '@/lib/utils';

export interface JourneyItem {
  id: number;
  title: string;
  isCompleted: boolean;
  completedAt?: string | null;
  sequence: number;
}

interface AnimatedJourneyPathProps {
  items: JourneyItem[];
  className?: string;
  onItemClick?: (itemId: number) => void;
}

const AnimatedJourneyPath: React.FC<AnimatedJourneyPathProps> = ({
  items,
  className,
  onItemClick
}) => {
  // Sort items by sequence
  const sortedItems = [...items].sort((a, b) => a.sequence - b.sequence);
  
  // Calculate completed percentage
  const completedCount = items.filter(item => item.isCompleted).length;
  const completionPercentage = items.length > 0 ? (completedCount / items.length) * 100 : 0;
  
  return (
    <div className={cn("relative", className)}>
      {/* Journey path progress indicator with animated dots */}
      <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200 -translate-x-1/2">
        <motion.div 
          className="absolute top-0 left-0 w-full bg-primary"
          style={{ height: `${completionPercentage}%` }}
          initial={{ height: 0 }}
          animate={{ height: `${completionPercentage}%` }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
        
        {/* Animated pulse at the end of the progress line */}
        {completionPercentage > 0 && completionPercentage < 100 && (
          <motion.div
            className="absolute w-3 h-3 bg-primary rounded-full -translate-x-1/3"
            style={{ top: `${completionPercentage}%` }}
            animate={{ 
              scale: [1, 1.3, 1],
              boxShadow: [
                "0 0 0 0 rgba(var(--primary), 0.4)",
                "0 0 0 4px rgba(var(--primary), 0)",
                "0 0 0 0 rgba(var(--primary), 0)"
              ]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              repeatType: "loop" 
            }}
          />
        )}
      </div>
      
      {/* Milestones */}
      <div className="relative pl-8">
        {sortedItems.map((item, index) => (
          <motion.div 
            key={item.id}
            onClick={() => onItemClick && onItemClick(item.id)}
            className={onItemClick ? "cursor-pointer" : ""}
            whileHover={onItemClick ? { 
              x: 5,
              transition: { type: "spring", stiffness: 300, damping: 10 }
            } : {}}
            whileTap={onItemClick ? { scale: 0.98 } : {}}
          >
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                duration: 0.5, 
                delay: index * 0.1,
                type: "spring",
                stiffness: 100
              }}
            >
              <AnimatedMilestone
                title={item.title}
                isCompleted={item.isCompleted}
                completedAt={item.completedAt}
                sequence={item.sequence}
                glow={item.isCompleted && index === completedCount - 1}
              />
            </motion.div>
          </motion.div>
        ))}
        
        {/* Interactive "Upcoming" milestone hint if not all completed */}
        {completionPercentage < 100 && sortedItems.length > 0 && (
          <motion.div
            className="pl-8 mt-2 text-gray-500 text-sm flex items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatType: "loop" }}
              className="mr-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </motion.div>
            Tap a milestone to mark as complete or add reflection
          </motion.div>
        )}
        
        {/* Final milestone animation if all completed */}
        {completionPercentage === 100 && (
          <motion.div 
            className="absolute bottom-0 left-4 -translate-x-1/2 translate-y-1/2"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
              <motion.svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 text-white"
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <path d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z" />
                <path d="m9 12 2 2 4-4" />
              </motion.svg>
            </div>
            
            {/* Celebration rays */}
            <motion.div 
              className="absolute inset-0 rounded-full"
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [0, 0.8, 0],
                scale: [1, 1.5, 2]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                repeatDelay: 1 
              }}
            >
              <div className="w-full h-full border-2 border-yellow-400 rounded-full" />
            </motion.div>
            
            {/* Confetti particles */}
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: ['#FFD700', '#4CAF50', '#2196F3', '#FF5722'][i % 4],
                  left: '50%',
                  top: '50%',
                }}
                initial={{ scale: 0 }}
                animate={{
                  scale: [0, 1, 0],
                  x: [0, (Math.random() * 60 - 30) * (i % 2 ? -1 : 1)],
                  y: [0, (Math.random() * 60 - 30) * (i % 2 ? -1 : 1)],
                }}
                transition={{
                  duration: 1.5,
                  delay: 0.6 + (i * 0.1),
                  repeat: 2,
                  repeatDelay: 2
                }}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AnimatedJourneyPath;