import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';

const SimpleBookingDemo: React.FC = () => {
  // State for demo
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    // Create an iframe that loads the standalone HTML demo
    const iframe = document.createElement('iframe');
    iframe.src = '/booking-notification-demo.html';
    iframe.style.width = '100%';
    iframe.style.height = '100vh';
    iframe.style.border = 'none';
    
    // Insert the iframe into the demo container
    const container = document.getElementById('demo-container');
    if (container) {
      container.innerHTML = '';
      container.appendChild(iframe);
      setIsLoaded(true);
    }
    
    return () => {
      // Cleanup
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);
  
  return (
    <div className="bg-gray-50 min-h-screen">
      <Helmet>
        <title>Booking Notification Demo - GurujiConnect</title>
      </Helmet>
      
      <div id="demo-container" className="w-full h-screen">
        {!isLoaded && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleBookingDemo;