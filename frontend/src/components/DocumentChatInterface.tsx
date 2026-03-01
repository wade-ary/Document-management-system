/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, FileText, Clock, MessageCircle, ChevronDown, ChevronRight, Eye, Mail, Search, Globe, Sparkles, ExternalLink, BookOpen, Zap, Copy, Check, X, Mic, MicOff, Volume2, VolumeX, Pause, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ModernFileList from "@/components/ModernFileList";
import { API_ENDPOINTS } from "@/config/api";
import ReactMarkdown from "react-markdown";
import { File } from "@/app/types";
import { useRouter } from "next/navigation";
import { usePathContext } from "@/app/AppContext";
import { useUser } from "@clerk/nextjs";

interface AgentAction {
  action: string;
  status: "success" | "failed" | "pending" | string | boolean;
  details: {
    success?: boolean;
    query?: string;
    recipient?: string;
    count?: number;
    documents?: DocumentResult[];
    [key: string]: unknown;
  };
}

interface Citation {
  url: string;
  title: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  documents?: DocumentResult[];
  searchQuery?: string;
  messageType?: "search" | "question" | "general" | "agent" | "web";
  thinking?: string;
  actions?: AgentAction[];
  citations?: Citation[];
}

interface DocumentResult {
  file_id: string;
  file_name: string;
  path: string;
  total_score: number;
  semantic_score: number;
  tfidf_score: number;
  bm25_score: number;
  extracted_text_score: number;
  key_topics_score: number;
  file_name_score: number;
  tag_score: number;
  path_score: number;
  tags: string[];
  file_type: string;
  upload_date: string;
  key_topics: string[];
  approvalStatus: string;
  visible: boolean;
  summary?: string;
  preview_text?: string;
}

interface SearchResponse {
  results: DocumentResult[];
  total_found: number;
  search_time: string;
}

interface AgentResponse {
  success: boolean;
  response: string;
  actions: AgentAction[];
  documents: DocumentResult[];
  context: {
    selected_documents: number;
    last_action: Record<string, unknown> | null;
  };
  error?: string;
}

// Artifact panel content type
type ArtifactContent = {
  type: 'empty' | 'web-result' | 'documents' | 'answer';
  title?: string;
  answer?: string;
  citations?: Citation[];
  documents?: DocumentResult[];
  query?: string;
};

