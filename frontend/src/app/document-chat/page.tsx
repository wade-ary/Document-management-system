"use client";

import React from "react";
import DocumentChatInterface from "../../components/DocumentChatInterface";

/**
 * Document Chat Page
 * AI-powered document search, Q&A, and web search with Claude artifact-like UI
 */
export default function DocumentChatPage() {
  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      {/* Grid Background Pattern */}
      <div className="fixed inset-0 bg-slate-50 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_80%_at_50%_0%,#000_70%,transparent_110%)]"></div>
      </div>
      
      <DocumentChatInterface />
    </div>
  );
}
