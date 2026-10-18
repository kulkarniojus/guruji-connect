import React from 'react';
import { motion } from 'framer-motion';
import { 
  Leaf, 
  Flower2, 
  TreePine, 
  Mountain, 
  Sparkles 
} from 'lucide-react';

type JourneyStage = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master';

interface AnimatedStageProps {
  stage: JourneyStage;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

const stageIcons = {
  beginner: Leaf,
  intermediate: Flower2,
  advanced: TreePine,
  expert: Mountain,
  master: Sparkles
};

const stageColors = {
  beginner: 'text-green-500',
  intermediate: 'text-blue-500',
  advanced: 'text-purple-500',
  expert: 'text-orange-500',
  master: 'text-yellow-500'
};

const stageBgColors = {
  beginner: 'bg-green-100',
  intermediate: 'bg-blue-100',
  advanced: 'bg-purple-100',
  expert: 'bg-orange-100',
  master: 'bg-yellow-100'
};

const AnimatedStage: React.FC<AnimatedStageProps> = ({
  stage,
  size = 'md',
  animated = true
}) => {
  const Icon = stageIcons[stage];
  const colorClass = stageColors[stage];
  const bgColorClass = stageBgColors[stage];
  
  const sizeMap = {
    sm: {
      container: "w-8 h-8",
      icon: "w-4 h-4"
    },
    md: {
      container: "w-10 h-10",
      icon: "w-5 h-5"
    },
    lg: {
      container: "w-12 h-12",
      icon: "w-6 h-6"
    }
  };
  
  return (
    <motion.div 
      className={`relative rounded-full flex items-center justify-center ${sizeMap[size].container} ${bgColorClass}`}
      whileHover={animated ? { scale: 1.1 } : {}}
      animate={animated ? { rotate: [0, 5, -5, 0] } : {}}
      transition={{ 
        rotate: { 
          duration: 5, 
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut" 
        }
      }}
    >
      <Icon className={`${sizeMap[size].icon} ${colorClass}`} />
      
      {/* Only add particle effects for advanced stages and above */}
      {animated && (stage === 'advanced' || stage === 'expert' || stage === 'master') && (
        <>
          {/* Orbiting particle */}
          <motion.div 
            className={`absolute w-1.5 h-1.5 rounded-full ${colorClass}`}
            animate={{
              x: [0, 8, 0, -8, 0],
              y: [8, 0, -8, 0, 8]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          
          {/* Small sparkle effect for expert and master */}
          {(stage === 'expert' || stage === 'master') && (
            <motion.div
              className="absolute -top-1 -right-1"
              animate={{ 
                opacity: [0, 0.8, 0],
                scale: [0.8, 1.2, 0.8]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            >
              <div className={`w-2 h-2 rounded-full ${colorClass}`} />
            </motion.div>
          )}
          
          {/* Special aura effect for master level */}
          {stage === 'master' && (
            <motion.div
              className={`absolute inset-0 rounded-full border border-yellow-400`}
              animate={{ 
                opacity: [0.2, 0.6, 0.2],
                scale: [0.9, 1.1, 0.9]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            />
          )}
        </>
      )}
    </motion.div>
  );
};

export default AnimatedStage;