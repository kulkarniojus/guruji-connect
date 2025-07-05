import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { 
  Home, 
  Calendar, 
  User, 
  MessageCircle, 
  Bell,
  Settings,
  Menu,
  X,
  Compass,
  BookOpen,
  Video,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MobileNavigationProps {
  className?: string;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({ className }) => {
  const [location, setLocation] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const mainNavItems = [
    { 
      path: '/', 
      icon: Home, 
      label: 'Home',
      color: 'text-blue-600'
    },
    { 
      path: '/dashboard', 
      icon: Compass, 
      label: 'Dashboard',
      color: 'text-purple-600'
    },
    { 
      path: '/booking', 
      icon: Calendar, 
      label: 'Book',
      color: 'text-green-600'
    },
    { 
      path: '/chat', 
      icon: MessageCircle, 
      label: 'Chat',
      color: 'text-orange-600',
      badge: 3
    },
    { 
      path: '/profile', 
      icon: User, 
      label: 'Profile',
      color: 'text-indigo-600'
    }
  ];

  const secondaryNavItems = [
    { 
      path: '/spiritual-journey', 
      icon: BookOpen, 
      label: 'Journey',
      color: 'text-pink-600'
    },
    { 
      path: '/notifications', 
      icon: Bell, 
      label: 'Notifications',
      color: 'text-red-600',
      badge: 5
    },
    { 
      path: '/pujas', 
      icon: Search, 
      label: 'Browse Pujas',
      color: 'text-yellow-600'
    },
    { 
      path: '/video-call/demo', 
      icon: Video, 
      label: 'Video Call',
      color: 'text-teal-600'
    }
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location === path;
    }
    return location.startsWith(path);
  };

  const handleNavigation = (path: string) => {
    setLocation(path);
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 ${className}`}>
        <div className="flex items-center justify-around px-2 py-2">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <motion.button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className="flex flex-col items-center justify-center p-2 rounded-lg min-w-0 flex-1 relative"
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
              >
                <motion.div
                  className={`relative ${active ? item.color : 'text-gray-400'}`}
                  animate={active ? { 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  } : {}}
                  transition={{ duration: 0.5 }}
                >
                  <Icon size={20} />
                  {item.badge && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </motion.div>
                <span className={`text-xs mt-1 font-medium ${active ? item.color : 'text-gray-400'}`}>
                  {item.label}
                </span>
                {active && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full bg-current"
                    initial={false}
                  />
                )}
              </motion.button>
            );
          })}
          
          {/* Menu Button */}
          <motion.button
            onClick={() => setIsMenuOpen(true)}
            className="flex flex-col items-center justify-center p-2 rounded-lg text-gray-400"
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
          >
            <Menu size={20} />
            <span className="text-xs mt-1 font-medium">More</span>
          </motion.button>
        </div>
      </div>

      {/* Slide-out Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-50 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
            />
            
            {/* Menu Panel */}
            <motion.div
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 max-h-80"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="p-4">
                {/* Handle */}
                <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
                
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">More Options</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMenuOpen(false)}
                    className="h-8 w-8"
                  >
                    <X size={16} />
                  </Button>
                </div>
                
                {/* Secondary Navigation Items */}
                <div className="grid grid-cols-2 gap-3">
                  {secondaryNavItems.map((item, index) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    
                    return (
                      <motion.button
                        key={item.path}
                        onClick={() => handleNavigation(item.path)}
                        className={`flex items-center p-3 rounded-xl transition-colors relative ${
                          active 
                            ? 'bg-blue-50 border border-blue-200' 
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className={`${active ? item.color : 'text-gray-600'} relative`}>
                          <Icon size={20} />
                          {item.badge && (
                            <Badge 
                              variant="destructive" 
                              className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                        <span className={`ml-3 font-medium ${active ? item.color : 'text-gray-700'}`}>
                          {item.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
                
                {/* Admin Panel Access */}
                <motion.button
                  onClick={() => handleNavigation('/admin-dashboard')}
                  className="w-full mt-4 p-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium"
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Settings className="inline mr-2" size={16} />
                  Admin Dashboard
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileNavigation;