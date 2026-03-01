/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import { useState, useEffect, useCallback } from "react";
import { Loader2, Search, FolderOpen, ArrowLeft, Database, RefreshCcw, ChevronDown, ChevronUp } from "lucide-react";
import PQueue from "p-queue";
import FileTable from "./ModernFileList";
import CollapsibleFileSection from "./CollapsibleFileSection";
import { transformCategorizedFiles, isCategorizedResponse, transformBackendFileToFrontend } from "../utils/fileTransforms";
// import DestinationList from "./DestinationList";
import type { File } from "../app/types";
import { toast } from "react-toastify";
import UploadModal from "./UploadModal";
import ExtensiveSearchModal from "./ExtensiveSearchModal";
import { useAppContext } from "@/app/AppContext";
import AddFolderModal from "./AddFolderModal";
import { useUser } from "@clerk/nextjs";
import TableQuery from "./Directory/TableQuery";
import { API_ENDPOINTS } from "@/config/api";
import MultiDocComparisonModal from "./MultiDocComparisonModal";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
interface CustomWindow extends Window {
  __FILE_ORGANIZER__?: {
    API_LIST_DIR: string;
    API_ANALYZE_FILE: string;
    API_MOVE_FILES: string;
    API_SEARCH_EXTENSIVE?: string; // Added if you want to override the extensive search endpoint
  };
}
declare const window: CustomWindow;
//asd
let API_LIST_DIR: string = API_ENDPOINTS.LIST_DIR;
let API_ANALYZE_FILE: string = API_ENDPOINTS.ANALYZE_FILE;
let API_MOVE_FILES: string = API_ENDPOINTS.MOVE_FILES;
let API_SEARCH_EXTENSIVE: string = API_ENDPOINTS.SEARCH_EXTENSIVE;

if (typeof window !== "undefined") {
  API_LIST_DIR = window.__FILE_ORGANIZER__?.API_LIST_DIR || API_LIST_DIR;
  API_ANALYZE_FILE =
    window.__FILE_ORGANIZER__?.API_ANALYZE_FILE || API_ANALYZE_FILE;
  API_MOVE_FILES = window.__FILE_ORGANIZER__?.API_MOVE_FILES || API_MOVE_FILES;
  API_SEARCH_EXTENSIVE =
    window.__FILE_ORGANIZER__?.API_SEARCH_EXTENSIVE || API_SEARCH_EXTENSIVE;
}

const queue = new PQueue({ concurrency: 1 });

const fileTypeOptions = [
  { label: "Text File", value: "txt" },
  { label: "Word Document", value: "docx" },
  { label: "PDF", value: "pdf" },
  { label: "PNG Image", value: "png" },
  { label: "JPEG Image", value: "jpeg" },
  { label: "JPG Image", value: "jpg" },
  { label: "Python File", value: "py" },
  { label: "Java File", value: "java" },
  { label: "C File", value: "c" },
  { label: "C++ File", value: "cpp" },
];

async function postData(url: string, data = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }

  return res.json();
}

async function analyzeFile(
  file: File,
  path: string,
  destinations: string[],
  refreshState: () => void
) {
  file.status = "analyzing";
  refreshState();
  console.log("File Id:", file.fileId);
  return postData(API_ANALYZE_FILE, {
    file_id: file.fileId,
    file: file.fileName,
    dir: path,
    destinations,
  })
    .then((data) => {
      if (data.destination != null) {
        file.filePath = data.destination;
        file.status = "analyzed";
      } else {
        file.status = "failed";
      }
    })
    .catch((err) => {
      file.filePath = undefined;
      file.status = "failed";
      console.log(err);
    })
    .finally(() => {
      refreshState();
    });
}

const DEFAULT_DESTINATIONS = [
  "~/Sandbox/Downloads/software",
  "~/Sandbox/Downloads/pictures",
  "~/Sandbox/Downloads/other",
  "~/Sandbox/Documents/work",
  "~/Sandbox/Documents/personal",
  "~/Sandbox/Documents/personal/family",
  "~/Sandbox/Documents/personal/bills",
];

