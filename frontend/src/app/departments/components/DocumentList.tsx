/**
 * DocumentList Component
 * Handles the display and interaction with department documents
 */

"use client";

import React from "react";
import { FaExclamationTriangle, FaCog, FaUpload } from "react-icons/fa";
import { Department, departmentIcons } from "../departmentConfig";

// Helper: extract first email address from a string using regex
function extractEmail(input?: string): string {
  if (!input) return "-";
  const match = input.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  return match ? match[0] : input;
}

export interface DocInfo {
  name: string;
  deadline: string;
  language: string;
  source: string;
  email_info?: {
    from: string;
    to: string;
    subject: string;
    messageId: string;
    sender?: string;
  };
  status: "Processed" | "Pending" | "Action Required" | "Uploaded" | "Processing";
  summary: string;
  docType: string;
  relatedDepts: Department[];
  isRegulatory: boolean;
  actionableItems: string[];
  _id?: string;
  file_id?: string;
}

interface DocumentListProps {
  selectedDept: Department;
  documents: Record<Department, DocInfo[]>;
  onDocumentClick: (doc: DocInfo) => void;
  onStartExtraction: (docName: string) => void;
  onUploadClick: () => void;
  isLoading?: boolean;
  isAuthenticated?: boolean;
}

export default function DocumentList({
  selectedDept,
  documents,
  onDocumentClick,
  onStartExtraction,
  onUploadClick,
  isLoading = false,
  isAuthenticated = true,
}: DocumentListProps) {
  const isEmailInbox = selectedDept === 'Email Inbox';
  return (
    <main className="flex-1 p-10">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            {React.cloneElement(departmentIcons[selectedDept], { className: "text-3xl" })}
            <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">
              {selectedDept}
            </h1>
          </div>
            <button 
            onClick={onUploadClick}
            className="bg-blue-600 text-white px-6 py-2 rounded-xl shadow hover:bg-blue-700 transition-all font-semibold flex items-center gap-2"
            >
            <FaUpload />
            <span>Upload Document</span>
            </button>
        </div>

        {/* Documents Section */}
        <div className="bg-white/90 rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Documents</h2>
          
          {/* Column Headers */}
          <div className="hidden md:grid md:grid-cols-12 items-center px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 mb-2">
            <div className={isEmailInbox ? "col-span-5" : "col-span-4"}>Document</div>
            <div className={isEmailInbox ? "col-span-3" : "col-span-2"}>{isEmailInbox ? 'Sender Email' : 'Deadline'}</div>
            {!isEmailInbox && <div className="col-span-2">Language</div>}
            <div className="col-span-2">Source</div>
            <div className="col-span-2">Status</div>
          </div>

          {/* Document List */}
          <div className="space-y-4">
            {!isAuthenticated ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">🔐</div>
                <p className="text-lg font-medium">Authentication Required</p>
                <p className="text-sm mt-2">Please sign in to view department documents</p>
              </div>
            ) : isLoading ? (
              <div className="text-center py-12 text-gray-500">
                <div className="animate-spin text-4xl mb-4">⏳</div>
                <p className="text-lg font-medium">Loading documents...</p>
                <p className="text-sm mt-2">Fetching files for your department</p>
              </div>
            ) : documents[selectedDept].length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📄</div>
                <p className="text-lg font-medium">No documents found</p>
                <p className="text-sm mt-2">Upload a document to get started</p>
              </div>
            ) : (
              documents[selectedDept].map((doc: DocInfo, idx: number) => (
                <div 
                  key={idx} 
                  className="bg-gray-50 rounded-xl p-4 transition-all duration-200 hover:shadow-md hover:bg-white"
                >
                  <div className="grid grid-cols-12 items-center gap-4">
                    <div className={(isEmailInbox ? "col-span-5" : "col-span-4") + " min-w-0"}>
                      <div 
                        className="font-semibold text-blue-800 cursor-pointer hover:text-blue-600 transition-colors truncate" 
                        onClick={() => onDocumentClick(doc)}
                        title={doc.name}
                      >
                        {doc.name}
                      </div>
                    </div>
                    <div className={(isEmailInbox ? "col-span-3" : "col-span-2") + " min-w-0"}>
                      <div className="text-sm text-gray-700 truncate" title={isEmailInbox ? (doc.email_info?.from || '-') : doc.deadline}>
                        {isEmailInbox ? (extractEmail(doc.email_info?.from) || '-') : doc.deadline}
                      </div>
                    </div>
                    {!isEmailInbox && (
                      <div className="col-span-2">
                        <div className="text-sm text-gray-700">{doc.language}</div>
                      </div>
                    )}
                    <div className="col-span-2 min-w-0">
                      <div className="text-sm text-gray-700 truncate" title={isEmailInbox ? 'Email' : doc.source}>
                        {isEmailInbox ? 'Email' : doc.source}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center justify-start gap-2">
                        {/* Status pill */}
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center whitespace-nowrap ${
                          doc.status === "Processed" ? "bg-green-100 text-green-700" : 
                          doc.status === "Pending" ? "bg-yellow-100 text-yellow-700" : 
                          doc.status === "Uploaded" ? "bg-blue-100 text-blue-700" : 
                          doc.status === "Processing" ? "bg-gray-100 text-gray-700" : 
                          "bg-red-100 text-red-700"
                        }`}>
                          {doc.status === "Processing" && <FaCog className="animate-spin text-gray-600 mr-1" />}
                          {doc.status}
                        </span>
                        
                        {/* Action icons */}
                        {doc.isRegulatory && (
                          <FaExclamationTriangle 
                            className="text-red-500 text-xs" 
                            title="Regulatory Document"
                          />
                        )}
                        
                        {(doc.status === "Uploaded" || doc.status === "Pending") && (
                          <button 
                            onClick={() => onStartExtraction(doc.name)}
                            className="bg-green-500 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-green-600 transition-all"
                          >
                            Extract
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}