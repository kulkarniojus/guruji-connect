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
      {/* Journey path progress indicator */}
      <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200 -translate-x-1/2">
        <motion.div 
          className="absolute top-0 left-0 w-full bg-primary"
          style={{ height: `${completionPercentage}%` }}
          initial={{ height: 0 }}
          animate={{ height: `${completionPercentage}%` }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
      </div>
      
      {/* Milestones */}
      <div className="relative pl-8">
        {sortedItems.map((item, index) => (
          <div 
            key={item.id}
            onClick={() => onItemClick && onItemClick(item.id)}
            className={onItemClick ? "cursor-pointer transition-transform hover:translate-x-1" : ""}
          >
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <AnimatedMilestone
                title={item.title}
                isCompleted={item.isCompleted}
                completedAt={item.completedAt}
                sequence={item.sequence}
                glow={item.isCompleted && index === completedCount - 1}
              />
            </motion.div>
          </div>
        ))}
        
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
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AnimatedJourneyPath;