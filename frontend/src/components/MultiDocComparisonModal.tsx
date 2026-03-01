/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo } from 'react';
import { X, FileText, Loader2, CheckCircle, AlertCircle, GitCompare, BarChart3, Search, RefreshCcw, Tag, TrendingUp } from 'lucide-react';
import { toast } from 'react-toastify';
import { API_ENDPOINTS } from '@/config/api';

interface File {
  fileId: string;
  fileName: string;
  filePath?: string;
  tags?: string[] | null;
  uploadDate?: Date | null;
  userId?: string;
}

interface DocumentMetadata {
  file_id: string;
  file_name: string;
  summary: string;
  key_topics: string[];
  tags: string[];
  upload_date?: string;
}

interface DocumentAnalysis {
  document_count: number;
  common_themes: string[];
  unique_aspects: Record<string, string[]>;
  relationships: {
    related_pairs: Array<{
      doc1: string;
      doc2: string;
      similarity: number;
      common_topics: string[];
    }>;
    overall_coherence: string;
  };
  recommendation: string;
}

interface MultiDocComparisonResult {
  documents: DocumentMetadata[];
  analysis: DocumentAnalysis;
}

interface MultiDocComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableFiles: File[];
}

const MultiDocComparisonModal: React.FC<MultiDocComparisonModalProps> = ({
  isOpen,
  onClose,
  availableFiles
}) => {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<MultiDocComparisonResult | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [displayLimit, setDisplayLimit] = useState(50); // Limit initial display to prevent lag

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setSelectedFiles(new Set());
      setComparisonResult(null);
      setSearchTerm('');
      setDisplayLimit(50);
    }
  }, [isOpen]);

  // Add keyboard support for closing modal with Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isComparing) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isComparing, onClose]);

  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const handleCompare = async () => {
    if (selectedFiles.size < 2) {
      toast.error('Please select at least 2 documents to compare');
      return;
    }

    if (selectedFiles.size > 10) {
      toast.warning('Comparing more than 10 documents may take longer. Please be patient.');
    }

    setIsComparing(true);
    setComparisonResult(null); // Clear previous results
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const response = await fetch(`${API_ENDPOINTS.COMPARE_MULTI_DOCS}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_ids: Array.from(selectedFiles)
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to compare documents');
      }

      const data = await response.json();
      
      if (!data || !data.documents || !data.analysis) {
        throw new Error('Invalid response format from server');
      }
      
      setComparisonResult(data);
      toast.success(`Successfully analyzed ${selectedFiles.size} documents`);
    } catch (error: any) {
      console.error('Error comparing documents:', error);
      
      if (error.name === 'AbortError') {
        toast.error('Request timed out. Please try with fewer documents or try again later.');
      } else {
        toast.error(error.message || 'Failed to compare documents. Please try again.');
      }
      
      setComparisonResult(null);
    } finally {
      setIsComparing(false);
    }
  };

  const filteredFiles = useMemo(() => {
    const filtered = availableFiles.filter(file =>
      file.fileName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    // Limit displayed files to prevent performance issues
    return filtered.slice(0, displayLimit);
  }, [availableFiles, searchTerm, displayLimit]);

  const totalFilteredCount = useMemo(() => {
    return availableFiles.filter(file =>
      file.fileName.toLowerCase().includes(searchTerm.toLowerCase())
    ).length;
  }, [availableFiles, searchTerm]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]"
      onClick={(e) => {
        // Close modal when clicking on backdrop
        if (e.target === e.currentTarget && !isComparing) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-slate-50 rounded-3xl shadow-2xl max-w-7xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grid Background Pattern */}
        <div className="absolute inset-0 bg-slate-50 -z-10 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40"></div>
        </div>

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-8 py-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-2xl">
                <GitCompare className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-3xl font-black text-slate-900">Multi-Document Comparison</h2>
                  <span className="inline-block bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    AI-Powered
                  </span>
                </div>
                <p className="text-slate-600 text-sm">
                  Select documents to analyze relationships, themes, and generate insights
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isComparing}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
              title={isComparing ? "Please wait for comparison to complete" : "Close"}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Document Selection */}
          <div className="w-1/2 border-r border-slate-200 flex flex-col bg-white">
            <div className="p-6 border-b border-slate-200 bg-slate-50">
              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-900">{filteredFiles.length}</p>
                      <p className="text-xs text-slate-500">Available</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-900">{selectedFiles.size}</p>
                      <p className="text-xs text-slate-500">Selected</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-100 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-900">{selectedFiles.size >= 2 ? 'Ready' : 'Need ' + (2 - selectedFiles.size)}</p>
                      <p className="text-xs text-slate-500">Min 2</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search documents by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCompare}
                  disabled={selectedFiles.size < 2 || isComparing}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
                    selectedFiles.size < 2 || isComparing
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                  }`}
                >
                  {isComparing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-5 h-5" />
                      Compare Now
                    </>
                  )}
                </button>
                <button
                  onClick={() => setSelectedFiles(new Set())}
                  disabled={selectedFiles.size === 0}
                  className="px-4 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document List */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              {totalFilteredCount === 0 ? (
                <div className="text-center text-slate-500 mt-12">
                  <div className="p-4 bg-white rounded-2xl inline-block mb-4 shadow-sm border border-slate-200">
                    <FileText className="w-12 h-12 text-slate-300" />
                  </div>
                  <p className="text-lg font-semibold text-slate-900 mb-2">No documents found</p>
                  <p className="text-sm text-slate-500">Try adjusting your search query</p>
                </div>
              ) : (
                <>
                  {totalFilteredCount > displayLimit && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
                      Showing {filteredFiles.length} of {totalFilteredCount} documents. Use search to find specific files.
                    </div>
                  )}
                  <div className="space-y-3">
                  {filteredFiles.map((file) => (
                    <div
                      key={file.fileId}
                      onClick={() => toggleFileSelection(file.fileId)}
                      className={`bg-white rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md group ${
                        selectedFiles.has(file.fileId)
                          ? 'border-blue-500 shadow-sm ring-2 ring-blue-100'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="p-4 flex items-start gap-3">
                        <div className="mt-0.5">
                          {selectedFiles.has(file.fileId) ? (
                            <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 border-2 border-slate-300 rounded-full group-hover:border-blue-400 transition-colors" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 truncate text-sm mb-2 group-hover:text-blue-600 transition-colors">
                            {file.fileName}
                          </h4>
                          {file.tags && file.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {file.tags.slice(0, 3).map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full"
                                >
                                  <Tag className="w-3 h-3" />
                                  {tag}
                                </span>
                              ))}
                              {file.tags.length > 3 && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
                                  +{file.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Panel - Comparison Results */}
          <div className="w-1/2 flex flex-col bg-slate-50">
            {isComparing ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="inline-block p-6 bg-white rounded-2xl shadow-lg border border-slate-200 mb-6">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
                  </div>
                  <p className="text-xl font-bold text-slate-900 mb-2">
                    Analyzing Documents...
                  </p>
                  <p className="text-sm text-slate-500">
                    AI is comparing your documents. This may take a moment.
                  </p>
                </div>
              </div>
            ) : comparisonResult ? (
              <div className="flex-1 overflow-y-auto p-6">
                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="inline-block bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      Analysis Complete
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">
                    Comparison Results
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    AI-powered analysis of {comparisonResult.documents.length} documents
                  </p>
                </div>

                {/* Document Summaries */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-5 h-5 text-slate-600" />
                    <h4 className="font-bold text-slate-900 text-lg">
                      Document Summaries
                    </h4>
                  </div>
                  {comparisonResult.documents.map((doc, idx) => (
                    <div key={doc.file_id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-all">
                      <div className="flex items-start gap-3 mb-3">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                          idx === 0 ? 'bg-blue-100 text-blue-700' :
                          idx === 1 ? 'bg-emerald-100 text-emerald-700' :
                          idx === 2 ? 'bg-purple-100 text-purple-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          Doc {idx + 1}
                        </span>
                        <h5 className="font-semibold text-slate-900 flex-1 leading-snug">
                          {doc.file_name}
                        </h5>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed mb-3">{doc.summary}</p>
                      {doc.key_topics && doc.key_topics.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {doc.key_topics.map((topic, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full"
                            >
                              <Tag className="w-3 h-3" />
                              {topic}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Analysis */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-5 h-5 text-slate-600" />
                    <h4 className="font-bold text-slate-900 text-lg">
                      Document Analysis
                    </h4>
                  </div>

                  {/* Common Themes */}
                  {comparisonResult.analysis.common_themes.length > 0 && (
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-emerald-100 rounded-lg">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        </div>
                        <h5 className="font-bold text-slate-900">Common Themes</h5>
                      </div>
                      <ul className="space-y-2">
                        {comparisonResult.analysis.common_themes.map((theme, i) => (
                          <li key={i} className="text-sm text-slate-700 flex items-start gap-2 pl-2">
                            <span className="text-emerald-600 font-bold mt-0.5">•</span>
                            <span className="leading-relaxed">{theme}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Unique Aspects */}
                  {Object.keys(comparisonResult.analysis.unique_aspects).length > 0 && (
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-orange-100 rounded-lg">
                          <AlertCircle className="w-4 h-4 text-orange-600" />
                        </div>
                        <h5 className="font-bold text-slate-900">Unique Aspects</h5>
                      </div>
                      <div className="space-y-4">
                        {Object.entries(comparisonResult.analysis.unique_aspects).map(([docName, aspects]) => (
                          <div key={docName} className="pb-3 last:pb-0 border-b last:border-b-0 border-slate-100">
                            <p className="text-sm font-semibold text-slate-900 mb-2">{docName}</p>
                            <ul className="space-y-1.5 ml-2">
                              {aspects.map((aspect, i) => (
                                <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                  <span className="text-orange-500 font-bold mt-0.5">•</span>
                                  <span className="leading-relaxed">{aspect}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Relationships */}
                  {comparisonResult.analysis.relationships.related_pairs.length > 0 && (
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 bg-purple-100 rounded-lg">
                          <GitCompare className="w-4 h-4 text-purple-600" />
                        </div>
                        <h5 className="font-bold text-slate-900">Document Relationships</h5>
                      </div>
                      <div className="space-y-3">
                        {comparisonResult.analysis.relationships.related_pairs.map((pair, i) => (
                          <div key={i} className="p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="text-sm font-semibold text-slate-900 truncate">{pair.doc1}</span>
                              <span className="text-slate-400">↔</span>
                              <span className="text-sm font-semibold text-slate-900 truncate">{pair.doc2}</span>
                              <span className="ml-auto px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-full whitespace-nowrap">
                                {(pair.similarity * 100).toFixed(0)}% similar
                              </span>
                            </div>
                            {pair.common_topics.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {pair.common_topics.map((topic, j) => (
                                  <span
                                    key={j}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-full"
                                  >
                                    <Tag className="w-3 h-3" />
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <p className="text-sm text-slate-700 leading-relaxed">
                          <span className="font-semibold text-slate-900">Overall Coherence: </span>
                          {comparisonResult.analysis.relationships.overall_coherence}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Recommendation */}
                  {comparisonResult.analysis.recommendation && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border-l-4 border-blue-600 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-blue-100 rounded-lg">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <h5 className="font-bold text-slate-900">AI Recommendation</h5>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {comparisonResult.analysis.recommendation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center text-slate-500 max-w-sm">
                  <div className="inline-block p-6 bg-white rounded-2xl shadow-sm border border-slate-200 mb-4">
                    <GitCompare className="w-16 h-16 text-slate-300" />
                  </div>
                  <p className="text-xl font-bold text-slate-900 mb-2">No Comparison Yet</p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Select at least 2 documents from the left panel and click &quot;Compare Now&quot; to generate insights
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiDocComparisonModal;
