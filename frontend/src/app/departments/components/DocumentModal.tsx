/**
 * DocumentModal Component
 * Handles the document detail modal with PDF viewer and extraction results
 */

"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import ChatUI from "../../../components/AgentChat";
import TranslationModal from "../../../components/TranslationModal";
import DiscussionsTab from "../../../components/discussions/DiscussionsTab";
import ShareCard from "../../../components/sharing/ShareCard";
import UserRoleSelector from "../../../components/sharing/UserRoleSelector";
import { Spinner, Button } from "@nextui-org/react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaTimes, FaForward, FaReply } from "react-icons/fa";
import { Department, departments } from "../departmentConfig";
import { DocInfo } from "./DocumentList";
import { API_ENDPOINTS } from "@/config/api";
import API_BASE_URL from "@/config/api";
import Image from "next/image";
import { Share, ShareRecipient } from "@/types/sharing";
import { SearchManager } from "@/utils/SearchManager";
export interface Signature {
  bbox: number[];
  confidence: number;
  method: string;
  storage_uri: string;
  page_number: number;
  features?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  signature_info?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface ExtractionResults {
  summary: string;
  actionableItems: string[];
  tables: string[];
  signatures: Signature[];
  tables_full?: TableFull[];
  whole_document_table?: {
    rows: string[][];
    headers: string[];
    row_count: number;
    col_count: number;
    total_pages?: number;
    type?: string;
    structured_data?: string[][];
  };
  individual_tables?: TableFull[];
  table_summary?: string;
}

export interface TableFull {
  page_number?: number;
  table_id?: string;
  method?: string;
  csv_uri?: string;
  rows?: string[][];
  headers?: string[];
  row_count?: number;
  col_count?: number;
  structured_data?: string[][];
  is_valid?: boolean;
  type?: string;
  bbox?: unknown;
  csv_rows?: string[][];
}

interface ActionPoint {
  title: string;
  description: string;
  deadline: string;
  priority: 'high' | 'medium' | 'low';
}

interface DocumentModalProps {
  isOpen: boolean;
  selectedDoc: DocInfo | null;
  extractionResults: ExtractionResults | null;
  isLoadingExtraction: boolean;
  enrichedTables: TableFull[] | null;
  onClose: () => void;
  onForwardDocument: (toDepartment: Department) => void;
  onReplyToAdmin: () => void;
  buildUnifiedTable: (tables: TableFull[] | null, previewLines: string[] | undefined) => {
    header: string[];
    body: string[][];
    colCount: number;
    csvLinks?: string[];
  };
}

export default function DocumentModal({
  isOpen,
  selectedDoc,
  extractionResults,
  isLoadingExtraction,
  // enrichedTables, // Unused parameter
  onClose,
  onForwardDocument,
  onReplyToAdmin,
  // buildUnifiedTable, // Unused parameter
}: DocumentModalProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'actions' | 'chat' | 'content' | 'share' | 'discussions' | 'translation' | 'precedents'>('preview');
  const [showForwardDropdown, setShowForwardDropdown] = useState(false);
  // Added states for integrated features
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [loadingExtracted, setLoadingExtracted] = useState(false);
  const [complianceSummary, setComplianceSummary] = useState<any | null>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [loadingCompliance, setLoadingCompliance] = useState(false);
  const [deptSummaries, setDeptSummaries] = useState<Record<string, string>>({});
  const [deptActionPoints, setDeptActionPoints] = useState<Record<string, ActionPoint[]>>({});
  const [documentSummary, setDocumentSummary] = useState<string>("");
  const [documentActionPoints, setDocumentActionPoints] = useState<ActionPoint[]>([]);
  const { user } = useUser();
  
  // Share functionality states
  const [selectedRecipients, setSelectedRecipients] = useState<ShareRecipient[]>([]);
  const [sharePermission, setSharePermission] = useState<'view' | 'comment' | 'edit'>('view');
  const [shareExpiration, setShareExpiration] = useState('');
  const [sharePassword, setSharePassword] = useState('');
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [activeShares, setActiveShares] = useState<Share[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);
  
  // Precedent finder states
  const [precedentSubTab, setPrecedentSubTab] = useState<'search' | 'comparison' | 'analysis'>('search');
  const [similarityThreshold, setSimilarityThreshold] = useState(0.3);
  const [precedentFileTypes, setPrecedentFileTypes] = useState<string[]>(['pdf', 'docx']);
  const [precedentResults, setPrecedentResults] = useState<any[]>([]);
  const [precedentTotalFound, setPrecedentTotalFound] = useState(0);
  const [precedentLoading, setPrecedentLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Fetch metadata / extracted text when modal opens or selected doc changes
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!isOpen || !selectedDoc?.name) return;
      setLoadingExtracted(true);
      try {
        const res = await fetch(API_ENDPOINTS.GET_METADATA, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: selectedDoc.name, user_id: user?.id }),
        });
        if (res.ok) {
          const data = await res.json();
          setExtractedText(data.extracted_text || null);
          // New document-level data
          setDocumentSummary(data.document_summary || "");
          setDocumentActionPoints(data.document_action_points || []);
          // Legacy department-specific data (for backward compatibility)
          setDeptSummaries(data.dept_summaries || {});
          setDeptActionPoints(data.dept_action_points || {});
        } else {
          setExtractedText("Failed to fetch extracted text.");
        }
      } catch (e) {
        console.error(e);
        setExtractedText("Failed to fetch extracted text.");
      } finally {
        setLoadingExtracted(false);
      }
    };
    fetchMetadata();
  }, [isOpen, selectedDoc, user?.id]);

  // Load shares when Share tab is opened
  useEffect(() => {
    if (activeTab === 'share' && selectedDoc?.file_id) {
      loadShares();
    }
  }, [activeTab, selectedDoc?.file_id]);

  const loadShares = async () => {
    if (!selectedDoc?.file_id || !user?.id) return;
    setLoadingShares(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/shares/file/${selectedDoc.file_id}?user_id=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setActiveShares(data.shares || []);
      }
    } catch (error) {
      console.error('Failed to load shares:', error);
    } finally {
      setLoadingShares(false);
    }
  };

  const handleCreateShare = async () => {
    if (!selectedDoc?.file_id || !user?.id || selectedRecipients.length === 0) return;
    
    setLoadingShares(true);
    try {
      const shareData = {
        file_id: selectedDoc.file_id,
        file_name: selectedDoc.name,
        shared_by: user.id,
        recipients: selectedRecipients,
        permission: sharePermission,
        expires_at: shareExpiration || undefined,
        password: passwordEnabled ? sharePassword : undefined,
        message: shareMessage || undefined,
      };

      const response = await fetch(`${API_BASE_URL}/api/shares/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shareData),
      });

      if (response.ok) {
        toast.success('Document shared successfully!');
        setSelectedRecipients([]);
        setShareMessage('');
        setSharePassword('');
        setPasswordEnabled(false);
        setShareExpiration('');
        loadShares();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to share document');
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to share document');
    } finally {
      setLoadingShares(false);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/shares/${shareId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });

      if (response.ok) {
        toast.success('Share revoked successfully');
        loadShares();
      } else {
        toast.error('Failed to revoke share');
      }
    } catch (error) {
      console.error('Revoke error:', error);
      toast.error('Failed to revoke share');
    }
  };

  const handleCopyLink = async (shareId: string) => {
    const link = `${window.location.origin}/shared/${shareId}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      console.error('Copy error:', error);
      toast.error('Failed to copy link');
    }
  };

  // Precedent finder functions
  const togglePrecedentFileType = (type: string) => {
    setPrecedentFileTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const searchPrecedents = async () => {
    if (!selectedDoc?.file_id) return;
    
    setPrecedentLoading(true);
    try {
      const result = await SearchManager.findPrecedents({
        file_id: selectedDoc.file_id,
        similarity_threshold: similarityThreshold,
        file_types: precedentFileTypes.length > 0 ? precedentFileTypes : undefined,
        top_k: 10,
      });

      if (result.success && result.results) {
        setPrecedentResults(result.results);
        setPrecedentTotalFound(result.total_found || 0);
      } else {
        toast.error(result.error || 'Failed to find precedents');
        setPrecedentResults([]);
      }
    } catch (error) {
      console.error('Precedent search error:', error);
      toast.error('Failed to search precedents');
      setPrecedentResults([]);
    } finally {
      setPrecedentLoading(false);
    }
  };

  const compareDocuments = async (fileId1: string, fileId2: string) => {
    setComparisonLoading(true);
    try {
      const result = await SearchManager.compareDocuments(fileId1, fileId2);
      
      if (result.success && result.data) {
        setComparisonData(result.data);
        setPrecedentSubTab('comparison');
      } else {
        toast.error(result.error || 'Failed to compare documents');
      }
    } catch (error) {
      console.error('Comparison error:', error);
      toast.error('Failed to compare documents');
    } finally {
      setComparisonLoading(false);
    }
  };

  const analyzePrecedent = async (currentFileId: string, precedentFileId: string) => {
    setAnalysisLoading(true);
    try {
      const result = await SearchManager.analyzePrecedent(currentFileId, precedentFileId);
      
      if (result.success && result.data) {
        setAnalysisData(result.data);
        setPrecedentSubTab('analysis');
      } else {
        toast.error(result.error || 'Failed to analyze precedent');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze precedent');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const getPrecedentRelevanceColor = (score: number) => {
    if (score >= 0.7) return 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300';
    if (score >= 0.4) return 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300';
    return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300';
  };

  const handleRedact = async () => {
    if (!selectedDoc?.name) return;
    await toast.promise(
      (async () => {
        const res = await fetch(API_ENDPOINTS.REDACT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file_name: selectedDoc.name, file_id: selectedDoc.file_id })
        });
        if (!res.ok) {
          const err = await res.json();
            throw new Error(err.error || 'Redaction failed');
        }
        const data = await res.json();
        return data.message || 'Redaction complete';
      })(),
      {
        pending: `Redacting "${selectedDoc.name}"...`,
        success: { render({ data }) { return `Redacted: ${data}`; } },
        error: { render({ data }: { data?: unknown }) { return (typeof data === 'object' && data && 'message' in data) ? String((data as Record<string, unknown>).message) : 'Redaction error'; } }
      }
    );
  };

  if (!isOpen || !selectedDoc) return null;

  const getForwardDepartments = (): Department[] => {
    const currentDept = selectedDoc?.relatedDepts?.[0];
    return departments.filter(dept => dept !== currentDept);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-hidden" 
      onClick={() => {
        onClose();
        setShowForwardDropdown(false);
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden" 
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-2xl font-bold text-gray-800">{selectedDoc.name}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">
            <FaTimes className="text-gray-600"/>
          </button>
        </div>
        
        {/* Modal Content - Two Columns */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Column - PDF Viewer */}
          <div className="w-1/2 bg-gray-100 border-r flex flex-col">
            <h3 className="font-semibold px-5 pt-3 text-gray-700">Document Preview</h3>
            <div className="flex-1 p-4 overflow-auto min-h-0">
              {selectedDoc?.file_id ? (
                <iframe
                  src={`${API_BASE_URL}/api/objects/${selectedDoc.file_id}`}
                  className="w-full h-full border rounded-lg"
                  title="Document Preview"
                  onLoad={() => console.log('PDF iframe loaded successfully')}
                  onError={() => console.log('PDF iframe failed to load')}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <p>Document preview not available</p>
                    <p className="text-sm mt-2">File ID: {selectedDoc?.file_id || 'Not found'}</p>
                    <p className="text-sm">Document ID: {selectedDoc?._id || 'Not found'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Right Column - Interactive Extraction Results */}
          <div className="w-1/2 flex flex-col relative">
            {/* Tab Buttons */}
            <div className="bg-gradient-to-r from-slate-50 via-slate-50/50 to-white px-4 py-3.5 border-b border-slate-200/80 flex-shrink-0">
              <div className="grid grid-cols-4 gap-2.5">
                {/* First Row */}
                <button 
                  onClick={() => setActiveTab("preview")}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 border-2 transform ${
                    activeTab === "preview" 
                      ? "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 border-blue-300 shadow-md scale-[1.02]" 
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm hover:scale-[1.01]"
                  }`}
                >
                  📄 Preview
                </button>
                
                <button 
                  onClick={() => setActiveTab("actions")}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 border-2 transform ${
                    activeTab === "actions" 
                      ? "bg-gradient-to-br from-green-50 to-green-100 text-green-700 border-green-300 shadow-md scale-[1.02]" 
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm hover:scale-[1.01]"
                  }`}
                >
                  ✅ Actions
                </button>
                
                <button 
                  onClick={() => setActiveTab("chat")}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 border-2 transform ${
                    activeTab === "chat" 
                      ? "bg-gradient-to-br from-purple-50 to-purple-100 text-purple-700 border-purple-300 shadow-md scale-[1.02]" 
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm hover:scale-[1.01]"
                  }`}
                >
                  💬 Chat
                </button>
                
                <button 
                  onClick={() => setActiveTab("content")}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 border-2 transform ${
                    activeTab === "content" 
                      ? "bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-700 border-indigo-300 shadow-md scale-[1.02]" 
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm hover:scale-[1.01]"
                  }`}
                >
                  📄 Content
                </button>
                
                {/* Second Row */}
                <button 
                  onClick={() => setActiveTab("share")}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 border-2 transform ${
                    activeTab === "share" 
                      ? "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 border-blue-300 shadow-md scale-[1.02]" 
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm hover:scale-[1.01]"
                  }`}
                >
                  🔗 Share
                </button>
                
                <button 
                  onClick={() => setActiveTab("discussions")}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 border-2 transform ${
                    activeTab === "discussions" 
                      ? "bg-gradient-to-br from-orange-50 to-orange-100 text-orange-700 border-orange-300 shadow-md scale-[1.02]" 
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm hover:scale-[1.01]"
                  }`}
                >
                  💬 Discussions
                </button>
                
                <button 
                  onClick={() => setActiveTab("translation")}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 border-2 transform ${
                    activeTab === "translation" 
                      ? "bg-gradient-to-br from-cyan-50 to-cyan-100 text-cyan-700 border-cyan-300 shadow-md scale-[1.02]" 
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm hover:scale-[1.01]"
                  }`}
                >
                  🌐 Translation
                </button>
                
                <button 
                  onClick={() => setActiveTab("precedents")}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 border-2 transform ${
                    activeTab === "precedents" 
                      ? "bg-gradient-to-br from-rose-50 to-rose-100 text-rose-700 border-rose-300 shadow-md scale-[1.02]" 
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm hover:scale-[1.01]"
                  }`}
                >
                  🔍 Precedents
                </button>
              </div>
            </div>
            
            {/* Tab Content */}
            <div className="flex-1 p-5 overflow-y-auto min-h-0 pb-4">{/* content scroll area; footer bar below */}
              {isLoadingExtraction ? (
                <div className="text-center text-blue-600 font-semibold">
                  Loading extraction results...
                </div>
              ) : extractionResults ? (
                <>
                  {/* New Preview Tab */}
                  {activeTab === 'preview' && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">Document Preview</h3>
                      
                      {/* File Metadata Section */}
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="text-lg font-semibold text-blue-800 mb-3">File Information</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div><strong className="text-gray-700">File Name:</strong> <span className="text-gray-600">{selectedDoc.name}</span></div>
                          <div><strong className="text-gray-700">File ID:</strong> <span className="text-gray-600 font-mono text-xs">{selectedDoc.file_id || 'N/A'}</span></div>
                          <div><strong className="text-gray-700">Department:</strong> <span className="text-gray-600">{selectedDoc.relatedDepts?.[0] || 'N/A'}</span></div>
                          <div><strong className="text-gray-700">Deadline:</strong> <span className="text-gray-600">{selectedDoc.deadline || 'N/A'}</span></div>
                          <div><strong className="text-gray-700">Language:</strong> <span className="text-gray-600">{selectedDoc.language || 'N/A'}</span></div>
                          <div><strong className="text-gray-700">Status:</strong> <span className="text-gray-600">{selectedDoc.status || 'Active'}</span></div>
                          <div><strong className="text-gray-700">Source:</strong> <span className="text-gray-600">{selectedDoc.source || 'N/A'}</span></div>
                          <div><strong className="text-gray-700">Document Type:</strong> <span className="text-gray-600">{selectedDoc.docType || 'N/A'}</span></div>
                          <div><strong className="text-gray-700">Regulatory:</strong> <span className="text-gray-600">{selectedDoc.isRegulatory ? 'Yes' : 'No'}</span></div>
                          <div><strong className="text-gray-700">Action Items:</strong> <span className="text-gray-600">{selectedDoc.actionableItems?.length || 0} items</span></div>
                        </div>
                      </div>

                      <h4 className="text-lg font-semibold text-gray-800 mt-6">Extracted Text Preview</h4>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-[45vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                        {loadingExtracted ? (
                          <div className="flex items-center gap-2 text-gray-500"><Spinner size="sm" /> Loading text...</div>
                        ) : extractedText ? extractedText : <span className="text-gray-400">No extracted text available.</span>}
                      </div>
                    </div>
                  )}
                  {/* New Chat Tab */}
                  {activeTab === 'chat' && (
                    <div className="space-y-4 h-full flex flex-col">
                      <div className="flex-1 min-h-0 bg-white border rounded-lg shadow-inner overflow-hidden">
                        <ChatUI 
                          filepath={selectedDoc.file_id ? `api/objects/${selectedDoc.file_id}` : ''} 
                          filename={selectedDoc.name} 
                          fileId={selectedDoc.file_id} 
                          userId={user?.id} 
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Actions Tab (includes summary and action points) */}
                  {activeTab === 'actions' && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-gray-800 mb-4">Document Summary</h3>
                      
                      {/* Document-Level Summary (New) */}
                      {documentSummary && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span>
                            Document Summary
                          </h4>
                          <p className="text-gray-700 leading-relaxed">{documentSummary}</p>
                        </div>
                      )}
                      
                      {/* Department-Specific Summaries (Legacy - for backward compatibility) */}
                      {Object.keys(deptSummaries).length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-semibold text-gray-800 mb-3">Department-Specific Summaries</h4>
                          {Object.entries(deptSummaries).map(([dept, summary]) => (
                            <div key={dept} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span>
                                <h5 className="font-medium text-gray-800 capitalize">{dept} Department</h5>
                              </div>
                              <p className="text-gray-700 leading-relaxed text-sm">{summary}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Fallback if no summaries */}
                      {!extractionResults.summary && !documentSummary && Object.keys(deptSummaries).length === 0 && (
                        <div className="text-center text-gray-500 py-8">
                          <p>No summary available for this document.</p>
                        </div>
                      )}

                      {/* Action Points Section */}
                      <h3 className="text-xl font-bold text-gray-800 mb-4 mt-6">Actionable Items</h3>
                      
                      {/* Document-Level Action Points (New) */}
                      {documentActionPoints && documentActionPoints.length > 0 && (
                        <div className="space-y-3 mb-6">
                          <h4 className="font-semibold text-gray-800 mb-3">Document Action Points</h4>
                          {documentActionPoints.map((action, idx) => (
                            <div key={idx} className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                              <div className="flex items-start justify-between mb-2">
                                <h6 className="font-medium text-gray-800">{action.title}</h6>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  action.priority === 'high' ? 'bg-red-100 text-red-800' :
                                  action.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {action.priority}
                                </span>
                              </div>
                              <p className="text-gray-700 leading-relaxed text-sm mb-2">{action.description}</p>
                              {action.deadline && (
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span>Due: {new Date(action.deadline).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* General Actionable Items */}
                      {extractionResults.actionableItems && extractionResults.actionableItems.length > 0 && (
                        <div className="space-y-3 mb-6">
                          <h4 className="font-semibold text-gray-800 mb-3">General Action Items</h4>
                          {extractionResults.actionableItems.map((item, i) => (
                            <div key={i} className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
                              <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                                  {i + 1}
                                </div>
                                <p className="text-gray-800 leading-relaxed">{item}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Department-Specific Action Points */}
                      {Object.keys(deptActionPoints).length > 0 && (
                        <div className="space-y-4">
                          <h4 className="font-semibold text-gray-800 mb-3">Department-Specific Action Points</h4>
                          {Object.entries(deptActionPoints).map(([dept, actions]) => (
                            <div key={dept} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span>
                                <h5 className="font-medium text-gray-800 capitalize">{dept} Department</h5>
                              </div>
                              <div className="space-y-3">
                                {actions.map((action, idx) => (
                                  <div key={idx} className="bg-white p-3 rounded-md border border-gray-100 shadow-sm">
                                    <div className="flex items-start justify-between mb-2">
                                      <h6 className="font-medium text-gray-800 text-sm">{action.title}</h6>
                                      <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                          action.priority === 'high' ? 'bg-red-100 text-red-800' :
                                          action.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-green-100 text-green-800'
                                        }`}>
                                          {action.priority}
                                        </span>
                                      </div>
                                    </div>
                                    <p className="text-gray-600 text-sm mb-2">{action.description}</p>
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                      <span>Due: {new Date(action.deadline).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Fallback if no action items */}
                      {(!extractionResults.actionableItems || extractionResults.actionableItems.length === 0) && 
                       (!documentActionPoints || documentActionPoints.length === 0) && 
                       Object.keys(deptActionPoints).length === 0 && (
                        <div className="text-center text-gray-500 py-8">
                          <div className="text-4xl mb-4">⚠️</div>
                          <p>No actionable items found in this document.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content Tab */}
                  {activeTab === 'content' && (
                    <div className="space-y-4">
                      <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                        <span className="text-slate-600">📄</span>
                        Document Content
                      </h4>
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 max-h-96 overflow-y-auto">
                        <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                          {extractedText || (
                            <span className="flex items-center gap-2 text-slate-500">
                              <Spinner size="sm" />
                              Loading content...
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Share Tab */}
                  {activeTab === 'share' && (
                    <div className="space-y-6">
                      {/* Share Form */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
                        <h5 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                          <span className="text-xl">🔗</span>
                          Share This Document
                        </h5>
                        
                        {/* User/Role Search */}
                        <div className="mb-4">
                          <label className="text-sm font-medium text-blue-800 mb-2 block">
                            Share With
                          </label>
                          <p className="text-xs text-blue-600 mb-2">Search for users or select roles to share with</p>
                          <UserRoleSelector
                            selectedRecipients={selectedRecipients}
                            onRecipientsChange={setSelectedRecipients}
                          />
                        </div>

                        {/* Permission Level */}
                        <div className="mb-4">
                          <label className="text-sm font-medium text-blue-800 mb-2 block">
                            Permission Level
                          </label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSharePermission('view')}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                sharePermission === 'view'
                                  ? 'bg-blue-600 text-white shadow-md'
                                  : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-300'
                              }`}
                            >
                              View Only
                            </button>
                            <button
                              onClick={() => setSharePermission('comment')}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                sharePermission === 'comment'
                                  ? 'bg-yellow-600 text-white shadow-md'
                                  : 'bg-white text-slate-700 border border-slate-200 hover:border-yellow-300'
                              }`}
                            >
                              Comment
                            </button>
                            <button
                              onClick={() => setSharePermission('edit')}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                sharePermission === 'edit'
                                  ? 'bg-green-600 text-white shadow-md'
                                  : 'bg-white text-slate-700 border border-slate-200 hover:border-green-300'
                              }`}
                            >
                              Edit
                            </button>
                          </div>
                        </div>

                        {/* Expiration Date */}
                        <div className="mb-4">
                          <label className="text-sm font-medium text-blue-800 mb-2 block">
                            Expiration Date (Optional)
                          </label>
                          <input
                            type="datetime-local"
                            value={shareExpiration}
                            onChange={(e) => setShareExpiration(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:border-blue-400 focus:outline-none"
                          />
                        </div>

                        {/* Password Protection */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-blue-800">
                              🔒 Password Protection
                            </label>
                            <button
                              onClick={() => setPasswordEnabled(!passwordEnabled)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                passwordEnabled ? 'bg-blue-600' : 'bg-slate-300'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  passwordEnabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                          {passwordEnabled && (
                            <input
                              type="password"
                              value={sharePassword}
                              onChange={(e) => setSharePassword(e.target.value)}
                              placeholder="Enter password"
                              className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:border-blue-400 focus:outline-none"
                            />
                          )}
                        </div>

                        {/* Message */}
                        <div className="mb-4">
                          <label className="text-sm font-medium text-blue-800 mb-2 block">
                            💬 Add Message (Optional)
                          </label>
                          <textarea
                            value={shareMessage}
                            onChange={(e) => setShareMessage(e.target.value)}
                            placeholder="Write a message for recipients..."
                            rows={3}
                            className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:border-blue-400 focus:outline-none resize-none"
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button
                            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl"
                            size="lg"
                            onClick={handleCreateShare}
                            isDisabled={selectedRecipients.length === 0 || loadingShares}
                          >
                            {loadingShares ? <Spinner size="sm" color="white" /> : '✅ Share Document'}
                          </Button>
                        </div>
                      </div>

                      {/* Active Shares List */}
                      <div className="bg-white rounded-xl border-2 border-slate-200 p-6">
                        <h5 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                          <span className="text-xl">👥</span>
                          Active Shares ({activeShares.length})
                        </h5>
                        
                        {loadingShares ? (
                          <div className="flex justify-center py-8">
                            <Spinner size="lg" />
                          </div>
                        ) : activeShares.length > 0 ? (
                          <div className="space-y-3">
                            {activeShares.map((share) => (
                              <ShareCard
                                key={share._id}
                                share={share}
                                onRevoke={handleRevokeShare}
                                onCopyLink={handleCopyLink}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-slate-500">
                            <span className="text-4xl block mb-2">📭</span>
                            <p className="text-sm">No active shares yet</p>
                            <p className="text-xs mt-1">Share this document to see it here</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Discussions Tab */}
                  {activeTab === 'discussions' && (
                    <div className="h-full">
                      <DiscussionsTab 
                        fileId={selectedDoc?.file_id || ''}
                        fileName={selectedDoc?.name || ''}
                      />
                    </div>
                  )}

                  {/* Translation Tab */}
                  {activeTab === 'translation' && (
                    <TranslationModal 
                      extractedText={extractedText}
                      fileId={selectedDoc?.file_id}
                      fileName={selectedDoc?.name}
                    />
                  )}

                  {/* Precedents Tab - New */}
                  {activeTab === 'precedents' && selectedDoc?.file_id && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-xl text-slate-800">Precedent Finder</h4>
                      </div>
                      
                      {/* Sub-tabs */}
                      <div className="flex gap-2 border-b border-gray-200 mb-4">
                        <button
                          onClick={() => setPrecedentSubTab("search")}
                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            precedentSubTab === "search"
                              ? "border-blue-500 text-blue-600"
                              : "border-transparent text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          🔍 Search Precedents
                        </button>
                        <button
                          onClick={() => setPrecedentSubTab("comparison")}
                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            precedentSubTab === "comparison"
                              ? "border-blue-500 text-blue-600"
                              : "border-transparent text-gray-500 hover:text-gray-700"
                          } ${!comparisonData ? "opacity-50 cursor-not-allowed" : ""}`}
                          disabled={!comparisonData}
                        >
                          ⚖️ Compare ({comparisonData ? "Ready" : "None"})
                        </button>
                        <button
                          onClick={() => setPrecedentSubTab("analysis")}
                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            precedentSubTab === "analysis"
                              ? "border-blue-500 text-blue-600"
                              : "border-transparent text-gray-500 hover:text-gray-700"
                          } ${!analysisData ? "opacity-50 cursor-not-allowed" : ""}`}
                          disabled={!analysisData}
                        >
                          🧠 Analysis ({analysisData ? "Ready" : "None"})
                        </button>
                      </div>

                      {/* Search Sub-tab */}
                      {precedentSubTab === "search" && (
                        <div className="space-y-4">
                          {/* Filters */}
                          <div className="bg-gradient-to-br from-gray-50 via-slate-50/50 to-gray-50 p-5 rounded-xl border-2 border-gray-200/80 shadow-md space-y-5">
                            {/* Similarity Threshold */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Similarity Threshold: {(similarityThreshold * 100).toFixed(0)}%
                              </label>
                              <input
                                type="range"
                                min="0.1"
                                max="1.0"
                                step="0.05"
                                value={similarityThreshold}
                                onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                              />
                              <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>10% (Broad)</span>
                                <span>100% (Exact)</span>
                              </div>
                            </div>

                            {/* File Type Filter */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                File Types
                              </label>
                              <div className="flex gap-2.5 flex-wrap">
                                {['pdf', 'docx', 'txt', 'pptx'].map((type) => (
                                  <button
                                    key={type}
                                    onClick={() => togglePrecedentFileType(type)}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 transform ${
                                      precedentFileTypes.includes(type)
                                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md scale-105'
                                        : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-200 hover:border-gray-300 hover:shadow-sm hover:scale-105'
                                    }`}
                                  >
                                    {type.toUpperCase()}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Search Button */}
                            <button
                              onClick={searchPrecedents}
                              disabled={precedentLoading}
                              className="w-full bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none"
                            >
                              {precedentLoading ? (
                                <>
                                  <Spinner size="sm" />
                                  <span>Searching...</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-lg">🔍</span>
                                  <span>Find Precedents</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Results */}
                          <div className="space-y-3">
                            {precedentResults.length > 0 && (
                              <div className="text-sm text-gray-600">
                                Found <span className="font-semibold">{precedentTotalFound}</span> similar document(s)
                              </div>
                            )}

                            {precedentResults.length === 0 && !precedentLoading && (
                              <div className="text-center py-8 text-gray-500">
                                <div className="text-4xl mb-4">📄</div>
                                <p className="font-medium">No precedents found</p>
                                <p className="text-sm mt-2">Try adjusting the similarity threshold or click &quot;Find Precedents&quot;</p>
                              </div>
                            )}

                            {precedentResults.map((result: any) => (
                              <div
                                key={result.file_id}
                                className="border-2 border-gray-200/80 rounded-xl p-4 hover:shadow-lg hover:border-blue-300/50 transition-all duration-300 bg-white hover:bg-gradient-to-br hover:from-white hover:to-blue-50/30"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2.5 mb-2">
                                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-sm">
                                        <span className="text-blue-600 text-sm">📄</span>
                                      </div>
                                      <h5 className="font-semibold text-gray-900 text-sm truncate">
                                        {result.file_name}
                                      </h5>
                                    </div>
                                    
                                    <p className="text-xs text-gray-500 mb-3 truncate pl-10.5">{result.path}</p>
                                    
                                    {result.key_topics && result.key_topics.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 mb-3 pl-10.5">
                                        {result.key_topics.slice(0, 2).map((topic: string, i: number) => (
                                          <span
                                            key={i}
                                            className="px-2.5 py-1 bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 text-xs rounded-full font-medium shadow-sm border border-purple-200/50"
                                          >
                                            {topic}
                                          </span>
                                        ))}
                                      </div>
                                    )}

                                    {result.upload_date && (
                                      <div className="flex items-center gap-1.5 text-xs text-gray-500 pl-10.5">
                                        <span className="text-gray-400">📅</span>
                                        {new Date(result.upload_date).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex flex-col items-end gap-2.5">
                                    <div className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm ${getPrecedentRelevanceColor(result.relevance_score)}`}>
                                      {(result.relevance_score * 100).toFixed(0)}%
                                    </div>
                                    
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => compareDocuments(selectedDoc.file_id!, result.file_id)}
                                        disabled={comparisonLoading}
                                        className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-semibold rounded-lg transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-105"
                                      >
                                        {comparisonLoading ? (
                                          <Spinner size="sm" />
                                        ) : (
                                          "Compare"
                                        )}
                                      </button>
                                      <button
                                        onClick={() => analyzePrecedent(selectedDoc.file_id!, result.file_id)}
                                        disabled={analysisLoading}
                                        className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-xs font-semibold rounded-lg transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-105"
                                      >
                                        {analysisLoading ? (
                                          <Spinner size="sm" />
                                        ) : (
                                          "Analyze"
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Comparison Sub-tab */}
                      {precedentSubTab === "comparison" && comparisonData && (
                        <div className="space-y-4">
                          <button
                            onClick={() => setPrecedentSubTab("search")}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                          >
                            ← Back to Search
                          </button>
                          <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Document Comparison</h3>
                            <p className="text-sm text-gray-600 mb-4">
                              Comparing: <strong>{comparisonData.document_1?.file_name}</strong> with <strong>{comparisonData.document_2?.file_name}</strong>
                            </p>
                            <div className="text-sm text-gray-700">
                              <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
                                {JSON.stringify(comparisonData, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Analysis Sub-tab */}
                      {precedentSubTab === "analysis" && analysisData && (
                        <div className="space-y-4">
                          <button
                            onClick={() => setPrecedentSubTab("search")}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                          >
                            ← Back to Search
                          </button>
                          <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">AI Analysis</h3>
                            <div className="space-y-4">
                              {analysisData.analysis?.summary && (
                                <div>
                                  <h4 className="font-semibold text-gray-800 mb-2">Summary</h4>
                                  <p className="text-gray-700 text-sm">{analysisData.analysis.summary}</p>
                                </div>
                              )}
                              {analysisData.analysis?.similarities && (
                                <div>
                                  <h4 className="font-semibold text-gray-800 mb-2">Similarities</h4>
                                  <p className="text-gray-700 text-sm">{analysisData.analysis.similarities}</p>
                                </div>
                              )}
                              {analysisData.analysis?.applicability && (
                                <div>
                                  <h4 className="font-semibold text-gray-800 mb-2">Applicability</h4>
                                  <p className="text-gray-700 text-sm">{analysisData.analysis.applicability}</p>
                                </div>
                              )}
                              {analysisData.analysis?.differences && (
                                <div>
                                  <h4 className="font-semibold text-gray-800 mb-2">Differences</h4>
                                  <p className="text-gray-700 text-sm">{analysisData.analysis.differences}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <p>No extraction data available.</p>
                  <p className="text-sm mt-2">Debug info:</p>
                  <p className="text-sm">Document ID = {selectedDoc?._id || 'UNDEFINED'}</p>
                  <p className="text-sm">Document name = {selectedDoc?.name || 'UNDEFINED'}</p>
                  <p className="text-sm">Document status = {selectedDoc?.status || 'UNDEFINED'}</p>
                </div>
              )}
            </div>

            {/* Footer Bar */}
            <div className="border-t bg-white/95 backdrop-blur-sm sticky bottom-0 px-4 py-3 flex items-center justify-end gap-2 text-sm">
              <button 
                onClick={handleRedact}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
              >
                <span className="text-white text-xs">🔒</span>
                Redact
              </button>
              <div className="relative">
                <button 
                  onClick={() => setShowForwardDropdown(!showForwardDropdown)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <FaForward className="text-xs" />
                  Forward
                </button>
                {showForwardDropdown && (
                  <div className="absolute bottom-11 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48 max-h-64 overflow-auto">
                    <div className="p-2">
                      <div className="text-sm text-gray-600 font-medium mb-2 px-2">Forward to Department:</div>
                      {getForwardDepartments().map((dept) => (
                        <button
                          key={dept}
                          onClick={() => onForwardDocument(dept)}
                          className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm text-gray-700"
                        >
                          {dept}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button 
                onClick={onReplyToAdmin}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <FaReply className="text-xs" />
                Reply
              </button>
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}