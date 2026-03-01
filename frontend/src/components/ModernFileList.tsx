/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import FileViewer from "./FileViewer";
import ChatUI from "../components/AgentChat"; // Assuming you have a ChatUI component
import { File } from "../app/types";
import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Spinner,

} from "@nextui-org/react";
import FileCard from "./FileCard";
import { usePathContext } from "@/app/AppContext";
import { API_ENDPOINTS } from "@/config/api";
import TranslationModal from "./TranslationModal";
import ShareCard from "./sharing/ShareCard";
import UserRoleSelector from "./sharing/UserRoleSelector";
import DiscussionsTab from "./discussions/DiscussionsTab";
import { Share, ShareRecipient } from "@/types/sharing";

// Action point interface
interface ActionPoint {
  title: string;
  description: string;
  priority: string;
  deadline: string;
}

const API_GET_METADATA = API_ENDPOINTS.GET_METADATA;
const API_UPDATE_TAGS = API_ENDPOINTS.UPDATE_TAGS;

const ModernFileList = ({
  files,
  setFiles,
  onAnalyze,
  onMove,
  onShowFiles,
  onDirectoryClick,
  currentPath,
}: {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  onAnalyze: (file: File) => void;
  onMove: (file: File) => void;
  selectedFiles: File[];
  setSelectedFiles: (files: File[]) => void;
  onDirectoryClick: (fileName: string) => void;
  onShowFiles: () => void;
  currentPath: string;
}) => {
  const { isOpen: viewDialogVisible, onOpen, onOpenChange } = useDisclosure();
  const {viewName, setViewName, setFilesContext} = usePathContext();
  const [viewingFilePath, setViewingFilePath] = useState("");
  const [viewingFileName, setViewingFileName] = useState("");
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const filesPerPage  = 10;
  const [currentPage, setCurrentPage] = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [fileId, setFileId] = useState("");
  const [activeTab, setActiveTab] = useState("preview");
  const { user } = useUser();

  // Precedent Finder states
  const [precedentResults, setPrecedentResults] = useState<{
    file_id: string;
    file_name: string;
    path: string;
    relevance_score: number;
    key_topics?: string[];
    upload_date?: string;
  }[]>([]);
  const [precedentLoading, setPrecedentLoading] = useState(false);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.3);
  const [precedentFileTypes, setPrecedentFileTypes] = useState<string[]>([]);
  const [precedentTotalFound, setPrecedentTotalFound] = useState(0);

  // Precedent sub-tab state
  const [precedentSubTab, setPrecedentSubTab] = useState<"search" | "comparison" | "analysis">("search");

  // Comparison and Analysis states
  const [comparisonData, setComparisonData] = useState<{
    document_1: any;
    document_2: any;
    matching_sections: any[];
    total_matches: number;
  } | null>(null);
  const [analysisData, setAnalysisData] = useState<{
    current_document: any;
    precedent_document: any;
    analysis: {
      summary?: unknown;
      similarities?: unknown;
      applicability?: unknown;
      differences?: unknown;
    };
  } | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [comparingFileIds, setComparingFileIds] = useState<[string, string] | null>(null);
  const [analyzingFileIds, setAnalyzingFileIds] = useState<[string, string] | null>(null);

  useEffect(() => {
    console.log("Initial tags from files:", files.map(f => ({ name: f.fileName, tags: f.tags })));
    setFilesContext(files);
  }, [files, setFilesContext]);

  const fetchExtractedText = useCallback(async (fileName: string) => {
    try {
      // IMPORTANT: Do not send `path` to the get-metadata endpoint. Use access-aware lookup by providing
      // the file name and the current user's id. This mirrors the access-aware behavior used in handleViewFile.
      const payload = { name: fileName, user_id: user?.id };

      const response = await fetch(API_GET_METADATA, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch metadata.");
      }

      const data = await response.json();
      console.log('API Response Data:', data);
      console.log('Department summaries from API:', data.dept_summaries);
      console.log('Department action points from API:', data.dept_action_points);
      console.log('Document summary from API:', data.document_summary);
      console.log('Document action points from API:', data.document_action_points);
      
      setExtractedText(data.extracted_text);
      
      // Set document-level summary and action points
      setDocumentSummary(data.document_summary || "");
      
      // Parse document action points - handle the nested structure
      if (data.document_action_points && Array.isArray(data.document_action_points) && data.document_action_points.length > 0) {
        const actionPointsData = data.document_action_points[0];
        if (actionPointsData && actionPointsData.actionable_items) {
          setDocumentActionPoints(actionPointsData.actionable_items);
        }
      } else {
        setDocumentActionPoints([]);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error fetching extracted text:", error);
      setExtractedText("Failed to fetch extracted text.");
    }
  }, [user?.id]);

  useEffect(() => {
    const fetchData = async () => {
      if(viewName!=""){
        setViewingFileName(viewName);
        setViewingFilePath(currentPath);
        await fetchExtractedText(viewName);
        onOpen();
      }
    };
    fetchData();
  },[viewName, currentPath, onOpen, fetchExtractedText]);

  const handleTagsChange = (
    fileId: string,
    fileName: string,
    newTags: string[],
    currentPath: string
  ) => {
    fetch(API_UPDATE_TAGS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id: fileId, file_name: fileName, tags: newTags, path: currentPath }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to update tags');
        }
        return response.json();
      })
      .then((data) => {
        console.log(`Tags updated successfully for "${fileName}":`, data);
        onShowFiles();
      })
      .catch((error) => {
        console.error(`Failed to update tags for "${fileName}":`, error);
      });
  };

  const handleViewFile = async (file: File) => {
    const filePath = `${file.filePath}`.replace(/\/\/+/g, "/");
    // Try to resolve metadata access-aware using user_id + name
    try {
      const res = await fetch(API_GET_METADATA, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.fileName, user_id: user?.id }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log('HandleViewFile - API Response Data:', data);
        console.log('HandleViewFile - Department summaries:', data.dept_summaries);
        console.log('HandleViewFile - Department action points:', data.dept_action_points);
        
        // Set extracted text from metadata (if present)
        setExtractedText(data.extracted_text || null);
        
        // Set document-level summary and action points
        setDocumentSummary(data.document_summary || "");
        
        // Parse document action points - handle the nested structure
        if (data.document_action_points && Array.isArray(data.document_action_points) && data.document_action_points.length > 0) {
          const actionPointsData = data.document_action_points[0];
          if (actionPointsData && actionPointsData.actionable_items) {
            setDocumentActionPoints(actionPointsData.actionable_items);
          }
        } else {
          setDocumentActionPoints([]);
        }
        
        setViewingFileName(file.fileName);
        setViewingFilePath(""); // We no longer rely on path for access
        setFileId(data.file_id || file.fileId);
        console.log("Viewing file (access-resolved):", data.file_id || file.fileId);
        onOpen();
        return;
      }
    } catch (err) {
      console.warn("Access-aware metadata lookup failed, falling back to path-based view:", err);
    }

    // Fallback to legacy path-based behavior if access-aware lookup didn't work
    setViewingFilePath(filePath);
    setViewingFileName(file.fileName);
    setFileId(file.fileId);
    console.log("Viewing file (legacy):", file.fileId);
    // Still fetch extracted text (will include user_id fallback inside)
    fetchExtractedText(file.fileName);
    onOpen(); // Trigger the modal to open
  };

  // **New function to read aloud the extracted text**
  // const handleReadAloud = () => {
  //   if (!extractedText || extractedText === "") {
  //     console.log("No extracted text found to read aloud.");
  //     return;
  //   }
  //   const utterance = new SpeechSynthesisUtterance(extractedText);

  //   const voices = window.speechSynthesis.getVoices();
  //   const indianVoice = voices.find((voice) => voice.lang === "en-IN");

  //   if (indianVoice) {
  //     utterance.voice = indianVoice;
  //   } else {
  //     console.warn("Indian English voice not found. Using default voice.");
  //   }

  //   window.speechSynthesis.speak(utterance);
  // };

  const handleChat = () => {
    setActiveTab("chat");
  };

  // Precedent search function
  const searchPrecedents = async () => {
    if (!fileId) return;
    
    setPrecedentLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/find-precedents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_id: fileId,
          similarity_threshold: similarityThreshold,
          file_types: precedentFileTypes.length > 0 ? precedentFileTypes : undefined,
          top_k: 50
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to find precedents');
      }

      const data = await response.json();
      
      if (data.error) {
        console.error(data.error);
        setPrecedentResults([]);
      } else {
        setPrecedentResults(data.results || []);
        setPrecedentTotalFound(data.total_found || 0);
      }
    } catch (error) {
      console.error('Error finding precedents:', error);
      setPrecedentResults([]);
    } finally {
      setPrecedentLoading(false);
    }
  };

  const togglePrecedentFileType = (type: string) => {
    setPrecedentFileTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const getPrecedentRelevanceColor = (score: number) => {
    if (score >= 0.7) return 'text-green-600 bg-green-50';
    if (score >= 0.5) return 'text-yellow-600 bg-yellow-50';
    return 'text-orange-600 bg-orange-50';
  };

  // Safe renderer for analysis fields (handles string, number, array, object)
  const renderAnalysisField = (value: unknown): React.ReactNode => {
    if (value === null || value === undefined) return null;
    if (typeof value === "string" || typeof value === "number") return value as React.ReactNode;
    if (Array.isArray(value)) {
      return value.map((item, idx) => (
        <div key={idx} className="mb-2 last:mb-0">
          {typeof item === "string" || typeof item === "number" ? item : JSON.stringify(item, null, 2)}
        </div>
      ));
    }
    if (typeof value === "object") {
      // Format object as structured list with labels
      const entries = Object.entries(value as Record<string, unknown>);
      return (
        <div className="space-y-3">
          {entries.map(([key, val]) => (
            <div key={key} className="border-l-3 border-l-blue-400 pl-3">
              <h6 className="font-semibold text-gray-800 mb-1 capitalize">
                {key.replace(/_/g, " ")}
              </h6>
              <p className="text-gray-700 text-sm leading-relaxed">
                {typeof val === "string" ? val : JSON.stringify(val, null, 2)}
              </p>
            </div>
          ))}
        </div>
      );
    }
    return (
      <pre className="whitespace-pre-wrap break-words text-xs bg-slate-50 border border-slate-200 rounded-md p-2">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  };

  // Compare two documents
  const compareDocuments = async (currentFileId: string, precedentFileId: string) => {
    setComparisonLoading(true);
    setComparisonError(null);
    setComparingFileIds([currentFileId, precedentFileId]);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/compare-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_id_1: currentFileId,
          file_id_2: precedentFileId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to compare documents');
      }

      const data = await response.json();
      
      if (data.error) {
        setComparisonError(data.error);
      } else {
        setComparisonData(data);
        setActiveTab("precedents");
        setPrecedentSubTab("comparison");
      }
    } catch (error) {
      console.error('Error comparing documents:', error);
      setComparisonError('Failed to compare documents');
    } finally {
      setComparisonLoading(false);
    }
  };

  // Analyze precedent relationship
  const analyzePrecedent = async (currentFileId: string, precedentFileId: string) => {
    setAnalysisLoading(true);
    setAnalysisError(null);
    setAnalyzingFileIds([currentFileId, precedentFileId]);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/precedent-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_file_id: currentFileId,
          precedent_file_id: precedentFileId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze precedent relationship');
      }

      const data = await response.json();
      
      if (data.error) {
        setAnalysisError(data.error);
      } else {
        setAnalysisData(data);
        setActiveTab("precedents");
        setPrecedentSubTab("analysis");
      }
    } catch (error) {
      console.error('Error analyzing precedent:', error);
      setAnalysisError('Failed to analyze precedent relationship');
    } finally {
      setAnalysisLoading(false);
    }
  };

  useEffect(() => { 
    if(!viewDialogVisible){
      setViewingFileName("");
      setViewingFilePath("");
      setExtractedText("");
      setViewName("");
      setActiveTab("preview");
      // Reset precedent finder states
      setPrecedentResults([]);
      setPrecedentTotalFound(0);
      setPrecedentSubTab("search");
      // Reset comparison and analysis states
      setComparisonData(null);
      setAnalysisData(null);
      setComparisonError(null);
      setAnalysisError(null);
      setComparingFileIds(null);
      setAnalyzingFileIds(null);
    }
  },[viewDialogVisible, setViewName])


  // const handleGraph = () => {
  //   setOutputType('graph');
  //   setOutput("Generating graph for the file...");
  // };

  // New state for document-level summary and action points
  const [documentSummary, setDocumentSummary] = useState<string>("");
  const [documentActionPoints, setDocumentActionPoints] = useState<ActionPoint[]>([]);

  // Sharing state
  const [activeShares, setActiveShares] = useState<Share[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<ShareRecipient[]>([]);
  const [sharePermission, setSharePermission] = useState<'view' | 'comment' | 'edit'>('view');
  const [shareExpiration, setShareExpiration] = useState<string>('');
  const [sharePassword, setSharePassword] = useState<string>('');
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [shareMessage, setShareMessage] = useState<string>('');

  // Sharing handler functions
  const fetchActiveShares = useCallback(async (fileId: string) => {
    if (!fileId) return;
    
    setLoadingShares(true);
    try {
      const response = await fetch(API_ENDPOINTS.SHARE_HISTORY(fileId), {
        headers: {
          'X-User-ID': user?.id || '',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setActiveShares(data.shares || []);
      } else {
        console.error('Failed to fetch shares');
        setActiveShares([]);
      }
    } catch (error) {
      console.error('Error fetching shares:', error);
      setActiveShares([]);
    } finally {
      setLoadingShares(false);
    }
  }, [user?.id]);

  const handleCreateShare = async () => {
    if (!fileId || selectedRecipients.length === 0) {
      alert('Please select at least one user or role to share with');
      return;
    }

    if (!user?.id) {
      alert('You must be logged in to share documents');
      return;
    }

    setLoadingShares(true);
    try {
      const shareData = {
        file_id: fileId,
        file_name: viewingFileName || 'Unknown File',
        shared_by: user.id,
        shared_with: selectedRecipients.map(recipient => ({
          type: recipient.type,
          identifier: recipient.identifier,
          name: recipient.name,
          permission: sharePermission,
        })),
        password: passwordEnabled ? sharePassword : undefined,
        expiration_date: shareExpiration || undefined,
        message: shareMessage || undefined,
      };

      const response = await fetch(API_ENDPOINTS.SHARE_CREATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user.id,
        },
        body: JSON.stringify(shareData),
      });

      if (response.ok) {
        await response.json();
        alert('Document shared successfully!');
        
        // Reset form
        setSelectedRecipients([]);
        setSharePermission('view');
        setShareExpiration('');
        setSharePassword('');
        setPasswordEnabled(false);
        setShareMessage('');
        
        // Refresh shares list
        fetchActiveShares(fileId);
      } else {
        const error = await response.json();
        alert(`Failed to share document: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sharing document:', error);
      alert('Failed to share document. Please try again.');
    } finally {
      setLoadingShares(false);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    if (!confirm('Are you sure you want to revoke this share?')) {
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.SHARE_REVOKE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user?.id || '',
        },
        body: JSON.stringify({ share_id: shareId }),
      });

      if (response.ok) {
        alert('Share revoked successfully');
        fetchActiveShares(fileId);
      } else {
        const error = await response.json();
        alert(`Failed to revoke share: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error revoking share:', error);
      alert('Failed to revoke share. Please try again.');
    }
  };

  const handleCopyLink = async (shareToken: string) => {
    const shareLink = `${window.location.origin}/share/${shareToken}`;
    try {
      await navigator.clipboard.writeText(shareLink);
      alert('Share link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy link:', error);
      alert('Failed to copy link. Please try again.');
    }
  };

  // Load shares when Share tab is opened
  useEffect(() => {
    if (activeTab === 'share' && fileId && user?.id) {
      fetchActiveShares(fileId);
    }
  }, [activeTab, fileId, user?.id, fetchActiveShares]);

  // Cleanup modal backdrop when modal closes
  useEffect(() => {
    if (!viewDialogVisible) {
      // Force remove any leftover backdrop/overlay elements
      const backdrops = document.querySelectorAll('[data-slot="backdrop"]');
      backdrops.forEach(backdrop => backdrop.remove());
      
      // Reset body overflow
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
  }, [viewDialogVisible]);


  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      const aIsDirectory = a.fileName.endsWith("/");
      const bIsDirectory = b.fileName.endsWith("/");
      if (aIsDirectory && !bIsDirectory) return -1;
      if (!aIsDirectory && bIsDirectory) return 1;
      return 1;
    });
  }, [files]);
  


  // Get files for the current page
  const currentFiles = useMemo(() => {
    const startIndex = (currentPage - 1) * filesPerPage;
    return sortedFiles.slice(startIndex, startIndex + filesPerPage);
  }, [sortedFiles, currentPage, filesPerPage]);

  const totalPages = Math.ceil(sortedFiles.length / filesPerPage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      <div className="p-6">
        <Modal
          isOpen={viewDialogVisible}
          onOpenChange={onOpenChange}
          backdrop="blur"
          isDismissable={true}
          hideCloseButton={false}
          className="max-w-[90vw] max-h-[90vh]"
          classNames={{
            base: "bg-white shadow-2xl border border-slate-200/50 flex flex-col",
            backdrop: "bg-black/60 backdrop-blur-sm",
          }}
          motionProps={{
            variants: {
              enter: {
                opacity: 1,
                transition: {
                  duration: 0.3,
                },
              },
              exit: {
                opacity: 0,
                transition: {
                  duration: 0.2,
                },
              },
            },
          }}
        >
          <ModalContent className="bg-white flex flex-col max-h-[90vh]">
            {(onClose) => (
              <>
                <ModalHeader className="border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-blue-50/50 to-white shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-8 bg-gradient-to-b from-blue-500 via-purple-500 to-purple-600 rounded-full shadow-sm"></div>
                    <h3 className="font-semibold text-xl text-slate-800 tracking-tight">
                      {viewingFileName}
                    </h3>
                  </div>
                </ModalHeader>
                
                <ModalBody className="p-6 overflow-y-auto max-h-[70vh]">
                  {/* Simplified content without tabs temporarily to debug */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Panel - File Viewer */}
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                        <h4 className="font-medium text-slate-700">Document Preview</h4>
                      </div>
                      <div className="p-4 max-h-[60vh] overflow-y-auto">
                        <FileViewer filePath={viewingFilePath} fileName={viewingFileName} />
                      </div>
                    </div>

                    {/* Right Panel - Content based on activeTab */}
                    <div className="bg-white rounded-xl border border-slate-200/80 shadow-lg overflow-hidden">
                      <div className="bg-gradient-to-r from-slate-50 via-slate-50/50 to-white px-4 py-3.5 border-b border-slate-200/80">
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
                      <div className="p-4 max-h-[60vh] overflow-y-auto">
                        {activeTab === "preview" && (
                          <div className="space-y-4">
                            {/* File Metadata Section */}
                            <div className="bg-gradient-to-br from-blue-50 via-indigo-50/50 to-blue-50 rounded-xl p-5 border-2 border-blue-200/60 shadow-md">
                              <h5 className="font-bold text-blue-900 mb-4 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shadow-sm">
                                  <span className="text-blue-600 text-lg">📋</span>
                                </div>
                                <span className="tracking-tight">File Information</span>
                              </h5>
                              <div className="grid grid-cols-1 gap-3 text-sm">
                                {/* File Name */}
                                <div className="flex justify-between items-start">
                                  <span className="text-blue-700 font-medium">File Name:</span>
                                  <span className="text-blue-900 text-right flex-1 ml-2 break-all">{viewingFileName}</span>
                                </div>
                                
                                {/* File Size */}
                                {(() => {
                                  const currentFile = files.find(f => f.fileName === viewingFileName);
                                  return currentFile?.size && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-blue-700 font-medium">Size:</span>
                                      <span className="text-blue-900">
                                        {(currentFile.size / 1024 / 1024).toFixed(2)} MB
                                      </span>
                                    </div>
                                  );
                                })()}
                                
                                 
                                {/* Uploaded By */}
                                {(() => {
                                  const currentFile = files.find(f => f.fileName === viewingFileName);
                                  return currentFile?.uploadedBy && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-blue-700 font-medium">Uploaded By:</span>
                                      <span className="text-blue-900">
                                        {currentFile.uploadedBy}
                                      </span>
                                    </div>
                                  );
                                })()}
                                
                                {/* Upload Date */}
                                {(() => {
                                  const currentFile = files.find(f => f.fileName === viewingFileName);
                                  return currentFile?.uploadDate && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-blue-700 font-medium">Upload Date:</span>
                                      <span className="text-blue-900">
                                        {new Date(currentFile.uploadDate).toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'long',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </span>
                                    </div>
                                  );
                                })()}
                                
                                {/* Deadline */}
                                {(() => {
                                  const currentFile = files.find(f => f.fileName === viewingFileName);
                                  return currentFile?.deadline && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-blue-700 font-medium">Deadline:</span>
                                      <span className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-medium">
                                        ⏰ {new Date(currentFile.deadline).toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </span>
                                    </div>
                                  );
                                })()}
                                
                                {/* File Status */}
                                {(() => {
                                  const currentFile = files.find(f => f.fileName === viewingFileName);
                                  return currentFile?.status && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-blue-700 font-medium">Status:</span>
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        currentFile.status === 'analyzed' ? 'bg-green-100 text-green-800' :
                                        currentFile.status === 'analyzing' ? 'bg-yellow-100 text-yellow-800' :
                                        currentFile.status === 'failed' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {currentFile.status}
                                      </span>
                                    </div>
                                  );
                                })()}
                                
                                {/* Tags */}
                                {(() => {
                                  const currentFile = files.find(f => f.fileName === viewingFileName);
                                  return currentFile?.tags && currentFile.tags.length > 0 && (
                                    <div className="flex flex-col gap-2">
                                      <span className="text-blue-700 font-medium">Tags:</span>
                                      <div className="flex flex-wrap gap-1">
                                        {currentFile.tags.map((tag, idx) => (
                                          <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                            {tag}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Document Summary Section */}
                            <div className="bg-gradient-to-br from-purple-50 via-indigo-50/50 to-purple-50 rounded-xl p-5 border-2 border-purple-200/60 shadow-md">
                              <h5 className="font-bold text-purple-900 mb-4 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center shadow-sm">
                                  <span className="text-purple-600 text-lg">📋</span>
                                </div>
                                <span className="tracking-tight">Document Summary</span>
                              </h5>
                              {documentSummary ? (
                                <p className="text-purple-800 leading-relaxed text-sm">{documentSummary}</p>
                              ) : (
                                <div className="text-center text-purple-500 py-4">
                                  <span className="text-2xl mb-2 block">📄</span>
                                  <p className="text-sm">No summary available for this document.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {activeTab === "chat" && (
                          <div>
                            <h4 className="font-medium text-slate-700 mb-3">AI Assistant</h4>
                            <ChatUI filepath={viewingFilePath} filename={viewingFileName} fileId={fileId} userId={user?.id} />
                          </div>
                        )}
                        
                        {activeTab === "share" && (
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
                                  <span className="text-4xl block mb-2">�</span>
                                  <p className="text-sm">No active shares yet</p>
                                  <p className="text-xs mt-1">Share this document to see it here</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Discussions Tab */}
                        {activeTab === "discussions" && (
                          <div className="h-full">
                            <DiscussionsTab 
                              fileId={fileId}
                              fileName={viewingFileName}
                            />
                          </div>
                        )}
                        
                        {/* Translation Tab */}
                        {activeTab === "translation" && (
                          <TranslationModal 
                            extractedText={extractedText}
                            fileId={fileId}
                            fileName={viewingFileName}
                          />
                        )}
                        
                        {/* Content Tab */}
                        {activeTab === "content" && (
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

                        {/* Summary Tab */}
                        {activeTab === "summary" && (
                          <div className="space-y-4">
                            <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                              <span className="text-slate-600">📋</span>
                              Document Summary
                            </h4>
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                              {documentSummary ? (
                                <p className="text-blue-900 leading-relaxed">{documentSummary}</p>
                              ) : (
                                <div className="flex items-center gap-2 text-blue-500">
                                  <Spinner size="sm" />
                                  <span>Loading summary...</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Actions Tab */}
                        {activeTab === "actions" && (
                          <div className="space-y-4">
                            <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                              <span className="text-slate-600">✅</span>
                              Document Action Points
                            </h4>
                            {documentActionPoints && documentActionPoints.length > 0 ? (
                              <div className="space-y-3">
                                {documentActionPoints.map((action, index) => (
                                  <div key={index} className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
                                    <div className="flex justify-between items-start mb-2">
                                      <h5 className="font-semibold text-green-900">{action.title}</h5>
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        action.priority === 'high' ? 'bg-red-100 text-red-800' :
                                        action.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-blue-100 text-blue-800'
                                      }`}>
                                        {action.priority || 'medium'}
                                      </span>
                                    </div>
                                    <p className="text-green-800 leading-relaxed mb-2">{action.description}</p>
                                    {action.deadline && (
                                      <div className="flex items-center gap-2 text-sm">
                                        <span className="text-green-600">📅 Deadline:</span>
                                        <span className="text-green-800 font-medium">{action.deadline}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg">
                                <span className="text-4xl mb-2 block">📋</span>
                                <p>No action points available for this document.</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Precedents Tab */}
                        {activeTab === "precedents" && (
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

                                  {precedentResults.map((result) => (
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
                                              onClick={() => compareDocuments(fileId, result.file_id)}
                                              disabled={comparisonLoading}
                                              className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-semibold rounded-lg transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-105"
                                            >
                                              {comparisonLoading && comparingFileIds?.[1] === result.file_id ? (
                                                <Spinner size="sm" />
                                              ) : (
                                                "Compare"
                                              )}
                                            </button>
                                            <button
                                              onClick={() => analyzePrecedent(fileId, result.file_id)}
                                              disabled={analysisLoading}
                                              className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-xs font-semibold rounded-lg transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-105"
                                            >
                                              {analysisLoading && analyzingFileIds?.[1] === result.file_id ? (
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
                            {precedentSubTab === "comparison" && (
                              <div className="space-y-4">
                                {comparisonLoading && (
                                  <div className="flex flex-col items-center justify-center py-12">
                                    <Spinner size="lg" />
                                    <p className="text-gray-600 mt-4">Comparing documents...</p>
                                  </div>
                                )}

                                {comparisonError && (
                                  <div className="p-6 text-center">
                                    <p className="text-red-600">{comparisonError}</p>
                                  </div>
                                )}

                                {!comparisonLoading && !comparisonError && comparisonData && (
                                  <div className="space-y-4">
                                    {/* Document Headers */}
                                    <div className="grid grid-cols-2 gap-4 p-4 border border-gray-200 bg-gray-50 rounded-lg">
                                      <div className="bg-white rounded-lg p-3 border-2 border-blue-200">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="text-blue-600">📄</span>
                                          <h5 className="font-bold text-gray-900 text-sm">Current Document</h5>
                                        </div>
                                        <p className="text-sm text-gray-700 font-medium mb-1">
                                          {comparisonData.document_1.file_name}
                                        </p>
                                        <p className="text-xs text-gray-500">{comparisonData.document_1.path}</p>
                                      </div>

                                      <div className="bg-white rounded-lg p-3 border-2 border-green-200">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="text-green-600">📄</span>
                                          <h5 className="font-bold text-gray-900 text-sm">Precedent Document</h5>
                                        </div>
                                        <p className="text-sm text-gray-700 font-medium mb-1">
                                          {comparisonData.document_2.file_name}
                                        </p>
                                        <p className="text-xs text-gray-500">{comparisonData.document_2.path}</p>
                                        {comparisonData.document_2.upload_date && (
                                          <p className="text-xs text-gray-600 mt-1">
                                            {new Date(comparisonData.document_2.upload_date).toLocaleDateString()}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Matching Sections */}
                                    <div>
                                      <div className="flex items-center gap-2 mb-3">
                                        <span className="text-green-600">✅</span>
                                        <h5 className="text-lg font-bold text-gray-900">
                                          Matching Sections ({comparisonData.total_matches} found)
                                        </h5>
                                      </div>

                                      {comparisonData.matching_sections.length === 0 && (
                                        <div className="text-center py-8 text-gray-500">
                                          <p>No significant matching sections found</p>
                                        </div>
                                      )}

                                      <div className="space-y-3">
                                        {comparisonData.matching_sections.map((match: {
                                          similarity: number;
                                          section_1: string;
                                          section_2: string;
                                        }, index: number) => (
                                          <div
                                            key={index}
                                            className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm"
                                          >
                                            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                                              <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-700">
                                                  Match #{index + 1}
                                                </span>
                                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                                  {(match.similarity * 100).toFixed(0)}% Similar
                                                </span>
                                              </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-3 p-3">
                                              <div className="border-l-4 border-blue-400 pl-2">
                                                <p className="text-xs font-semibold text-gray-500 mb-1">Current</p>
                                                <p className="text-sm text-gray-700 leading-relaxed">
                                                  {match.section_1.length > 150 ? 
                                                    `${match.section_1.substring(0, 150)}...` : 
                                                    match.section_1
                                                  }
                                                </p>
                                              </div>
                                              
                                              <div className="border-l-4 border-green-400 pl-2">
                                                <p className="text-xs font-semibold text-gray-500 mb-1">Precedent</p>
                                                <p className="text-sm text-gray-700 leading-relaxed">
                                                  {match.section_2.length > 150 ? 
                                                    `${match.section_2.substring(0, 150)}...` : 
                                                    match.section_2
                                                  }
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {!comparisonData && !comparisonLoading && (
                                  <div className="text-center py-8 text-gray-500">
                                    <div className="text-4xl mb-4">⚖️</div>
                                    <p className="font-medium">No comparison data available</p>
                                    <p className="text-sm mt-2">Click &quot;Compare&quot; on a document in the Search tab</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Analysis Sub-tab */}
                            {precedentSubTab === "analysis" && (
                              <div className="space-y-4">
                                {analysisLoading && (
                                  <div className="flex flex-col items-center justify-center py-12">
                                    <Spinner size="lg" />
                                    <p className="text-gray-600 mt-4">Analyzing documents with AI...</p>
                                  </div>
                                )}

                                {analysisError && (
                                  <div className="p-6 text-center">
                                    <p className="text-red-600">{analysisError}</p>
                                  </div>
                                )}

                                {!analysisLoading && !analysisError && analysisData && (
                                  <div className="space-y-4">
                                    {/* Document Info */}
                                    <div className="grid grid-cols-2 gap-4 p-5 bg-gradient-to-br from-gray-50 via-slate-50/50 to-gray-50 border-2 border-gray-200/80 rounded-xl shadow-md">
                                      <div className="flex items-start gap-3 bg-white rounded-lg p-3 border-2 border-blue-200/60 shadow-sm">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-sm">
                                          <span className="text-blue-600 text-lg">📄</span>
                                        </div>
                                        <div>
                                          <p className="text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Current Document</p>
                                          <p className="text-sm font-bold text-gray-900 leading-tight">
                                            {analysisData.current_document.file_name}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-start gap-3 bg-white rounded-lg p-3 border-2 border-green-200/60 shadow-sm">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center shadow-sm">
                                          <span className="text-green-600 text-lg">📄</span>
                                        </div>
                                        <div>
                                          <p className="text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Precedent Document</p>
                                          <p className="text-sm font-bold text-gray-900 leading-tight">
                                            {analysisData.precedent_document.file_name}
                                          </p>
                                          {analysisData.precedent_document.upload_date && (
                                            <p className="text-xs text-gray-600 mt-1.5 font-medium">
                                              📅 {new Date(analysisData.precedent_document.upload_date).toLocaleDateString()}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Analysis Sections */}
                                    <div className="space-y-5">
                                      {/* Summary */}
                                      {Boolean(analysisData.analysis.summary) && (
                                        <div className="bg-gradient-to-br from-indigo-50 via-purple-50/50 to-indigo-50 rounded-xl p-5 border-2 border-indigo-200/60 shadow-md hover:shadow-lg transition-shadow duration-300">
                                          <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shadow-sm">
                                              <span className="text-xl">💡</span>
                                            </div>
                                            <h5 className="text-lg font-bold text-gray-900 tracking-tight">Summary</h5>
                                          </div>
                                          <div className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">
                                            {renderAnalysisField(analysisData.analysis.summary)}
                                          </div>
                                        </div>
                                      )}

                                      {/* Similarities */}
                                      {Boolean(analysisData.analysis.similarities) && (
                                        <div className="bg-gradient-to-br from-green-50 via-emerald-50/50 to-green-50 rounded-xl p-5 border-2 border-green-200/60 shadow-md hover:shadow-lg transition-shadow duration-300">
                                          <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center shadow-sm">
                                              <span className="text-xl">✅</span>
                                            </div>
                                            <h5 className="text-lg font-bold text-gray-900 tracking-tight">Key Similarities</h5>
                                          </div>
                                          <div className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">
                                            {renderAnalysisField(analysisData.analysis.similarities)}
                                          </div>
                                        </div>
                                      )}

                                      {/* Applicability */}
                                      {Boolean(analysisData.analysis.applicability) && (
                                        <div className="bg-gradient-to-br from-blue-50 via-sky-50/50 to-blue-50 rounded-xl p-5 border-2 border-blue-200/60 shadow-md hover:shadow-lg transition-shadow duration-300">
                                          <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-sky-100 flex items-center justify-center shadow-sm">
                                              <span className="text-xl">🧠</span>
                                            </div>
                                            <h5 className="text-lg font-bold text-gray-900 tracking-tight">How This Precedent Applies</h5>
                                          </div>
                                          <div className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">
                                            {renderAnalysisField(analysisData.analysis.applicability)}
                                          </div>
                                        </div>
                                      )}

                                      {/* Differences */}
                                      {Boolean(analysisData.analysis.differences) && (
                                        <div className="bg-gradient-to-br from-orange-50 via-amber-50/50 to-orange-50 rounded-xl p-5 border-2 border-orange-200/60 shadow-md hover:shadow-lg transition-shadow duration-300">
                                          <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center shadow-sm">
                                              <span className="text-xl">⚠️</span>
                                            </div>
                                            <h5 className="text-lg font-bold text-gray-900 tracking-tight">Notable Differences</h5>
                                          </div>
                                          <div className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">
                                            {renderAnalysisField(analysisData.analysis.differences)}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {!analysisData && !analysisLoading && (
                                  <div className="text-center py-8 text-gray-500">
                                    <div className="text-4xl mb-4">🧠</div>
                                    <p className="font-medium">No analysis data available</p>
                                    <p className="text-sm mt-2">Click &quot;Analyze&quot; on a document in the Search tab</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </ModalBody>
                
                <ModalFooter className="border-t border-slate-200/80 bg-gradient-to-r from-slate-50 via-blue-50/30 to-white gap-3 shadow-inner">
                  <Button 
                      className="bg-blue-800 text-white font-medium px-6 hover:bg-blue-900 transition-all duration-200 shadow-lg rounded-xl"                    onClick={() => {
                      setActiveTab("precedents");
                    }} onPress={() => {
                      setActiveTab("precedents");
                    }}
                  >
                    🔍 Run Precedent Analysis
                  </Button>

                  <Button 
                    className="bg-blue-800 text-white font-medium px-6 hover:bg-blue-900 transition-all duration-200 shadow-lg"
                    onPress={handleChat}
                  >
                    💬 AI Chat
                  </Button>
               
                  
                  <Button 
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-6 py-2.5 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 rounded-xl"
                    onClick={onClose}
                  >
                    Close
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* File Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {currentFiles.map((file, index) => (
            <FileCard
              key={index}
              file={file}
              setFiles={setFiles}
              onDirectoryClick={onDirectoryClick}
              onViewFile={handleViewFile}
              onAnalyze={onAnalyze}
              onMove={onMove}
              onTagsChange={handleTagsChange}
              currentPath={currentPath}
            />
          ))}
        </div>

        {/* Enhanced Pagination */}
        <div className="flex justify-center items-center mt-8 gap-4">
          <Button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => prev - 1)}
            className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2 font-medium transition-all duration-200"
          >
            ← Previous
          </Button>
          
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-300 shadow-sm">
            <span className="text-slate-600 font-medium">Page</span>
            <span className="font-bold text-slate-800">{currentPage}</span>
            <span className="text-slate-400">of</span>
            <span className="font-bold text-slate-800">{totalPages}</span>
          </div>
          
          <Button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => prev + 1)}
            className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2 font-medium transition-all duration-200"
          >
            Next →
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ModernFileList;