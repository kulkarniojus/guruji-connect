import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  color?: string;
}

interface AchievementUnlockedProps {
  achievement: Achievement;
  onClose?: () => void;
  autoHideDuration?: number;
}

const AchievementUnlocked: React.FC<AchievementUnlockedProps> = ({
  achievement,
  onClose,
  autoHideDuration = 5000 // Auto-hide after 5 seconds by default
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoHideDuration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) setTimeout(onClose, 500); // Call onClose after exit animation
      }, autoHideDuration);
      
      return () => clearTimeout(timer);
    }
  }, [autoHideDuration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) setTimeout(onClose, 500); // Call onClose after exit animation
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed bottom-4 right-4 max-w-sm z-50"
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div 
            className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg shadow-lg p-4 overflow-hidden relative"
            animate={{ boxShadow: ["0 4px 12px rgba(234, 179, 8, 0.1)", "0 4px 20px rgba(234, 179, 8, 0.3)", "0 4px 12px rgba(234, 179, 8, 0.1)"] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 text-gray-500 hover:text-gray-700 hover:bg-yellow-100"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
            
            {/* Achievement content */}
            <div className="flex items-start gap-3">
              {/* Icon with glow effect */}
              <motion.div
                className="bg-yellow-100 p-2 rounded-full relative"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {achievement.icon || <Award className="h-6 w-6 text-yellow-600" />}
                
                {/* Glowing effect */}
                <motion.div 
                  className="absolute inset-0 rounded-full bg-yellow-300 -z-10"
                  animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
              
              <div className="flex-1">
                {/* Achievement unlocked label */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="text-xs font-medium text-yellow-600 uppercase tracking-wide mb-1">
                    Achievement Unlocked!
                  </div>
                </motion.div>
                
                {/* Achievement title */}
                <motion.h3 
                  className="text-lg font-bold text-gray-900 mb-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {achievement.title}
                </motion.h3>
                
                {/* Achievement description */}
                <motion.p 
                  className="text-sm text-gray-600"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  {achievement.description}
                </motion.p>
              </div>
            </div>
            
            {/* Particle effects */}
            <ParticleEffects />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Decorative particle effects
const ParticleEffects: React.FC = () => {
  return (
    <>
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-yellow-400"
          style={{
            top: `${20 + Math.random() * 60}%`,
            left: `${20 + Math.random() * 60}%`,
          }}
          animate={{
            y: [0, -10 - Math.random() * 20],
            x: [0, (Math.random() - 0.5) * 20],
            opacity: [0, 0.8, 0],
            scale: [0, 1, 0]
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2
          }}
        />
      ))}
      
      {/* Light ray effects */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-tr from-transparent via-yellow-200 to-transparent opacity-0"
        animate={{ opacity: [0, 0.1, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
    </>
  );
};

export default AchievementUnlocked;