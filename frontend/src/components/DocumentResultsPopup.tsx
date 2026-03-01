"use client";

import React, { useState } from "react";
import { X, FileText, Download, Eye, Calendar, Tag, MapPin, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DocumentModal, { ExtractionResults } from "../app/departments/components/DocumentModal";
import { API_ENDPOINTS } from "@/config/api";

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

interface DocumentResultsPopupProps {
  documents: DocumentResult[];
  searchQuery: string;
  isOpen: boolean;
  onClose: () => void;
}

const DocumentResultsPopup: React.FC<DocumentResultsPopupProps> = ({
  documents,
  searchQuery,
  isOpen,
  onClose,
}) => {
  const [selectedDocument, setSelectedDocument] = useState<DocumentResult | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [extractionResults, setExtractionResults] = useState<ExtractionResults | null>(null);
  const [isLoadingExtraction, setIsLoadingExtraction] = useState(false);

  if (!isOpen) return null;

  const handleDocumentClick = async (document: DocumentResult) => {
    setSelectedDocument(document);
    setIsLoadingExtraction(true);
    setShowDocumentModal(true);
    
    try {
      // Fetch extraction results for the modal using the existing API
      const response = await fetch(`${API_ENDPOINTS.GET_METADATA}?file_name=${encodeURIComponent(document.file_name)}&path=${encodeURIComponent(document.path)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setExtractionResults(data);
      }
    } catch (error) {
      console.error("Failed to fetch extraction results:", error);
    } finally {
      setIsLoadingExtraction(false);
    }
  };

  const handleDownload = async (doc: DocumentResult) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.VIEW_FILE}?file_name=${encodeURIComponent(doc.file_name)}&path=${encodeURIComponent(doc.path)}`, {
        method: "GET",
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const anchor = window.document.createElement('a');
        anchor.href = url;
        anchor.download = doc.file_name;
        window.document.body.appendChild(anchor);
        anchor.click();
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(anchor);
      }
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 0.6) return "bg-blue-100 text-blue-800 border-blue-200";
    if (score >= 0.4) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        {/* Modal */}
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Search Results</h2>
                <p className="text-blue-100 text-sm">
                  Found {documents.length} documents for &ldquo;{searchQuery}&rdquo;
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-blue-500"
              >
                <X size={20} />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid gap-4">
              {documents.map((doc) => (
                <Card key={doc.file_id} className="hover:shadow-lg transition-shadow border border-gray-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg text-blue-700 hover:text-blue-800 cursor-pointer line-clamp-1">
                          {doc.file_name}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                          <MapPin size={14} />
                          <span className="truncate">{doc.path}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRelevanceColor(doc.total_score)}`}>
                          <TrendingUp size={12} className="mr-1" />
                          {Math.round(doc.total_score * 100)}% relevance
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDocumentClick(doc)}
                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                          >
                            <Eye size={14} className="mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(doc)}
                            className="text-green-600 border-green-600 hover:bg-green-50"
                          >
                            <Download size={14} className="mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    {/* Preview Text */}
                    {doc.preview_text && (
                      <p className="text-sm text-gray-700 mb-3 line-clamp-3">
                        {doc.preview_text}
                      </p>
                    )}

                    {/* Metadata Row */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <FileText size={12} />
                        <span>{doc.file_type}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>{new Date(doc.upload_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Tag size={12} />
                        <span>{doc.tags.length} tags</span>
                      </div>
                    </div>

                    {/* Tags */}
                    {doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {doc.tags.slice(0, 5).map((tag, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                            {tag}
                          </span>
                        ))}
                        {doc.tags.length > 5 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border border-gray-300 text-gray-600">
                            +{doc.tags.length - 5} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Key Topics */}
                    {doc.key_topics && doc.key_topics.length > 0 && (
                      <div className="mb-3">
                        <span className="text-xs font-medium text-gray-700">Key Topics: </span>
                        <span className="text-xs text-gray-600">
                          {doc.key_topics.slice(0, 3).join(", ")}
                          {doc.key_topics.length > 3 && "..."}
                        </span>
                      </div>
                    )}

                    {/* Scoring Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 pt-3 border-t border-gray-100">
                      <div className="text-center">
                        <div className="text-xs font-medium text-gray-700">Semantic</div>
                        <div className="text-xs text-blue-600">{Math.round(doc.semantic_score * 100)}%</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-medium text-gray-700">Content</div>
                        <div className="text-xs text-green-600">{Math.round(doc.extracted_text_score * 100)}%</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-medium text-gray-700">Keywords</div>
                        <div className="text-xs text-purple-600">{Math.round(doc.tfidf_score * 100)}%</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-medium text-gray-700">Topics</div>
                        <div className="text-xs text-orange-600">{Math.round(doc.key_topics_score * 100)}%</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {documents.length} results for &ldquo;{searchQuery}&rdquo;
              </div>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Document Detail Modal */}
      {showDocumentModal && selectedDocument && (
        <DocumentModal
          isOpen={showDocumentModal}
          selectedDoc={{
            name: selectedDocument.file_name,
            file_id: selectedDocument.file_id,
            deadline: '', // Default empty value
            language: 'English', // Default value
            source: 'System', // Default value
            status: 'Processed', // Default status
            summary: selectedDocument.summary || selectedDocument.preview_text || 'No summary available',
            docType: selectedDocument.file_type || 'Document',
            relatedDepts: [], // Empty array as default
            isRegulatory: false, // Default value
            actionableItems: [], // Empty array as default
          }}
          extractionResults={extractionResults}
          isLoadingExtraction={isLoadingExtraction}
          enrichedTables={null}
          onClose={() => {
            setShowDocumentModal(false);
            setSelectedDocument(null);
            setExtractionResults(null);
          }}
          onForwardDocument={() => {
            // Handle forward document functionality if needed
          }}
          onReplyToAdmin={() => {
            // Handle reply to admin functionality if needed
          }}
          buildUnifiedTable={() => ({
            header: [],
            body: [],
            colCount: 0,
          })}
        />
      )}
    </>
  );
};

export default DocumentResultsPopup;