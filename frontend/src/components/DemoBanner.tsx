"use client";

import React, { useState } from 'react';
import { X, PlayCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

const DemoBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const router = useRouter();

  if (!isVisible) return null;

  return (
    <div className="fixed top-20 left-0 right-0 z-[60] bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 shadow-lg border-b border-blue-500">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs md:text-sm">
          <PlayCircle size={16} className="flex-shrink-0" />
             <span className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
               <strong className="text-yellow-300">🚀 Try EDU DATA Demo</strong>
            <span className="hidden sm:inline text-white/80">|</span>
            <span className="text-xs">
              Login: 
              <code className="mx-1 bg-white/20 px-1 py-0.5 rounded text-xs font-mono">
                av.rajpurkarr@gmail.com
              </code>
              <code className="bg-white/20 px-1 py-0.5 rounded text-xs font-mono ml-1">
                zeno181527
              </code>
            </span>
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/sign-in')}
            className="bg-yellow-400 text-blue-900 hover:bg-yellow-300 hover:scale-105 transition-all duration-200 px-3 py-1 rounded text-xs font-bold shadow-md"
          >
            ✨ Try Demo
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200 p-1 rounded"
            aria-label="Close banner"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemoBanner;