"use client";

import React, { useState, useEffect } from 'react';
import { X, User, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface DemoNotificationProps {
  showDelay?: number; // Delay in seconds before showing
  autoHideDuration?: number; // Auto hide after X seconds (0 = don't auto hide)
}

const DemoNotification: React.FC<DemoNotificationProps> = ({ 
  showDelay = 3, 
  autoHideDuration = 0 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const router = useRouter();

  useEffect(() => {
  // Check if user has already dismissed this notification
  const hasSeenDemo = localStorage.getItem('edudata-demo-notification-dismissed');
    
    if (hasSeenDemo) return;

    // Show notification after delay
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, showDelay * 1000);

    // Auto hide if specified
    let hideTimer: NodeJS.Timeout;
    if (autoHideDuration > 0) {
      hideTimer = setTimeout(() => {
        handleClose();
      }, (showDelay + autoHideDuration) * 1000);
    }

    return () => {
      clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [showDelay, autoHideDuration]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
  setIsVisible(false);
  localStorage.setItem('edudata-demo-notification-dismissed', 'true');
    }, 300);
  };

  const handleTryDemo = () => {
    router.push('/sign-in');
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -100, scale: 0.95 }}
        animate={{ 
          opacity: isClosing ? 0 : 1, 
          y: isClosing ? -100 : 0, 
          scale: isClosing ? 0.95 : 1 
        }}
        exit={{ opacity: 0, y: -100, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4"
      >
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl shadow-2xl p-5 border border-blue-300">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
              <span className="font-semibold text-sm">Try EDU DATA Demo</span>
            </div>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="mb-4">
            <p className="text-sm text-white/90 mb-2">
              🚀 Experience our document management system with pre-loaded demo content!
            </p>
            <div className="bg-white/10 rounded-lg p-3 text-xs">
              <div className="flex items-center gap-2 text-white/80">
                <span>📧</span>
                <span className="font-mono">av.rajpurkarr@gmail.com</span>
              </div>
              <div className="flex items-center gap-2 text-white/80 mt-1">
                <span>🔐</span>
                <span className="font-mono">zeno181527</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleTryDemo}
              className="flex-1 bg-white text-blue-600 hover:bg-blue-50 transition-colors rounded-lg py-2 px-4 text-sm font-semibold flex items-center justify-center gap-2"
            >
              Try Demo
              <ArrowRight size={14} />
            </button>
            <button
              onClick={handleClose}
              className="px-3 py-2 text-white/80 hover:text-white transition-colors text-sm"
            >
              Later
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DemoNotification;