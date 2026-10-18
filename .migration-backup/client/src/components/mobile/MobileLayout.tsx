import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import MobileNavigation from './MobileNavigation';
import MobileHeader from './MobileHeader';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
  showBackButton?: boolean;
  showHeader?: boolean;
  showNavigation?: boolean;
  headerActions?: ReactNode;
  className?: string;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  title,
  showBackButton = false,
  showHeader = true,
  showNavigation = true,
  headerActions,
  className = ''
}) => {
  const isMobile = useIsMobile();

  // For non-mobile devices, just render children without mobile wrapper
  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Mobile Header */}
      {showHeader && (
        <MobileHeader
          title={title}
          showBackButton={showBackButton}
          actions={headerActions}
        />
      )}

      {/* Main Content */}
      <motion.main
        className={`flex-1 overflow-auto ${showNavigation ? 'pb-20' : 'pb-4'} ${className}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.main>

      {/* Mobile Navigation */}
      {showNavigation && <MobileNavigation />}
    </div>
  );
};

export default MobileLayout;