export default function Main() {
  const [path, setPath] = useState<string>("~/Sandbox");
  const [currentDir, setCurrentDir] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  
  // New state for categorized files - updated for MoE document management
  const [categorizedFiles, setCategorizedFiles] = useState<{
    uploaded_by_user: File[];
    recent_documents: File[];
    all_documents: File[];
  } | null>(null);
  const [showCategorized, setShowCategorized] = useState<boolean>(false);
  
  // Document type filtering
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>("");
  const availableDocumentTypes = [
    { value: "", label: "All Document Types" },
    { value: "circular", label: "Circular" },
    { value: "report", label: "Report" },
    { value: "policy", label: "Policy" },
    { value: "scheme", label: "Scheme" },
    { value: "notice", label: "Notice" },
    { value: "order", label: "Order" },
    { value: "guideline", label: "Guideline" },
    { value: "regulation", label: "Regulation" },
    { value: "letter", label: "Letter" },
    { value: "memorandum", label: "Memorandum" }
  ];
  
  // Collapsible section states
  const [isUserFilesOpen, setIsUserFilesOpen] = useState<boolean>(true);
  const [isRecentFilesOpen, setIsRecentFilesOpen] = useState<boolean>(true);
  const [isAllFilesOpen, setIsAllFilesOpen] = useState<boolean>(false);
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isTableQueryOpen, setIsTableQueryOpen] = useState<boolean>(false);
  const allowedPath = "~/Sandbox";
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { voiceSearchText, setVoiceSearchText } = useAppContext();
  const [searchText, setSearchText] = useState<string>(""); // Basic search text
  const [fileType, setFileType] = useState<string[]>([]); // Selected file types
  const [peopleNames, setPeopleNames] = useState<string[]>([]); // Names of people in the picture
  const [customTags, setCustomTags] = useState<string[]>([]); // Custom tags
  const [searchLimit, setSearchLimit] = useState<number>(50); // Result limit
  const [searchTime, setSearchTime] = useState<string>(""); // Search performance time
  const [totalFound, setTotalFound] = useState<number>(0); // Total results found
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const { user } = useUser();
  const [emailOnly, setEmailOnly] = useState<boolean>(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);

  const onSearchFiles = useCallback(async (text ?: string) => {
    if(text == "" || text == undefined){
      text = searchText;
    }
    try {
      setIsSearching(true);
      setSearchTime("");
      setTotalFound(0);
      
      const response = await fetch(API_SEARCH_EXTENSIVE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          searchText: text,
          limit: searchLimit // Use configurable limit
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const data = await response.json();
      console.log("Enhanced Search Success:", data);

      // Update performance metrics
      if (data.search_time) {
        setSearchTime(data.search_time);
      }
      if (data.total_found !== undefined) {
        setTotalFound(data.total_found);
      }

      if (data.results && data.results.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fetchedFiles: File[] = data.results.map((item: any) => ({
          fileId: item.file_id,
          fileName: item.file_name,
          isDirectory: false,
          filePath: item.path,
          fileType: item.file_type,
          importantWords: item.important_words,
          totalScore: item.total_score,
          semanticScore: item.semantic_score,
          keyTopicsScore: item.key_topics_score,
          tags: item.tags || [],
          keyTopics: item.key_topics || [],
          status: "found",
          userId: item.user_id,
        }));
        setFiles(fetchedFiles);
        setSelectedFiles([]);
        setIsSearching(false);
        
        // Reset categorized view when searching
        setShowCategorized(false);
        setCategorizedFiles(null);
        
        const performanceMsg = data.search_time ? ` (${data.search_time})` : "";
        const totalMsg = data.total_found ? ` - ${data.total_found} total found` : "";
        toast.success(
          `Search Completed: ${data.results.length} file(s) displayed${totalMsg}${performanceMsg}`
        );
      } else {
        setFiles([]);
        setIsSearching(false);
        setShowCategorized(false);
        setCategorizedFiles(null);
        toast.info("No Results: No files match the search criteria.");
      }
    } catch (error) {
      console.error("Error:", error);
      setIsSearching(false);
      setShowCategorized(false);
      setCategorizedFiles(null);
      toast.error(
        "Search Failed: An error occurred while performing the search."
      );
    }

    console.log("Enhanced Search for:", text);
  }, [searchText, searchLimit]);

  const onExtensiveSearch = async () => {
    try {
      setIsSearching(true);
      setSearchTime("");
      setTotalFound(0);
      
      const response = await fetch(API_SEARCH_EXTENSIVE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchText,
          fileType,
          peopleNames,
          customTags,
          limit: searchLimit
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to perform extensive search");
      }

      const data = await response.json();
      console.log("Enhanced Extensive Search Success:", data);

      // Update performance metrics
      if (data.search_time) {
        setSearchTime(data.search_time);
      }
      if (data.total_found !== undefined) {
        setTotalFound(data.total_found);
      }

      if (data.results && data.results.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fetchedFiles = data.results.map((item: any) => ({
          fileId: item.file_id,
          fileName: item.file_name,
          isDirectory: false,
          filePath: item.path,
          fileType: item.file_type,
          importantWords: item.important_words,
          totalScore: item.total_score,
          semanticScore: item.semantic_score,
          keyTopicsScore: item.key_topics_score,
          tags: item.tags || [],
          keyTopics: item.key_topics || [],
          userId: item.user_id,
        }));
        setFiles(fetchedFiles);
        setIsSearching(false);
        
        // Reset categorized view when searching
        setShowCategorized(false);
        setCategorizedFiles(null);
        
        const performanceMsg = data.search_time ? ` (${data.search_time})` : "";
        const totalMsg = data.total_found ? ` - ${data.total_found} total found` : "";
        toast.success(
          `Extensive Search Completed: ${data.results.length} file(s) displayed${totalMsg}${performanceMsg}`
        );
      } else {
        setFiles([]);
        setIsSearching(false);
        setShowCategorized(false);
        setCategorizedFiles(null);
        toast.info("No Results: No files match the search criteria.");
      }
    } catch (error) {
      console.error("Extensive Search Error:", error);
      setIsSearching(false);
      setShowCategorized(false);
      setCategorizedFiles(null);
      toast.error(
        "Search Failed: An error occurred while performing the search."
      );
    }
  };

  const onShowFiles = useCallback((e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();

    if (!path.startsWith(allowedPath)) {
      toast.error(
        `Invalid Directory: You can only access directories inside ${allowedPath}`
      );
      return;
    }

    // Build payload with document type filter and other options
    const payload: Record<string, unknown> = { 
      user_id: user?.id,
      show_categorized: true
    };
    
    // Add document type filter if selected
    if (selectedDocumentType) {
      payload.document_type = selectedDocumentType;
    }
    
    // Add source filter if email only is selected
    if (emailOnly) {
      payload.source = 'email';
    }

    setIsLoadingFiles(true);
    postData(API_LIST_DIR, payload)
      .then((data) => {
        console.log("MoE Document Data:", data);
        setCurrentDir(path);
        setSelectedFiles([]);
        
        // Handle new MoE categorized format
        if (data && typeof data === 'object' && 'uploaded_by_user' in data) {
          const transformed = {
            uploaded_by_user: data.uploaded_by_user?.map((item: any) => transformBackendFileToFrontend(item)) || [],
            recent_documents: data.recent_documents?.map((item: any) => transformBackendFileToFrontend(item)) || [],
            all_documents: data.all_documents?.map((item: any) => transformBackendFileToFrontend(item)) || []
          };
          setCategorizedFiles(transformed);
          setShowCategorized(true);
          
          // Set flat files for backward compatibility
          setFiles(transformed.all_documents);
        } else if (Array.isArray(data)) {
          // Handle flat format
          setShowCategorized(false);
          setCategorizedFiles(null);
          setFiles(
            data.map((item: any) => transformBackendFileToFrontend(item))
          );
        } else {
          console.error("Unexpected data format:", data);
          setShowCategorized(false);
          setCategorizedFiles(null);
          setFiles([]);
        }
      })
      .catch((err) => {
        console.error("Error loading files:", err);
        toast.error("Failed to load files");
        setShowCategorized(false);
        setCategorizedFiles(null);
      })
      .finally(() => setIsLoadingFiles(false));
  }, [path, user?.id, emailOnly, selectedDocumentType]);

  useEffect(() => {
    // Only call onShowFiles automatically when we have a path and user id
    if (!path || !user?.id) return;
    onShowFiles();
  }, [path, onShowFiles, user?.id, emailOnly, selectedDocumentType]);

  useEffect(() => {
    if (voiceSearchText) {
      setSearchText(voiceSearchText);
      onSearchFiles(voiceSearchText);
    }
  }, [voiceSearchText, onSearchFiles]);

  const onAnalyze = (file: File) => {
    file.status = "pending";
    setFiles([...files]);
    queue.add(() =>
      analyzeFile(file, path, DEFAULT_DESTINATIONS, () => setFiles([...files]))
    );
  };

  const onMove = (file: File) => {
    postData(API_MOVE_FILES, {
      current_path: path,
      file_id: file.fileId,
      file_name: file.fileName,
      new_path: file.filePath,
    }).then(() => {
      toast.success(
        <div className="break-words hyphens-auto">
          <span className="font-medium break-words">{file.fileName}</span> has
          been moved to{" "}
          <span className="text-green-800 font-medium">{file.filePath}</span>
        </div>
      );
      setFiles(files.filter((f) => f !== file));
      setSelectedFiles(selectedFiles.filter((f) => f !== file));
      onShowFiles();
    });
  };

  const onDirectoryClick = (directory: string) => {
    const newPath = `${path}/${directory.slice(0, -1)}`;
    setPath(newPath);
    const payload = { dir: newPath, user_id: user?.id };

    postData(API_LIST_DIR, payload).then((data) => {
      setCurrentDir(newPath);
      setSelectedFiles([]);
      setFiles(
        data.map((item: File) => ({
          id: item.fileId,
          name: item.fileName,
          isDirectory: item.fileName.endsWith("/"),
          destination: item.filePath,
          tags: item.tags,
          userId: item.userId,
        }))
      );
    });
  };

  return (
    <>
      <div className="min-h-screen">
        {!isTableQueryOpen ? (
          <div className="w-full px-4">
            <div className="space-y-6">
              {/* Header Section */}
              <div className="text-center space-y-4 mb-6">
                <div 
                  id="tour-header"
                  className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 relative overflow-hidden"
                  style={{
                    backgroundImage: `
                      linear-gradient(rgba(156, 163, 175, 0.03) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(156, 163, 175, 0.03) 1px, transparent 1px)
                    `,
                    backgroundSize: '24px 24px'
                  }}
                >
                  <div className="relative z-10">
                    <h1 className="text-5xl font-bold text-gray-800 mb-4">MoE Document Management</h1>
                    <p className="text-xl text-gray-600">Ministry of Education - Department of Higher Education Document Repository</p>
                    <p className="text-sm text-gray-500 mt-2">Manage policies, schemes, regulations, and administrative documents efficiently</p>
                  </div>
                </div>
              </div>

              {/* Search and Actions Card */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                {/* Card Header */}
                <div 
                  className="bg-blue-50 p-6 border-b border-blue-100 relative"
                  style={{
                    backgroundImage: `
                      linear-gradient(rgba(59, 130, 246, 0.04) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(59, 130, 246, 0.04) 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px'
                  }}
                >
                  <div>
                    <h2 className="text-2xl font-bold text-blue-800 flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Search className="h-6 w-6 text-blue-600" />
                      </div>
                      Search & Actions
                    </h2>
                    <p className="text-blue-600 mt-2">
                      Search files and perform various actions across your document library
                    </p>
                  </div>
                </div>
                
                <div 
                  className="p-6 relative"
                  style={{
                    backgroundImage: `
                      linear-gradient(rgba(156, 163, 175, 0.02) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(156, 163, 175, 0.02) 1px, transparent 1px)
                    `,
                    backgroundSize: '32px 32px'
                  }}
                >
                  <div className="space-y-6">
                    {/* Search Section */}
                    <div className="flex flex-col gap-4">
                      {/* Main Search Row */}
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <input
                            id="tour-search-input"
                            placeholder="Search files..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="flex h-12 w-full rounded-lg border border-blue-200 bg-white px-4 py-3 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-400 transition-all duration-200 hover:border-blue-300"
                          />
                        </div>
                        <div className="w-24">
                          <input
                            id="tour-search-limit"
                            type="number"
                            min="1"
                            max="100"
                            placeholder="50"
                            value={searchLimit}
                            onChange={(e) => setSearchLimit(parseInt(e.target.value) || 50)}
                            className="flex h-12 w-full rounded-lg border border-blue-200 bg-white px-3 py-3 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-400 transition-all duration-200 hover:border-blue-300"
                          />
                        </div>
                        <Button
                          id="tour-search-button"
                          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white h-12 px-8 rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105"
                          onClick={() => onSearchFiles()}
                          disabled={isSearching}
                        >
                          <div className="flex items-center gap-2">
                            <div className="bg-transparent rounded-lg">
                              <Search className="h-4 w-4" />
                            </div>
                            {isSearching ? "Searching..." : "Search"}
                          </div>
                        </Button>
                        <div id="tour-extensive-search">
                        <ExtensiveSearchModal
                          searchText={searchText}
                          setSearchText={setSearchText}
                          fileType={fileType}
                          fileTypeOptions={fileTypeOptions}
                          setFileType={setFileType}
                          peopleNames={peopleNames}
                          setPeopleNames={setPeopleNames}
                          customTags={customTags}
                          setCustomTags={setCustomTags}
                          onExtensiveSearch={onExtensiveSearch}
                        />
                        </div>
                      </div>
                    </div>
                    
                    {/* Search Performance Display */}
                    {(searchTime || totalFound > 0) && (
                      <div className="flex justify-between items-center text-sm bg-blue-50 rounded-lg p-4 border border-blue-100">
                        {totalFound > 0 && (
                          <span className="font-semibold text-blue-800">
                            📊 Found {totalFound} total results
                          </span>
                        )}
                        {searchTime && (
                          <span className="text-blue-600 font-medium">
                            ⚡ Search completed in {searchTime}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Document Type Filter Section */}
                    <div id="tour-document-filter" className="bg-gradient-to-br from-purple-50 to-indigo-50/30 rounded-2xl p-6 border border-purple-200 shadow-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-purple-800">Document Type Filter</h3>
                            <p className="text-purple-600 text-sm">Filter documents by type for better organization</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <select
                            value={selectedDocumentType}
                            onChange={(e) => setSelectedDocumentType(e.target.value)}
                            className="h-12 px-4 py-2 bg-white border-2 border-purple-200 rounded-xl text-purple-800 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 transition-all duration-200 hover:border-purple-300 min-w-[200px]"
                          >
                            {availableDocumentTypes.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                          {selectedDocumentType && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedDocumentType("")}
                              className="border-purple-300 text-purple-700 hover:bg-purple-50 bg-white font-medium h-12 px-4 rounded-xl transition-all duration-200"
                            >
                              Clear Filter
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Section */}
                    <div className="flex items-center justify-between bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-2xl p-6 border border-slate-200 shadow-md">
                      <div className="flex gap-4">
                        <div id="tour-upload-button">
                          <UploadModal currentPath={path} />
                        </div>
                        <Button 
                          id="tour-refresh-button"
                          variant="outline"
                          className="border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 bg-white font-semibold h-12 px-6 rounded-xl transition-all duration-200 shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-105"
                          onClick={() => {
                            setSearchText("");
                            setShowCategorized(true);
                            setCategorizedFiles(null);
                            onShowFiles();
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-100 rounded-lg">
                              <RefreshCcw className="h-4 w-4" />
                            </div>
                            Refresh Documents
                          </div>
                        </Button>
                        <Button 
                          id="tour-compare-button"
                          variant="outline"
                          className="border-2 border-purple-300 text-purple-700 hover:bg-purple-50 bg-white font-semibold h-12 px-6 rounded-xl transition-all duration-200 shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30 hover:scale-105"
                          onClick={() => setIsCompareModalOpen(true)}
                        >
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-purple-100 rounded-lg">
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            </div>
                            Compare Docs
                          </div>
                        </Button>
                        <label id="tour-email-filter" className="inline-flex items-center gap-3 text-sm font-semibold text-slate-700 bg-white px-5 py-3 rounded-xl border-2 border-slate-200 hover:border-slate-300 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md">
                          <input type="checkbox" className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-2 focus:ring-blue-500" checked={emailOnly} onChange={(e) => setEmailOnly(e.target.checked)} />
                          Email Documents Only
                        </label>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 font-semibold">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        MoE Document Repository
                      </div>
                    </div>
                  </div>
                </div>
              </div>


              {/* File Table, Searching, or Loading Skeleton */}
              {isSearching ? (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="py-16">
                    <div className="flex flex-col items-center justify-center space-y-6">
                      <div className="relative">
                        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                      </div>
                      <div className="text-center">
                        <p className="text-xl text-blue-700 font-semibold mb-2">
                          Searching files...
                        </p>
                        <p className="text-blue-500">
                          Please wait while we find the best matches
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : isLoadingFiles ? (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    <div className="space-y-4">
                      {[...Array(6)].map((_, idx) => (
                        <div key={idx} className="flex items-center justify-between space-x-4 p-4 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="h-4 bg-gray-200 rounded w-3/5 animate-pulse mb-2" />
                            <div className="h-3 bg-gray-100 rounded w-1/3 animate-pulse" />
                          </div>
                          <div className="w-32">
                            <div className="h-3 bg-gray-100 rounded w-full animate-pulse" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : showCategorized && categorizedFiles ? (
                <div id="tour-documents-section" className="space-y-6">

                  {/* All Documents */}
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    <div 
                      className="cursor-pointer transition-all duration-200 hover:bg-purple-50 bg-purple-50 border-b border-purple-200 relative"
                      onClick={() => setIsAllFilesOpen(!isAllFilesOpen)}
                      style={{
                        backgroundImage: `
                          linear-gradient(rgba(168, 85, 247, 0.04) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(168, 85, 247, 0.04) 1px, transparent 1px)
                        `,
                        backgroundSize: '24px 24px'
                      }}
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-2xl">📚</span>
                            <div>
                              <h3 className="text-xl font-bold text-purple-800">All Documents</h3>
                              <p className="text-purple-600">Complete MoE document repository - policies, schemes, regulations & more</p>
                            </div>
                            <div className="ml-4 bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                              {categorizedFiles.all_documents.length}
                            </div>
                          </div>
                          {isAllFilesOpen ? (
                            <ChevronUp className="h-6 w-6 text-purple-600" />
                          ) : (
                            <ChevronDown className="h-6 w-6 text-purple-600" />
                          )}
                        </div>
                      </div>
                    </div>
                    {isAllFilesOpen && (
                      <div 
                        className="bg-white relative"
                        style={{
                          backgroundImage: `
                            linear-gradient(rgba(156, 163, 175, 0.02) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(156, 163, 175, 0.02) 1px, transparent 1px)
                          `,
                          backgroundSize: '32px 32px'
                        }}
                      >
                        <FileTable
                          files={categorizedFiles.all_documents}
                          setFiles={setFiles}
                          onAnalyze={onAnalyze}
                          onMove={onMove}
                          selectedFiles={selectedFiles}
                          setSelectedFiles={setSelectedFiles}
                          onDirectoryClick={onDirectoryClick}
                          currentPath={path}
                          onShowFiles={onShowFiles}
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Recent Documents */}
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    <div 
                      className="cursor-pointer transition-all duration-200 hover:bg-green-50 bg-green-50 border-b border-green-200 relative"
                      onClick={() => setIsRecentFilesOpen(!isRecentFilesOpen)}
                      style={{
                        backgroundImage: `
                          linear-gradient(rgba(34, 197, 94, 0.04) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(34, 197, 94, 0.04) 1px, transparent 1px)
                        `,
                        backgroundSize: '24px 24px'
                      }}
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-2xl">🕒</span>
                            <div>
                              <h3 className="text-xl font-bold text-green-800">Recent Documents</h3>
                              <p className="text-green-600">Latest documents added to the repository (last 30 days)</p>
                            </div>
                            <div className="ml-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                              {categorizedFiles.recent_documents.length}
                            </div>
                          </div>
                          {isRecentFilesOpen ? (
                            <ChevronUp className="h-6 w-6 text-green-600" />
                          ) : (
                            <ChevronDown className="h-6 w-6 text-green-600" />
                          )}
                        </div>
                      </div>
                    </div>
                    {isRecentFilesOpen && (
                      <div 
                        className="bg-white relative"
                        style={{
                          backgroundImage: `
                            linear-gradient(rgba(156, 163, 175, 0.02) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(156, 163, 175, 0.02) 1px, transparent 1px)
                          `,
                          backgroundSize: '32px 32px'
                        }}
                      >
                        <FileTable
                          files={categorizedFiles.recent_documents}
                          setFiles={setFiles}
                          onAnalyze={onAnalyze}
                          onMove={onMove}
                          selectedFiles={selectedFiles}
                          setSelectedFiles={setSelectedFiles}
                          onDirectoryClick={onDirectoryClick}
                          currentPath={path}
                          onShowFiles={onShowFiles}
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Your Uploaded Documents */}
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    <div 
                      className="cursor-pointer transition-all duration-200 hover:bg-blue-50 bg-blue-50 border-b border-blue-200 relative"
                      onClick={() => setIsUserFilesOpen(!isUserFilesOpen)}
                      style={{
                        backgroundImage: `
                          linear-gradient(rgba(59, 130, 246, 0.04) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(59, 130, 246, 0.04) 1px, transparent 1px)
                        `,
                        backgroundSize: '24px 24px'
                      }}
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-2xl">📝</span>
                            <div>
                              <h3 className="text-xl font-bold text-blue-800">Your Uploaded Documents</h3>
                              <p className="text-blue-600">Documents you have contributed to the MoE repository</p>
                            </div>
                            <div className="ml-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                              {categorizedFiles.uploaded_by_user.length}
                            </div>
                          </div>
                          {isUserFilesOpen ? (
                            <ChevronUp className="h-6 w-6 text-blue-600" />
                          ) : (
                            <ChevronDown className="h-6 w-6 text-blue-600" />
                          )}
                        </div>
                      </div>
                    </div>
                    {isUserFilesOpen && (
                      <div 
                        className="bg-white relative"
                        style={{
                          backgroundImage: `
                            linear-gradient(rgba(156, 163, 175, 0.02) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(156, 163, 175, 0.02) 1px, transparent 1px)
                          `,
                          backgroundSize: '32px 32px'
                        }}
                      >
                        <FileTable
                          files={categorizedFiles.uploaded_by_user}
                          setFiles={setFiles}
                          onAnalyze={onAnalyze}
                          onMove={onMove}
                          selectedFiles={selectedFiles}
                          setSelectedFiles={setSelectedFiles}
                          onDirectoryClick={onDirectoryClick}
                          currentPath={path}
                          onShowFiles={onShowFiles}
                        />
                      </div>
                    )}
                  </div>
                  
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                  <div 
                    className="bg-gray-50 p-6 border-b border-gray-200 relative"
                    style={{
                      backgroundImage: `
                        linear-gradient(rgba(156, 163, 175, 0.04) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(156, 163, 175, 0.04) 1px, transparent 1px)
                      `,
                      backgroundSize: '24px 24px'
                    }}
                  >
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                      <Database className="h-5 w-5 text-gray-600" />
                      All Files
                    </h3>
                    <p className="text-gray-600 mt-1">Complete view of all accessible files</p>
                  </div>
                  <div 
                    className="bg-white relative"
                    style={{
                      backgroundImage: `
                        linear-gradient(rgba(156, 163, 175, 0.02) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(156, 163, 175, 0.02) 1px, transparent 1px)
                      `,
                      backgroundSize: '32px 32px'
                    }}
                  >
                    <FileTable
                      files={files}
                      setFiles={setFiles}
                      onAnalyze={onAnalyze}
                      onMove={onMove}
                      selectedFiles={selectedFiles}
                      setSelectedFiles={setSelectedFiles}
                      onDirectoryClick={onDirectoryClick}
                      currentPath={path}
                      onShowFiles={onShowFiles}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full px-4">
            <div className="mb-6">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                <Button 
                  variant="outline"
                  className="border border-blue-300 text-blue-700 hover:bg-blue-50 bg-white font-medium h-12 px-6 rounded-lg transition-all duration-200 hover:shadow-lg"
                  onClick={() => setIsTableQueryOpen(false)}
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back to File Organizer
                </Button>
              </div>
            </div>
            <div 
              className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden relative"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(156, 163, 175, 0.02) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(156, 163, 175, 0.02) 1px, transparent 1px)
                `,
                backgroundSize: '32px 32px'
              }}
            >
              <TableQuery folder={path} />
            </div>
          </div>
        )}
      </div>
      
      {/* Multi-Document Comparison Modal */}
      <MultiDocComparisonModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        availableFiles={(showCategorized && categorizedFiles 
          ? categorizedFiles.all_documents 
          : files).map(file => ({
            fileId: file.fileId,
            fileName: file.fileName,
            filePath: file.filePath,
            tags: file.tags,
            uploadDate: file.uploadDate,
            userId: file.userId
          }))}
      />
    </>
  );
}