const DocumentChatInterface: React.FC = () => {
  const { user } = useUser();
  const router = useRouter();
  const { setViewName } = usePathContext();
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `# Welcome to AI Document Assistant 🤖

I'm an **intelligent agent** that can perform actions on your behalf. Just tell me what you need!

## 🚀 What I Can Do:

### **🔍 Search Documents**
- *"Find all AICTE circulars"*
- *"Show me UGC guidelines from 2024"*

### **📧 Send Documents via Email**
- *"Send this to john@example.com"*
- *"Email these documents to hr@ministry.gov.in"*

### **📝 Summarize Documents**
- *"Summarize this document"*

### **🔄 Compare Documents**
- *"Compare these two circulars"*

### **⚡ Chain Multiple Actions**
- *"Find all AICTE circulars and send them to admin@college.edu"*

## 💡 Pro Tips:
- Use **"this"** or **"these"** to refer to documents from your last search
- I remember context from our conversation

**Ready to help! What would you like me to do?**`,
      timestamp: new Date(),
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<DocumentResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [fileListFiles, setFileListFiles] = useState<File[]>([]);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [mode, setMode] = useState<"search" | "agent" | "web">("agent");
  const [artifact, setArtifact] = useState<ArtifactContent>({ type: 'empty' });
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeakingId, setCurrentSpeakingId] = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [readFullAnswer, setReadFullAnswer] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Handle document click to open in file viewer modal
  const handleDocumentClick = (doc: DocumentResult) => {
    setViewName(doc.file_name);
    router.push("/files");
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          console.log('Speech recognition started');
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join('');
          setCurrentMessage(transcript);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          
          switch (event.error) {
            case 'not-allowed':
              alert('Microphone access denied. Please allow microphone access in your browser settings.');
              break;
            case 'network':
              console.warn('Speech recognition network error');
              break;
            case 'no-speech':
              console.log('No speech detected');
              break;
            case 'audio-capture':
              alert('No microphone found. Please ensure a microphone is connected and try again.');
              break;
            case 'aborted':
              console.log('Speech recognition aborted');
              break;
            default:
              console.warn('Speech recognition error:', event.error);
          }
        };

        recognition.onend = () => {
          console.log('Speech recognition ended');
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } else {
        setIsVoiceSupported(false);
        console.warn('Speech recognition not supported in this browser');
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
      }
    };
  }, []);

  // Handle voice input toggle
  const toggleVoiceInput = async () => {
    if (!isVoiceSupported) {
      alert('Voice input is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (error) {
        console.error('Failed to stop speech recognition:', error);
        setIsListening(false);
      }
    } else {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        recognitionRef.current?.start();
      } catch (error: any) {
        console.error('Failed to start speech recognition:', error);
        setIsListening(false);
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          alert('Microphone access denied. Please allow microphone access in your browser settings and try again.');
        } else if (error.name === 'NotFoundError') {
          alert('No microphone found. Please connect a microphone and try again.');
        } else if (error.message?.includes('already started')) {
          try {
            recognitionRef.current?.stop();
            setTimeout(() => {
              recognitionRef.current?.start();
            }, 100);
          } catch (e) {
            console.error('Failed to restart speech recognition:', e);
          }
        } else {
          console.warn('Speech recognition error - please try again:', error);
        }
      }
    }
  };

  // Extract headings and main content from markdown
  const extractTextForSpeech = (content: string, headingsOnly: boolean = true): string => {
    let text = content;
    
    if (headingsOnly) {
      const lines = content.split('\n');
      const headingParts: string[] = [];
      
      lines.forEach((line) => {
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith('#')) {
          let headingText = trimmedLine.replace(/^#+\s*/, '').trim();
          headingText = headingText
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/\*(.+?)\*/g, '$1')
            .replace(/`(.+?)`/g, '$1')
            .replace(/\[(.+?)\]\(.+?\)/g, '$1');
          
          if (headingText.length > 0) {
            headingParts.push(headingText + '.');
          }
        }
      });
      
      if (headingParts.length > 0) {
        text = headingParts.join(' ');
      } else {
        text = content.substring(0, 200).replace(/[#*_`]/g, '').trim();
      }
    } else {
      text = text
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .replace(/\[(.+?)\]\(.+?\)/g, '$1')
        .replace(/^[-*+]\s/gm, '')
        .replace(/^\d+\.\s/gm, '')
        .replace(/\n{2,}/g, '. ')
        .replace(/\n/g, ' ')
        .trim();
    }
    
    return text;
  };

  // Text-to-Speech function
  const speakText = (text: string, messageId: string) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
      if (currentSpeakingId === messageId) {
        return;
      }
    }

    if (!ttsEnabled) {
      return;
    }

    const headingsOnly = !readFullAnswer;
    const textToSpeak = extractTextForSpeech(text, headingsOnly);
    
    if (!textToSpeak || textToSpeak.trim().length === 0) {
      console.warn('No text to speak after extraction');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setCurrentSpeakingId(messageId);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
    };

    speechSynthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Stop speech
  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setCurrentSpeakingId(null);
  };

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const searchDocuments = async (query: string): Promise<SearchResponse | null> => {
    try {
      const response = await fetch(`${API_ENDPOINTS.SEARCH_EXTENSIVE}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchText: query,
          tags: [],
          fileType: [],
          dateRange: []
        }),
      });
      if (!response.ok) throw new Error(`Search failed: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      console.error("Search error:", error);
      return null;
    }
  };

  // Agentic AI function that calls the backend agent API
  const processWithAgenticAI = async (userInput: string): Promise<{
    content: string;
    documents: DocumentResult[];
    actions: AgentAction[];
    type: string;
    thinking?: string;
  }> => {
    try {
      setCurrentAction("Processing your request...");
      
      const response = await fetch(API_ENDPOINTS.AGENT_CHAT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userInput,
          user_id: user?.id || 'anonymous'
        }),
      });

      if (!response.ok) {
        throw new Error(`Agent request failed: ${response.statusText}`);
      }

      const data: AgentResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Agent processing failed');
      }

      // Update artifact panel with documents if any
      if (data.documents && data.documents.length > 0) {
        setArtifact({
          type: 'documents',
          title: `Found ${data.documents.length} Documents`,
          documents: data.documents,
          query: userInput,
        });
      }

      return {
        content: data.response,
        documents: data.documents || [],
        actions: data.actions || [],
        type: "agent",
        thinking: `Executed ${data.actions?.length || 0} action(s)`
      };
    } catch (error) {
      console.error("Agentic AI error:", error);
      throw error;
    } finally {
      setCurrentAction(null);
    }
  };

  // Web search using Gemini
  const handleWebSearch = async (query: string) => {
    const res = await fetch(`${API_ENDPOINTS.WEB_SEARCH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, external_web_access: true }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Web search failed");
    }
    const data = await res.json();
    const citations = (data.citations || []) as Citation[];
    
    setArtifact({
      type: 'web-result',
      title: `Web Search: "${query}"`,
      answer: data.answer || "No answer returned from web search.",
      citations: citations,
      query: query,
    });

    return {
      type: "web" as const,
      content: data.answer || "No answer returned from web search.",
      documents: [] as DocumentResult[],
      actions: [] as AgentAction[],
      thinking: citations.length > 0 ? `Found ${citations.length} sources` : "No citations returned",
      citations: citations,
    };
  };

  // Document search
  const handleDocumentSearch = async (query: string) => {
    const searchResults = await searchDocuments(query);
    
    if (!searchResults || searchResults.results.length === 0) {
      setArtifact({ type: 'empty' });
      return {
        type: "search" as const,
        content: `No documents found matching **"${query}"**. Try different keywords.`,
        documents: [] as DocumentResult[],
        actions: [] as AgentAction[],
        thinking: `No documents found for: "${query}"`,
      };
    }

    const documents = searchResults.results.slice(0, 8);
    
    setArtifact({
      type: 'documents',
      title: `Found ${searchResults.total_found} Documents`,
      documents: documents,
      query: query,
    });

    return {
      type: "search" as const,
      content: `Found **${searchResults.total_found}** documents for **"${query}"**`,
      documents: documents,
      actions: [] as AgentAction[],
      thinking: `Found ${documents.length} relevant documents`,
    };
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    // Stop voice recognition if active
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: currentMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    const query = currentMessage;
    setCurrentMessage("");

    try {
      let result;
      
      if (mode === "web") {
        result = await handleWebSearch(query);
      } else if (mode === "search") {
        result = await handleDocumentSearch(query);
      } else {
        // Agent mode - use agentic AI
        result = await processWithAgenticAI(query);
      }
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.content,
        timestamp: new Date(),
        documents: result.documents || [],
        searchQuery: query,
        messageType: result.type as "search" | "question" | "general" | "agent" | "web",
        thinking: result.thinking,
        actions: result.actions || [],
        citations: 'citations' in result ? result.citations : undefined,
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (result.documents && result.documents.length > 0) {
        setSelectedDocuments(result.documents);
        setSearchQuery(query);
        setFileListFiles(convertDocumentsToFiles(result.documents));
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Something went wrong: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const convertDocumentsToFiles = (documents: DocumentResult[]): File[] => {
    return documents.map(doc => ({
      fileId: doc.file_id,
      fileName: doc.file_name,
      filePath: doc.path,
      isDirectory: false,
      isApproved: doc.approvalStatus === "approved",
      status: doc.approvalStatus === "approved" ? "analyzed" : "pending",
      uploadStatus: "uploaded" as const,
      uploadDate: new Date(doc.upload_date || Date.now()),
      userId: "",
      fileSize: 0,
      fileType: doc.file_type,
      originalPath: doc.path,
      contentSummary: doc.summary,
      tags: doc.tags,
      uploadedBy: "",
      deadline: null,
      size: 0,
      department: "",
      sensitiveInfoDetected: false,
      redactedVersionAvailable: false,
      processingStatus: "completed" as const,
      redactedVersion: false,
      complianceScore: null,
      redactedPath: null,
      fileViews: null,
      importantPhrases: doc.key_topics,
      embeddings: null,
      viewCount: 0,
      lastAccessed: null,
      lastAccessedBy: null,
      relevanceScore: Math.round(doc.total_score * 100)
    }));
  };

  const copyToClipboard = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getModeIcon = () => {
    switch(mode) {
      case 'web': return <Globe className="w-4 h-4" />;
      case 'search': return <Search className="w-4 h-4" />;
      case 'agent': return <Sparkles className="w-4 h-4" />;
    }
  };

  const getModeLabel = () => {
    switch(mode) {
      case 'web': return 'Web Search';
      case 'search': return 'Document Search';
      case 'agent': return 'AI Agent';
    }
  };

  const suggestedQueries = [
    { icon: <Sparkles className="w-4 h-4" />, text: "Find AICTE circulars and email them", mode: "agent" as const },
    { icon: <Search className="w-4 h-4" />, text: "Find financial reports", mode: "search" as const },
    { icon: <Globe className="w-4 h-4" />, text: "What is SIH 2025?", mode: "web" as const },
  ];

  return (
    <div className="max-w-[95%] mx-auto px-4 py-4">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1 rounded-full text-xs font-medium">
            <Zap className="w-3 h-3" />
            AI-Powered Agent
          </span>
        </div>
        <h1 className="text-2xl lg:text-3xl font-black text-slate-900 leading-tight mb-2">
          Document <span className="text-blue-600">Intelligence</span>
        </h1>
        <p className="text-sm text-slate-600 max-w-3xl">
          Search documents, query the web, or use the AI agent to automate tasks like sending emails.
        </p>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          onClick={() => setMode("agent")}
          className={`p-2 rounded-lg border transition-all ${
            mode === 'agent' 
              ? 'bg-purple-50 border-purple-200 shadow-sm' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-md ${mode === 'agent' ? 'bg-purple-100' : 'bg-slate-100'}`}>
              <Sparkles className={`w-4 h-4 ${mode === 'agent' ? 'text-purple-600' : 'text-slate-600'}`} />
            </div>
            <div className="text-left">
              <p className={`text-xs font-semibold ${mode === 'agent' ? 'text-purple-900' : 'text-slate-900'}`}>
                AI Agent
              </p>
              <p className="text-[10px] text-slate-500">Search + Email + More</p>
            </div>
          </div>
        </button>
        
        <button
          onClick={() => setMode("search")}
          className={`p-2 rounded-lg border transition-all ${
            mode === 'search' 
              ? 'bg-blue-50 border-blue-200 shadow-sm' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-md ${mode === 'search' ? 'bg-blue-100' : 'bg-slate-100'}`}>
              <FileText className={`w-4 h-4 ${mode === 'search' ? 'text-blue-600' : 'text-slate-600'}`} />
            </div>
            <div className="text-left">
              <p className={`text-xs font-semibold ${mode === 'search' ? 'text-blue-900' : 'text-slate-900'}`}>
                Document Search
              </p>
              <p className="text-[10px] text-slate-500">Your files</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setMode("web")}
          className={`p-2 rounded-lg border transition-all ${
            mode === 'web' 
              ? 'bg-emerald-50 border-emerald-200 shadow-sm' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-md ${mode === 'web' ? 'bg-emerald-100' : 'bg-slate-100'}`}>
              <Globe className={`w-4 h-4 ${mode === 'web' ? 'text-emerald-600' : 'text-slate-600'}`} />
            </div>
            <div className="text-left">
              <p className={`text-xs font-semibold ${mode === 'web' ? 'text-emerald-900' : 'text-slate-900'}`}>
                Web Search
              </p>
              <p className="text-[10px] text-slate-500">Gemini + Google</p>
            </div>
          </div>
        </button>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Left Column - Chat Interface */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-200px)] min-h-[600px]">
          {/* Chat Header */}
          <div className="p-2.5 border-b border-slate-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  mode === 'web' ? 'bg-emerald-100' :
                  mode === 'search' ? 'bg-blue-100' : 'bg-purple-100'
                }`}>
                  {getModeIcon()}
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">{getModeLabel()}</h2>
                  <p className="text-xs text-slate-500">
                    {mode === 'web' ? 'Real-time web search' :
                     mode === 'search' ? 'Search your documents' :
                     'AI agent with actions'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* TTS Controls */}
                <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                  <button
                    onClick={() => setTtsEnabled(!ttsEnabled)}
                    className={`p-1.5 rounded-lg transition-all ${
                      ttsEnabled ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
                    title={ttsEnabled ? 'Voice enabled' : 'Voice disabled'}
                  >
                    {ttsEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  </button>
                  {ttsEnabled && (
                    <button
                      onClick={() => setReadFullAnswer(!readFullAnswer)}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                        readFullAnswer 
                          ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title={readFullAnswer ? 'Reading full answers' : 'Reading headings only'}
                    >
                      {readFullAnswer ? 'Full' : 'Brief'}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] text-slate-500">Ready</span>
                </div>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center mb-3">
                  <MessageCircle className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-1.5">Start a Conversation</h3>
                <p className="text-xs text-slate-500 mb-4 max-w-sm">
                  Ask me anything! I can search the web, find documents, or perform actions.
                </p>
                <div className="space-y-1.5 w-full max-w-sm">
                  {suggestedQueries.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setMode(q.mode);
                        setCurrentMessage(q.text);
                        inputRef.current?.focus();
                      }}
                      className="w-full flex items-center gap-2 p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-left text-xs text-slate-700 transition-colors"
                    >
                      <span className="text-slate-400">{q.icon}</span>
                      {q.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`flex gap-3 max-w-[90%] ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                      message.role === "user" 
                        ? "bg-blue-600" 
                        : mode === 'web' ? "bg-emerald-600" :
                          mode === 'search' ? "bg-blue-600" : "bg-purple-600"
                    }`}>
                      {message.role === "user" ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
                    </div>
                    
                    <div className={`rounded-2xl px-5 py-4 ${
                      message.role === "user" 
                        ? "bg-blue-600 text-white" 
                        : "bg-slate-50 border border-slate-200"
                    }`}>
                      <div className={`text-base leading-relaxed ${message.role === "user" ? "text-white" : "text-slate-900"}`}>
                        <ReactMarkdown
                          components={{
                            p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                            strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                            a: ({href, children}) => (
                              <a href={href} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                {children}
                              </a>
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                      
                      {/* Show agent actions performed */}
                      {message.role === "assistant" && message.actions && message.actions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                            <Zap size={12} className="text-yellow-500" />
                            Actions Performed:
                          </div>
                          <div className="space-y-1.5">
                            {message.actions.map((action, idx) => {
                              const isSuccess = action.status === 'success' || 
                                              action.status === true || 
                                              (action.details && action.details.success === true);
                              const isFailed = action.status === 'failed' || action.status === false;
                              
                              return (
                                <div 
                                  key={idx}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                                    isSuccess 
                                      ? 'bg-green-50 border border-green-200' 
                                      : isFailed
                                      ? 'bg-red-50 border border-red-200'
                                      : 'bg-yellow-50 border border-yellow-200'
                                  }`}
                                >
                                  {isSuccess ? (
                                    <CheckCircle size={14} className="text-green-600 flex-shrink-0" />
                                  ) : isFailed ? (
                                    <AlertCircle size={14} className="text-red-600 flex-shrink-0" />
                                  ) : (
                                    <Loader2 size={14} className="text-yellow-600 animate-spin flex-shrink-0" />
                                  )}
                                  <span className={`font-medium ${
                                    isSuccess ? 'text-green-800' : 
                                    isFailed ? 'text-red-800' : 'text-yellow-800'
                                  }`}>
                                    {action.action === 'search_documents' && '🔍 Searched documents'}
                                    {action.action === 'send_email' && '📧 Sent email'}
                                    {action.action === 'summarize_documents' && '📝 Summarized documents'}
                                    {action.action === 'compare_documents' && '🔄 Compared documents'}
                                    {action.action === 'get_document_details' && '📄 Retrieved document details'}
                                    {action.action === 'extract_information' && '📋 Extracted information'}
                                    {action.action === 'list_recent_documents' && '📂 Listed recent documents'}
                                  </span>
                                  {action.details && (
                                    <span className="text-gray-500 ml-auto">
                                      {action.details.query && `"${action.details.query}"`}
                                      {action.details.recipient && `→ ${action.details.recipient}`}
                                      {action.details.count !== undefined && ` (${action.details.count} docs)`}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Message type badge and controls */}
                      {message.role === "assistant" && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {message.messageType && (
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                message.messageType === 'web' ? 'bg-emerald-100 text-emerald-700' :
                                message.messageType === 'search' ? 'bg-blue-100 text-blue-700' :
                                message.messageType === 'agent' ? 'bg-purple-100 text-purple-700' :
                                message.messageType === 'question' ? 'bg-purple-100 text-purple-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {message.messageType === 'web' && <Globe className="w-2.5 h-2.5" />}
                                {message.messageType === 'search' && <FileText className="w-2.5 h-2.5" />}
                                {message.messageType === 'agent' && <Sparkles className="w-2.5 h-2.5" />}
                                {message.messageType === 'question' && <Sparkles className="w-2.5 h-2.5" />}
                                {message.messageType === 'web' ? 'Web' : 
                                 message.messageType === 'search' ? 'Documents' : 
                                 message.messageType === 'agent' ? 'Agent' :
                                 message.messageType === 'question' ? 'Answer' : 'Response'}
                              </span>
                            )}
                            {/* TTS Play/Pause Button */}
                            {ttsEnabled && (
                              <button
                                onClick={() => {
                                  if (isSpeaking && currentSpeakingId === message.id) {
                                    stopSpeaking();
                                  } else {
                                    speakText(message.content, message.id);
                                  }
                                }}
                                className={`p-1 rounded transition-all ${
                                  isSpeaking && currentSpeakingId === message.id
                                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                                }`}
                                title={
                                  isSpeaking && currentSpeakingId === message.id
                                    ? 'Pause speech'
                                    : 'Play speech'
                                }
                              >
                                {isSpeaking && currentSpeakingId === message.id ? (
                                  <Pause size={12} />
                                ) : (
                                  <Volume2 size={12} />
                                )}
                              </button>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                  mode === 'web' ? "bg-emerald-600" :
                  mode === 'search' ? "bg-blue-600" : "bg-purple-600"
                }`}>
                  <Bot size={16} className="text-white" />
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-sm text-slate-500">
                      {currentAction || (mode === 'web' ? 'Searching the web...' :
                       mode === 'search' ? 'Searching documents...' :
                       'Agent is working...')}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-slate-200 flex-shrink-0">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    mode === 'web' ? "Search the web..." :
                    mode === 'search' ? "Search your documents..." :
                    "Ask the agent to do something..."
                  }
                  className="w-full pl-3 pr-10 py-2.5 border border-slate-200 bg-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={isLoading}
                />
                {/* Voice Input Button */}
                {isVoiceSupported && (
                  <button
                    onClick={toggleVoiceInput}
                    disabled={isLoading}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${
                      isListening 
                        ? 'bg-red-100 text-red-600 animate-pulse' 
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={isListening ? 'Listening... Click to stop' : 'Click to speak'}
                  >
                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                )}
              </div>
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !currentMessage.trim()}
                className={`px-3 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
                  mode === 'web' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
                  mode === 'search' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                  'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">
              {isListening ? (
                <span className="text-red-500 font-medium">🎤 Listening... Speak now</span>
              ) : (
                <>
                  Press Enter to send {isVoiceSupported && '• Click mic to speak'}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right Column - Artifact Panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-200px)] min-h-[600px]">
          {/* Artifact Header */}
          <div className="p-2.5 border-b border-slate-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    {artifact.type === 'empty' ? 'Results' : artifact.title || 'Results'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {artifact.type === 'empty' ? 'Your results will appear here' :
                     artifact.type === 'web-result' ? `${artifact.citations?.length || 0} sources` :
                     artifact.type === 'documents' ? `${artifact.documents?.length || 0} documents` :
                     'Answer from documents'}
                  </p>
                </div>
              </div>
              {artifact.type !== 'empty' && (
                <button
                  onClick={() => setArtifact({ type: 'empty' })}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>
          </div>

          {/* Artifact Content */}
          <div className="flex-1 overflow-y-auto">
            {artifact.type === 'empty' ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center mb-3">
                  <BookOpen className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-700 mb-1.5">No Results Yet</h3>
                <p className="text-xs text-slate-500 max-w-xs">
                  Start a search or ask a question to see results, documents, and citations here.
                </p>
              </div>
            ) : artifact.type === 'web-result' ? (
              <div className="p-5 space-y-5">
                {/* Answer Section */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-800">Web Answer</span>
                  </div>
                  <div className="prose prose-base max-w-none text-slate-700 leading-relaxed">
                    <ReactMarkdown
                      components={{
                        p: ({children}) => <p className="mb-3 last:mb-0 text-base">{children}</p>,
                        strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                        a: ({href, children}) => (
                          <a href={href} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {artifact.answer || ''}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* Citations */}
                {artifact.citations && artifact.citations.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Sources ({artifact.citations.length})
                    </h4>
                    <div className="space-y-2.5">
                      {artifact.citations.map((citation, idx) => (
                        <a
                          key={idx}
                          href={citation.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 p-3.5 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors group"
                        >
                          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center border border-slate-200 flex-shrink-0">
                            <span className="text-sm font-bold text-slate-500">{idx + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-medium text-slate-900 truncate group-hover:text-blue-600">
                              {citation.title || 'Source'}
                            </p>
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {citation.url}
                            </p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : artifact.type === 'documents' ? (
              <div className="p-5 space-y-3.5">
                {artifact.documents?.map((doc, idx) => (
                  <div
                    key={doc.file_id}
                    onClick={() => handleDocumentClick(doc)}
                    className="bg-slate-50 hover:bg-blue-50 hover:border-blue-300 rounded-xl p-4 border border-slate-200 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 truncate pr-2 transition-colors">
                            {doc.file_name}
                          </h4>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                              Math.round(doc.total_score * 100) >= 70 
                                ? 'bg-green-100 text-green-700' 
                                : Math.round(doc.total_score * 100) >= 50 
                                ? 'bg-yellow-100 text-yellow-700' 
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                              {Math.round(doc.total_score * 100)}%
                            </span>
                            <Eye className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{doc.path}</p>
                        {doc.key_topics && doc.key_topics.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {doc.key_topics.slice(0, 3).map((topic, i) => (
                              <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                                {topic}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] text-slate-400 mt-2 group-hover:text-blue-500 transition-colors">
                          Click to view details →
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : artifact.type === 'answer' ? (
              <div className="p-5 space-y-5">
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-5 border border-purple-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-semibold text-purple-800">AI Answer</span>
                    <button
                      onClick={() => copyToClipboard(artifact.answer || '', 0)}
                      className="ml-auto p-1.5 hover:bg-purple-100 rounded-lg transition-colors"
                    >
                      {copiedIndex === 0 ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-purple-400" />
                      )}
                    </button>
                  </div>
                  <div className="prose prose-base max-w-none text-slate-700 leading-relaxed">
                    <ReactMarkdown
                      components={{
                        p: ({children}) => <p className="mb-3 last:mb-0 text-base">{children}</p>,
                        strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                      }}
                    >
                      {artifact.answer || ''}
                    </ReactMarkdown>
                  </div>
                </div>

                {artifact.documents && artifact.documents.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 mb-3">Source Documents</h4>
                    <div className="space-y-2">
                      {artifact.documents.map((doc) => (
                        <div
                          key={doc.file_id}
                          onClick={() => handleDocumentClick(doc)}
                          className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-purple-50 hover:border-purple-200 rounded-lg cursor-pointer transition-all group border border-transparent"
                        >
                          <div className="w-8 h-8 bg-blue-100 group-hover:bg-purple-100 rounded-lg flex items-center justify-center transition-colors">
                            <FileText className="w-4 h-4 text-blue-600 group-hover:text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 group-hover:text-purple-700 truncate transition-colors">
                              {doc.file_name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">
                              {Math.round(doc.total_score * 100)}%
                            </span>
                            <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-500 transition-colors" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentChatInterface;
