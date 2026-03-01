"use client"

import Main from '@/components/Main'
import React from 'react'
import AssUI from '@/components/AssistantChat'
import TourButton from '@/components/TourButton'

function page() {
  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Enhanced Grid Pattern Background - Matching Home Page */}
      <div className="absolute inset-0 bg-slate-50">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_80%_at_50%_0%,#000_70%,transparent_110%)]"></div>
      </div>

      {/* Gradient Overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50/40 via-transparent to-slate-100/60 pointer-events-none" />
      
      {/* Main Content */}
      <div className="relative z-10 flex min-h-screen flex-col pt-20 px-2 sm:px-4 lg:px-6 py-4">
        <main className="flex-grow w-full max-w-7xl mx-auto">
          <Main />
          <AssUI />
        </main>
        
        {/* Footer - Matching Home Page Style */}
        <footer className="mt-16 text-center text-lg text-slate-600/80 w-full">
          © 2025 EduData Insight - AI for the Ministry of Education. All rights reserved.
        </footer>
      </div>

      {/* Tour Button */}
      <TourButton />
    </div>
  )
}

export default page