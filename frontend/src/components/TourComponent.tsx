import React, { useEffect, useState } from 'react';
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const TransformoDocsLanding: React.FC = () => {
  const [isTourStarted, setIsTourStarted] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && isTourStarted) {
      const driverObj = driver({
        showProgress: true,
        steps: [
          { 
            element: '.hero-section', 
            popover: { 
              title: 'Welcome to EDU DATA', 
              description: 'Revolutionizing document management with AI-powered solutions.' 
            } 
          },
          { 
            element: '.feature-section', 
            popover: { 
              title: 'Core Features', 
              description: 'Explore our key services: AI-Powered Extraction, Automated Conversion, and Workflow Automation.' 
            } 
          },
          { 
            element: '.info-section', 
            popover: { 
              title: 'About Us', 
              description: 'Learn more about our mission and approach to document management.' 
            } 
          },
          { 
            element: '.services-section', 
            popover: { 
              title: 'Our Services', 
              description: 'Discover the comprehensive services we offer.' 
            } 
          }
        ]
      });

      driverObj.drive();
      setIsTourStarted(false);
    }
  }, [isTourStarted]);

  const handleStartTour = () => {
    setIsTourStarted(true);
  };

  return (
    <span 
      onClick={handleStartTour} 
      className="cursor-pointer bg-indigo-600 text-white px-6 py-3 rounded-full hover:bg-indigo-700 transition"
    >
      Start Product Tour
    </span>
  );
};

export default TransformoDocsLanding;