import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { ArrowLeft, Bell, Search, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MobileHeaderProps {
  title?: string;
  showBackButton?: boolean;
  actions?: ReactNode;
  className?: string;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  showBackButton = false,
  actions,
  className = ''
}) => {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    window.history.back();
  };

  return (
    <motion.header
      className={`bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 ${className}`}
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Left Section */}
      <div className="flex items-center flex-1 min-w-0">
        {showBackButton && (
          <motion.button
            onClick={handleBack}
            className="mr-3 p-2 -ml-2 rounded-full hover:bg-gray-100"
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </motion.button>
        )}
        
        {title && (
          <h1 className="text-lg font-semibold text-gray-900 truncate">
            {title}
          </h1>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-2">
        {actions || (
          <>
            {/* Search Button */}
            <motion.button
              onClick={() => setLocation('/pujas')}
              className="p-2 rounded-full hover:bg-gray-100 relative"
              whileTap={{ scale: 0.95 }}
            >
              <Search size={20} className="text-gray-600" />
            </motion.button>

            {/* Notifications Button */}
            <motion.button
              onClick={() => setLocation('/notifications')}
              className="p-2 rounded-full hover:bg-gray-100 relative"
              whileTap={{ scale: 0.95 }}
            >
              <Bell size={20} className="text-gray-600" />
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
              >
                5
              </Badge>
            </motion.button>

            {/* Menu Button */}
            <motion.button
              className="p-2 rounded-full hover:bg-gray-100"
              whileTap={{ scale: 0.95 }}
            >
              <MoreVertical size={20} className="text-gray-600" />
            </motion.button>
          </>
        )}
      </div>
    </motion.header>
  );
};

export default MobileHeader;