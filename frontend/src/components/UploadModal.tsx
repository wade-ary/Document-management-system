/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalFooter,
  useDisclosure,
  Checkbox,
  Spinner,
} from "@nextui-org/react";
import Image from "next/image";
import { API_ENDPOINTS } from "@/config/api";
import { AiOutlineClose } from "react-icons/ai";
import { useUser } from "@clerk/nextjs";
import ComplianceModal from "./ComplianceModal";

interface PreviewFile extends File {
  preview: string;
}

type UploadModalProps = {
  currentPath: string;
  openModal?: boolean;
  showButton?: boolean;
};

function UploadModal({
  currentPath,
  openModal,
  showButton = true,
}: UploadModalProps) {
  // File visibility removed — per latest spec we only collect department access and deadline
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [uploading, setUploading] = useState<boolean>(false);
  const [filePreviews, setFilePreviews] = useState<PreviewFile[]>([]);
  // Deadline for departments to respond (ISO date string)
  const [deadline, setDeadline] = useState<string>("");
  const [important, setImportant] = useState<boolean>(false);
  // Document type for the uploaded file
  const [documentType, setDocumentType] = useState<string>("");
  const [selectedDocumentTypes, setSelectedDocumentTypes] = useState<string[]>([]);
  const { user } = useUser();

  // Handle compliance modal close
  const handleComplianceModalClose = () => {
    setShowComplianceModal(false);
    onOpenChange();
    // Reset states
    setFilePreviews([]);
    setProcessingProgress(0);
    setComplianceAnalysisResult(null);
  };

  // Helper to get selected document types as a string
  const getDocumentTypeFormValue = () => {
    if (!selectedDocumentTypes || selectedDocumentTypes.length === 0) return "";
    return selectedDocumentTypes.join(",");
  };

  // Available document types from the backend system
  const availableDocumentTypes = [
    "circular", "report", "policy", "scheme", "notice", 
    "order", "guideline", "regulation", "letter", "memorandum"
  ];

  // Helper to toggle document type selection
  const toggleDocumentType = (docType: string, checked: boolean) => {
    if (checked) {
      setSelectedDocumentTypes((prev) => [...prev, docType]);
    } else {
      setSelectedDocumentTypes((prev) => prev.filter((d) => d !== docType));
    }
  };

  useEffect(() => {
    console.log("Important?: ", important);
  }, [important]);

  const accept = {
    "text/plain": [".txt"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      ".docx",
    ],
    "application/pdf": [".pdf"],
    "text/markdown": [".md"],
    "application/vnd.ms-powerpoint": [".ppt", ".pptx"],
    "image/png": [".png"],
    "image/jpeg": [".jpg", ".jpeg"],
    "application/json": [".json"],
  };

  // File visibility removed; no handler required

  const { getRootProps, getInputProps } = useDropzone({
    accept,
    onDrop: (acceptedFiles) => {
      setFilePreviews((prevFiles) => [
        ...prevFiles,
        ...acceptedFiles.map((file) =>
          Object.assign(file, {
            preview: URL.createObjectURL(file),
          })
        ),
      ]);
    },
  });

  // Helper function to format file size
  const formatFileSize = (size: number) => {
    return size > 1024 * 1024
      ? `${(size / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.round(size / 1024)} KB`;
  };

  // Function to handle file removal
  const handleRemoveFile = (index: number) => {
    setFilePreviews((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (filePreviews.length === 0) {
      toast.error("Please select files to upload.");
      return;
    }

    // Validate document type selection
    if (selectedDocumentTypes.length === 0) {
      toast.error("Please select at least one document type.");
      return;
    }

    // Client-side deadline validation: if deadline provided, it must not be in the past
    if (deadline) {
      const selected = new Date(deadline);
      // normalize to local midnight for comparison
      selected.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        toast.error("Deadline cannot be in the past.");
        return;
      }
    }

    const formData = new FormData();
    filePreviews.forEach((file) => {
      formData.append("files", file);
    });
  formData.append("path", currentPath);
  formData.append("user_id", user?.id ?? "user_2pDCpUBoGFPGm0THwYDKwjTvor9");
  formData.append("account_type", user?.unsafeMetadata.accountType as string);
  // Document type(s) for categorization
  formData.append("document_type", getDocumentTypeFormValue());
  // Keep access_to as 'all' for now (departments can be handled separately)
  formData.append("access_to", "all");
  // Optional deadline (ISO date string)
  if (deadline) {
    formData.append("deadline", deadline);
  }
  formData.append("important", important.toString());
    
    console.log("Starting upload process...");
    setUploading(true);
    setShowComplianceProcessing(true);
    setProcessingProgress(15);
    console.log("Set showComplianceProcessing to true");

    // Simulate realistic progress updates
    const progressInterval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev < 50) return prev + Math.random() * 10;
        return prev;
      });
    }, 500);

    try {
      const response = await fetch(API_ENDPOINTS.UPLOAD, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setProcessingProgress(75);

      if (response.ok) {
        const data = await response.json();
        console.log("Upload response data:", data);
        setProcessingProgress(100);
        
        // Check if compliance analysis was included
        if (data.compliance_analysis && data.compliance_analysis.success) {
          // The compliance_analysis object contains the compliance_item directly
          const complianceItem = data.compliance_analysis.compliance_item || data.compliance_analysis;
          console.log("Setting compliance analysis result:", complianceItem);
          setComplianceAnalysisResult(complianceItem);
          toast.success(`File uploaded and analyzed! Added to compliance dashboard.`);
          
          // Show compliance modal after a short delay
          setTimeout(() => {
            setShowComplianceProcessing(false);
            setUploading(false);
            setShowComplianceModal(true);
          }, 1500);
        } else if (data.data && data.success) {
          // Handle direct compliance upload response structure
          setComplianceAnalysisResult(data.data);
          toast.success(`File uploaded and analyzed! Added to compliance dashboard.`);
          
          // Show compliance modal after a short delay
          setTimeout(() => {
            setShowComplianceProcessing(false);
            setUploading(false);
            setShowComplianceModal(true);
          }, 1500);
        } else {
          toast.success(`${data.files?.length || 1} file(s) uploaded and auto-approved.`);
          
          // Keep the processing screen visible for a moment, then close
          setTimeout(() => {
            setShowComplianceProcessing(false);
            setUploading(false);
            onOpenChange();
            // Reset states
            setFilePreviews([]);
            setProcessingProgress(0);
            setComplianceAnalysisResult(null);
          }, 2000);
        }
        
      } else {
        clearInterval(progressInterval);
        const errorData = await response.json();
        setShowComplianceProcessing(false);
        setUploading(false);
        toast.error(errorData.error || "Unknown error occurred.");
      }
    } catch (error) {
      clearInterval(progressInterval);
      setShowComplianceProcessing(false);
      setUploading(false);
      toast.error("An error occurred during the upload.");
    }
  };

  const [checkingCompliance, setCheckingCompliance] = useState<boolean>(false);
  const [complianceText, setComplianceText] = useState("");
  const [isCompliant, setCompliant] = useState(false);
  const [complianceFileId, setComplianceFileId] = useState("");
  const [complianceEntities, setComplianceEntities] = useState([]);
  
  // New state for compliance processing display
  const [showComplianceProcessing, setShowComplianceProcessing] = useState(false);
  const [complianceAnalysisResult, setComplianceAnalysisResult] = useState<any>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [showComplianceModal, setShowComplianceModal] = useState(false);

  // AI document type suggestion states
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [showSuggestionDetails, setShowSuggestionDetails] = useState<boolean>(false);

  const handleCompliance = async (filePreviews: File[]) => {
    if (filePreviews.length === 0) {
      toast.error("Please select a file to check compliance.");
      return;
    }

    setCheckingCompliance(true);

    try {
      const formData = new FormData();
      filePreviews.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(API_ENDPOINTS.IS_COMPLIANT, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Compliance check results:", data);
        setCompliant(data.compliant);
        setComplianceText(data.message);
        if (data.compliant == false) {
          setComplianceFileId(data.fileId);
          setComplianceEntities(data.entities);
        }
        toast.success("Compliance check completed.");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Unknown error occurred.");
      }
    } catch (error) {
      console.error("Error during compliance check:", error);
      toast.error("An error occurred during the compliance check.");
    } finally {
      setCheckingCompliance(false);
    }
  };

  // AI Document Type Suggestion Handler
  const handleGetAISuggestions = async () => {
    if (filePreviews.length === 0) {
      toast.error("Please select files first to get AI suggestions.");
      return;
    }

    setLoadingSuggestions(true);
    try {
      const formData = new FormData();
      filePreviews.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(API_ENDPOINTS.SUGGEST_DOCUMENT_TYPES, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("AI Suggestions response:", data);
        
        if (data.success && data.suggestion) {
          setAiSuggestions(data);
          setShowSuggestionDetails(true);
          
          // Auto-select the AI suggested document type if confidence is high
          const confidence = data.suggestion.confidence;
          const docType = data.suggestion.document_type;
          
          if (confidence >= 7) {
            // Auto-select high confidence suggestions
            setSelectedDocumentTypes([docType]);
            toast.success(`AI identified document as "${docType}" with high confidence (${confidence}/10)! Auto-selected for you.`);
          } else if (confidence >= 5) {
            // For medium confidence, just highlight but don't auto-select
            toast.info(`AI suggests document type "${docType}" with confidence ${confidence}/10. Please review and select.`);
          } else {
            toast.info(`AI suggests document type "${docType}" with low confidence (${confidence}/10). Please verify.`);
          }
        } else {
          toast.error(data.error || "Failed to get AI suggestions");
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to get AI suggestions");
      }
    } catch (error) {
      console.error("Error getting AI suggestions:", error);
      toast.error("An error occurred while getting AI suggestions");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    if (openModal == true) onOpen();
  }, [openModal, onOpen]);

  const handleUploadRedacted = async (file: PreviewFile) => {
    if (filePreviews.length === 0) {
      toast.error("Please select files to upload.");
      return;
    }

    // Validate document type selection for redacted upload as well
    if (selectedDocumentTypes.length === 0) {
      toast.error("Please select at least one document type.");
      return;
    }

    // Client-side deadline validation for redacted upload as well
    if (deadline) {
      const selected = new Date(deadline);
      selected.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        toast.error("Deadline cannot be in the past.");
        return;
      }
    }

    const formData = new FormData();
    formData.append("files", file);
    formData.append("path", currentPath);
    formData.append("user_id", user?.id ?? "user_2pDCpUBoGFPGm0THwYDKwjTvor9");
    formData.append("account_type", user?.unsafeMetadata.accountType as string);
  // Document type for redacted file
  formData.append("document_type", getDocumentTypeFormValue());
  // Keep access_to as 'all' for now
  formData.append("access_to", "all");
    formData.append("deadline", deadline.toString());
    formData.append("important", important.toString());

    toast.promise(
      (async () => {
        const response = await fetch(API_ENDPOINTS.UPLOAD, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          console.log(data)
          return `Redacted file uploaded and auto-approved.`;
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || "Unknown error occurred.");
        }
      })(),
      {
        pending: "Uploading Redacted file...",
        success: {
          render({ data }) {
            return data;
          },
        },
        error: {
          render({ data }: { data: { message?: string } }) {
            return data.message || "An error occurred during the upload.";
          },
        },
      }
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [redactedFile, setRedactedFile] = useState<Blob | null>(null);
  const [redactLoad, setRedactLoad] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  const handleRedact = async (fileId: string) => {
    setRedactLoad(true);
    try {
      const response = await fetch(API_ENDPOINTS.REDACT_TEMP, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ file_id: fileId }),
      });

      if (response.ok) {
        const blob = await response.blob();
        setRedactedFile(blob);
        if (!redactedFile) return;
        const fileName = filePreviews[0].name;
        const fileNameWithoutExt = fileName.split('.').slice(0, -1).join('.');
        const extension = fileName.split('.').pop() || 'pdf';
        const previewFile = new File([redactedFile], `${fileNameWithoutExt}_redacted.${extension}`, { type: 'application/pdf' }) as PreviewFile;
        previewFile.preview = URL.createObjectURL(redactedFile);
        handleUploadRedacted(previewFile);
        toast.success("File redacted successfully.");
        setShowVersions(true);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Unknown error occurred.");
      }
    } catch (error) {
      console.error("Error during file redaction:", error);
      toast.error("An error occurred during the file redaction.");
    } finally {
      setRedactLoad(false);
    }
  };
  const [personalRedact, setPersonalRedact] = useState(false);
  const [redactedImage, setRedactedImage] = useState<string | null>(null);
  const [detectedEntities, setDetectedEntities] = useState<any[]>([]);

  // const handlePersonalUpload = async () => {
  //   setPersonalRedact(true);
  //   const formdata = new FormData();
  //   filePreviews.forEach((file) => {
  //     formdata.append("files", file);
  //   });
  //   try {
  //     const response = await fetch("https://1ca6-2401-4900-1c94-fb1c-3410-8317-8eb2-b61e.ngrok-free.app/redact/temp", {
  //       method: "POST",
  //       body: formdata
  //     });

  //     if (response.ok) {
  //       const data = await response.json();
        
  //       // Decode base64 image
  //       const redactedImageSrc = `data:image/jpeg;base64,${data.redacted_file}`;
        
  //       // Set state or do something with redacted image and entities
  //       setRedactedImage(redactedImageSrc);
  //       setDetectedEntities(data.redacted_entities);

  //       const blob = await fetch(redactedImageSrc).then(res => res.blob());
  //       setRedactedFile(blob);
  //       if (!redactedFile) return;
  //       const fileName = filePreviews[0].name;
  //       const fileNameWithoutExt = fileName.split('.').slice(0, -1).join('.');
  //       const extension = fileName.split('.').pop() || 'pdf';
  //       const previewFile = new File([redactedFile], `${fileNameWithoutExt}_redacted.${extension}`, { type: 'application/pdf' }) as PreviewFile;
  //       previewFile.preview = URL.createObjectURL(redactedFile);
  //       // handleUploadRedacted(previewFile);
  //       toast.success("File redacted successfully.");
  //       setShowVersions(true);
  //     } else {
  //       const errorData = await response.json();
  //       throw new Error(errorData.error || "Unknown error occurred.");
  //     }
  //   } catch (error) {
  //     console.error("Error during file redaction:", error);
  //     toast.error("An error occurred during the file redaction.");
  //   } finally {
  //     setPersonalRedact(false);
  //   }
  // };

  useEffect(() => {
    if (!isOpen) {
      setFilePreviews([]);
      setComplianceText("");
      setCompliant(false);
      setComplianceFileId("");
      setShowVersions(false);
      // Clear AI suggestions and document types when modal closes
      setAiSuggestions(null);
      setShowSuggestionDetails(false);
      setSelectedDocumentTypes([]);
      setDocumentType("");
    }
  }, [isOpen]);

  // Today's date in YYYY-MM-DD format for the date input min attribute
  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <>
      {/* Upload Button */}
      {showButton && (
        <Button
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold h-12 px-8 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105"
          onClick={onOpen}
          title="Upload new File to Directory"
        >
          <div className="flex items-center gap-2">
            <div className="bg-transparent rounded-lg">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            Upload New File
          </div>
        </Button>
      )}

      {/* Modal */}
      <Modal
        closeButton
        backdrop="blur"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        className="max-w-[60vw] max-h-[90vh]"
      >
        {!showVersions ? (
          <ModalContent className="overflow-y-auto max-h-[80vh]">
            {(onClose) => {
              console.log("Modal render - showComplianceProcessing:", showComplianceProcessing);
              return (
              <>
                {showComplianceProcessing ? (
                  // Compliance Processing Screen (like in your image)
                  <>
                    <ModalHeader className="bg-gradient-to-r from-blue-50 to-slate-50 border-b border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-slate-800 bg-clip-text text-transparent">Document Processing</h2>
                      </div>
                    </ModalHeader>
                    <ModalBody className="p-8 bg-slate-50">
                      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-8 mb-8 border-2 border-blue-200 shadow-lg">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="bg-blue-500 rounded-xl p-3 shadow-lg shadow-blue-500/30">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <h3 className="text-xl font-bold text-blue-900">AI-Powered Document Analysis</h3>
                        </div>
                        <ul className="space-y-3 text-blue-800 font-medium">
                          <li className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            Automatic text extraction from PDFs and images (OCR)
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            Intelligent keyword and deadline detection
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            Risk level assessment and compliance categorization
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            Department routing and action item extraction
                          </li>
                        </ul>
                      </div>

                      <div className="bg-white rounded-2xl border-2 border-slate-200 p-8 shadow-lg">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="bg-blue-100 rounded-xl p-3">
                            <svg className="w-6 h-6 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          </div>
                          <h4 className="text-xl font-bold text-slate-800">Processing Status</h4>
                        </div>
                        
                        {/* Overall Progress Bar */}
                        <div className="mb-8">
                          <div className="flex justify-between text-sm text-slate-700 font-semibold mb-3">
                            <span>Upload Progress</span>
                            <span>{processingProgress.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-3 shadow-inner">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 ease-out shadow-md"
                              style={{ width: `${processingProgress.toFixed(2)}%` }}
                            ></div>
                          </div>
                          <div className="text-sm text-slate-600 mt-3 font-medium">
                            {processingProgress < 30 ? "Uploading files..." : 
                             processingProgress < 70 ? "Processing documents..." : 
                             processingProgress < 90 ? "Analyzing compliance..." : 
                             "Finalizing..."}
                          </div>
                        </div>
                        
                        {filePreviews.map((file, index) => (
                          <div key={index} className="mb-6 last:mb-0 bg-slate-50 p-5 rounded-xl border-2 border-slate-200">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-bold text-slate-800">{file.name}</span>
                              <span className="text-sm text-slate-600 font-medium bg-slate-100 px-3 py-1 rounded-lg">{formatFileSize(file.size)}</span>
                            </div>
                            
                            <div className="flex items-center gap-3 mb-3">
                              {processingProgress === 100 ? (
                                <div className="flex items-center text-green-600">
                                  <div className="p-1 bg-green-100 rounded-lg mr-2">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                  <span className="text-sm font-semibold">Analysis completed</span>
                                </div>
                              ) : (
                                <div className="flex items-center text-blue-600">
                                  <Spinner size="sm" color="primary" className="mr-3" />
                                  <span className="text-sm font-semibold">
                                    {processingProgress < 30 ? "Uploading..." : 
                                     processingProgress < 60 ? "Extracting text..." : 
                                     processingProgress < 90 ? "Analyzing compliance..." : 
                                     "Finalizing..."}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="w-full bg-slate-200 rounded-full h-2 shadow-inner">
                              <div 
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out shadow-sm" 
                                style={{ width: `${processingProgress}%` }}
                              ></div>
                            </div>

                            {/* Show compliance results preview when analysis is complete */}
                            {complianceAnalysisResult && processingProgress === 100 && (
                              <div className="mt-4 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-300 shadow-md">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="p-1.5 bg-green-100 rounded-lg">
                                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                  <h5 className="font-bold text-green-900 text-sm">Compliance Analysis Complete</h5>
                                </div>
                                <p className="text-green-800 text-sm font-medium mb-3">{complianceAnalysisResult.title}</p>
                                <div className="flex flex-wrap gap-2">
                                  {complianceAnalysisResult.keywords?.slice(0, 3).map((keyword: string, idx: number) => (
                                    <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-xs font-semibold border border-green-200">
                                      {keyword}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ModalBody>
                  </>
                ) : (
                  // Regular Upload Form
                  <>
                    <ModalHeader className="bg-gradient-to-r from-blue-50 to-slate-50 border-b border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-slate-800 bg-clip-text text-transparent">Upload File</h2>
                      </div>
                    </ModalHeader>
                    <ModalBody className="overflow-y-auto max-h-[80vh] bg-slate-50">
                      <div className="w-full h-full p-6">
                    <div className="mb-6">
                      <label className="block mb-3 font-bold text-xl text-slate-800">
                        Select Files to Upload
                      </label>
                    </div>
                    <div
                      {...getRootProps({
                        className:
                          "border-dashed border-3 border-blue-300 bg-gradient-to-br from-blue-50/50 to-slate-50 p-8 rounded-2xl text-center cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 shadow-md hover:shadow-lg",
                      })}
                    >
                      <input {...getInputProps()} />
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-blue-100 rounded-xl">
                          <svg className="h-10 w-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <p className="text-base text-slate-700 font-semibold">
                          Drag and drop files here, or click to select files
                        </p>
                        <p className="text-sm text-slate-500">
                          Supported: PDF, DOCX, TXT, Images, JSON, Markdown
                        </p>
                      </div>
                    </div>

                    {filePreviews.length > 0 && (
                      <div className="mt-6">
                        <h3 className="font-bold mb-4 text-xl text-slate-800 flex items-center gap-2">
                          <div className="p-1.5 bg-blue-100 rounded-lg">
                            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          File Previews
                        </h3>
                        {/* Scrollable list of file previews */}
                        <ul className="space-y-3 max-h-[15vw] overflow-y-auto pr-2">
                          {filePreviews.map((file, index) => {
                            const notMachineReadable = [
                              "docx", // .docx
                              "pdf", // .pdf
                              "ppt",
                              "pptx", // .ppt, .pptx
                              "png", // .png
                              "jpg",
                              "jpeg", // .jpg, .jpeg
                            ].includes(file.name.split(".").pop() as string);
                            console.log(
                              "File name: ",
                              file.name,
                              "Filetype: ",
                              file.name.split(".").pop() as string
                            );
                            return (
                              <li
                                key={index}
                                className="w-full flex items-center justify-between border-2 border-slate-200 p-4 rounded-xl shadow-md bg-white hover:shadow-lg hover:border-blue-300 transition-all duration-200"
                              >
                                <div className="flex items-center space-x-4 w-full">
                                  {file.type.startsWith("image/") && (
                                    <Image
                                      src={file.preview}
                                      alt={file.name}
                                      width={56}
                                      height={56}
                                      className="rounded-lg object-cover shadow-sm"
                                    />
                                  )}
                                  <div className="w-full flex justify-between items-center gap-2">
                                    <div className="flex-grow">
                                      <p className="text-sm font-semibold text-slate-800 line-clamp-1">
                                        {file.name}{" "}
                                        {notMachineReadable && (
                                          <span className="text-red-500 text-xs font-medium bg-red-50 px-2 py-0.5 rounded-md">
                                            [Not Machine Readable]
                                          </span>
                                        )}
                                      </p>
                                      <p className="text-xs text-slate-500 font-medium mt-1">
                                        {formatFileSize(file.size)}
                                      </p>
                                    </div>

                                    <button
                                      onClick={() => handleRemoveFile(index)}
                                      className="w-8 h-8 grid place-items-center bg-red-50 hover:bg-red-100 cursor-pointer text-red-500 hover:text-red-700 rounded-lg transition-all duration-200 hover:scale-110"
                                      title="Remove file"
                                    >
                                      <AiOutlineClose size={14} />
                                    </button>
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {/* File Visibility removed: use Department Access and deadline instead */}
                    <div className="mt-6 bg-white rounded-xl border-2 border-slate-200 p-5 shadow-md">
                        <label className="flex items-center gap-2 mb-3 font-bold text-lg text-slate-800">
                        <div className="p-1.5 bg-purple-100 rounded-lg">
                          <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        Response Deadline
                      </label>
                      <input
                        type="date"
                        value={deadline}
                        min={todayStr}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) {
                            setDeadline("");
                            return;
                          }
                          const selected = new Date(val);
                          selected.setHours(0, 0, 0, 0);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          if (selected < today) {
                            toast.error("Deadline cannot be in the past.");
                            // don't set a past date
                            setDeadline("");
                            return;
                          }
                          setDeadline(val);
                        }}
                        className="border-2 border-slate-200 rounded-xl p-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all duration-200 bg-slate-50 hover:border-slate-300 font-medium"
                      />
                      <p className="text-sm text-slate-500 mt-2 font-medium">
                        Optional: set a deadline for document review and response.
                      </p>
                    </div>
                    <div className="mt-6 bg-white rounded-xl border-2 border-slate-200 p-5 shadow-md">
                      <div className="flex items-center justify-between mb-4">
                        <label className="flex items-center gap-2 font-bold text-lg text-slate-800">
                          <div className="p-1.5 bg-blue-100 rounded-lg">
                            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          Document Type <span className="text-red-500">*</span>
                        </label>
                        <Button
                          size="sm"
                          variant="solid"
                          color="primary"
                          onClick={handleGetAISuggestions}
                          isLoading={loadingSuggestions}
                          isDisabled={filePreviews.length === 0}
                          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg shadow-blue-500/40 hover:shadow-blue-500/60 transition-all duration-200 hover:scale-105 rounded-lg px-6"
                        >
                          <div className="flex items-center gap-2">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            AI Document Analysis
                          </div>
                        </Button>
                      </div>
                      
                      {aiSuggestions && showSuggestionDetails && (
                        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-300 rounded-2xl p-6 mb-6 shadow-lg">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                              </div>
                              <h4 className="font-bold text-blue-900 text-base">AI Document Type Analysis</h4>
                            </div>
                            <Button
                              size="sm"
                              variant="light"
                              onClick={() => setShowSuggestionDetails(false)}
                              className="text-blue-600 min-w-0 px-3 py-2 hover:bg-blue-100 rounded-lg transition-all duration-200 font-bold"
                            >
                              ✕
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="bg-white rounded-xl p-3 border-2 border-blue-200 shadow-md">
                              <span className="font-semibold text-slate-600 text-sm">Document Type:</span>
                              <p className="text-blue-700 capitalize font-bold text-base">{aiSuggestions.suggestion.document_type}</p>
                            </div>
                            <div className="bg-white rounded-xl p-3 border-2 border-blue-200 shadow-md">
                              <span className="font-semibold text-slate-600 text-sm">Urgency:</span>
                              <p className={`capitalize font-bold text-base ${
                                aiSuggestions.suggestion.urgency_level === 'high' || aiSuggestions.suggestion.urgency_level === 'urgent' 
                                  ? 'text-red-600' 
                                  : aiSuggestions.suggestion.urgency_level === 'medium' 
                                    ? 'text-yellow-600' 
                                    : 'text-green-600'
                              }`}>
                                {aiSuggestions.suggestion.urgency_level}
                              </p>
                            </div>
                            <div className="bg-white rounded-xl p-3 border-2 border-blue-200 shadow-md">
                              <span className="font-semibold text-slate-600 text-sm">Confidence:</span>
                              <p className="text-blue-700 font-bold text-base">{aiSuggestions.suggestion.confidence}/10</p>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="bg-white rounded-xl p-4 border border-blue-100">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold text-blue-800 text-sm">Subject Area:</span>
                                <span className="text-blue-700 text-sm">{aiSuggestions.suggestion.subject_area}</span>
                              </div>
                              <div className="mb-2">
                                <span className="font-semibold text-blue-800 text-sm block mb-1">Reasoning:</span>
                                <p className="text-xs text-blue-600">{aiSuggestions.suggestion.reasoning}</p>
                              </div>
                              {aiSuggestions.suggestion.key_topics && aiSuggestions.suggestion.key_topics.length > 0 && (
                                <div>
                                  <span className="font-semibold text-blue-800 text-sm block mb-1">Key Topics:</span>
                                  <div className="flex flex-wrap gap-2">
                                    {aiSuggestions.suggestion.key_topics.map((topic: string, idx: number) => (
                                      <span key={idx} className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-md">
                                        {topic}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-3">
                        <p className="text-sm text-slate-600 mb-3">
                          Select the document type(s) that best describe this file. AI suggestions will be highlighted.
                        </p>
                        
                        <div className="grid grid-cols-2 gap-3">
                          {availableDocumentTypes.map((docType) => {
                            const isAISuggested = aiSuggestions?.suggestion?.document_type === docType;
                            const confidence = aiSuggestions?.suggestion?.confidence || 0;
                            const isHighConfidence = isAISuggested && confidence >= 7;
                            const isMediumConfidence = isAISuggested && confidence >= 5 && confidence < 7;
                            
                            return (
                              <Checkbox
                                key={docType}
                                size="sm"
                                color="primary"
                                isSelected={selectedDocumentTypes.includes(docType)}
                                onValueChange={(checked) => toggleDocumentType(docType, checked)}
                                className={isHighConfidence ? 'border-blue-300 bg-blue-50 rounded-md p-2' : 
                                          isMediumConfidence ? 'border-yellow-300 bg-yellow-50 rounded-md p-2' : ''}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="capitalize">{docType}</span>
                                  {isHighConfidence && (
                                    <div className="flex items-center gap-1">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full" title={`AI High Confidence (${confidence}/10)`}></div>
                                      <span className="text-xs text-blue-600 font-medium">AI</span>
                                    </div>
                                  )}
                                  {isMediumConfidence && (
                                    <div className="flex items-center gap-1">
                                      <div className="w-2 h-2 bg-yellow-400 rounded-full" title={`AI Medium Confidence (${confidence}/10)`}></div>
                                      <span className="text-xs text-yellow-600 font-medium">AI</span>
                                    </div>
                                  )}
                                </div>
                              </Checkbox>
                            );
                          })}
                        </div>
                        
                        {selectedDocumentTypes.length === 0 && (
                          <p className="text-sm text-red-500 mt-2">
                            Please select at least one document type.
                          </p>
                        )}
                      </div>
                    </div>

                    

                    {/* uploaded_by is derived server-side from the user's department; no frontend selector needed */}

                    

                    
                    {complianceText != "" ? (
                      isCompliant ? (
                        <p className="text-green-500 text-sm mt-3">
                          {complianceText}
                        </p>
                      ) : (
                        <div>
                          <p className="text-red-500 text-sm mt-3">
                            Sensitive data was found in the file(s).{" "}
                            <span className="font-bold">
                              We suggest you to redact this file
                            </span>
                          </p>
                          <p className="text-red-500 text-sm font-semibold mt-2">
                            Sensitive Info:
                          </p>
                          {complianceEntities.map((item: any, index) => {
                            return (
                              <p key={index} className="text-red-500 text-sm">
                                - {item.label}: {item.text}
                              </p>
                            );
                          })}
                        </div>
                      )
                    ) : (
                      <></>
                    )}
                  </div>
                </ModalBody>
                <ModalFooter className="flex justify-end gap-3 bg-gradient-to-r from-slate-50 to-blue-50/30 border-t border-slate-200 p-6">
                {/* {
                  <Button
                    color="warning"
                    onClick={() => {
                      handleCompliance(filePreviews);
                    }}
                    className=""
                  >
                    {checkingCompliance ? (
                      <div className="flex gap-2 justify-center items-center">
                        <Spinner size="sm" color="white" />
                        <p>Checking...</p>
                      </div>
                    ) : (
                      "Detect PII"
                    )}
                  </Button>
                } */}

              

                {/* {
                    <Button
                      disabled={filePreviews.length === 0 || uploading}
                      onClick={() => {
                        handlePersonalUpload();
                      }}
                      color="primary"
                      className="bg-blue-600 text-white hover:bg-blue-700 transition duration-150"
                    >
                      {personalRedact ? "Uploading..." : "Upload Personal Document"}
                    </Button>
                  } */}


                  {/* {isCompliant == true &&  */}
                  {
                    <Button
                      disabled={filePreviews.length === 0 || uploading || selectedDocumentTypes.length === 0}
                      onClick={() => {
                        if (selectedDocumentTypes.length === 0) {
                          toast.error("Please select at least one document type.");
                          return;
                        }
                        handleUpload();
                        // Don't close immediately - let handleUpload manage the modal state
                        setFilePreviews([]);
                        setComplianceText("");
                        setCompliant(false);
                      }}
                      color="primary"
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-3 rounded-xl shadow-lg shadow-blue-500/40 hover:shadow-blue-500/60 transition-all duration-200 hover:scale-105"
                    >
                      {uploading ? (
                        <div className="flex gap-2 items-center">
                          <Spinner size="sm" color="white" />
                          <span>Uploading...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          Upload
                        </div>
                      )}
                    </Button>
                  }

                  <Button
                    color="default"
                    onClick={() => {
                      setFilePreviews([]);
                      setComplianceText("");
                      setCompliant(false);
                      setSelectedDocumentTypes([]);
                      setDocumentType("");
                      setAiSuggestions(null);
                      setShowSuggestionDetails(false);
                      onClose();
                    }}
                    className="bg-slate-200 text-slate-700 hover:bg-slate-300 font-semibold px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105"
                  >
                    Cancel
                  </Button>

                  {!isCompliant && complianceText != "" && (
                    <Button
                      color="secondary"
                      onClick={() => {
                        handleRedact(complianceFileId);
                      }}
                      className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-purple-500/40 hover:shadow-purple-500/60 transition-all duration-200 hover:scale-105"
                    >
                      {redactLoad ? (
                        <div className="flex gap-2 justify-center items-center">
                          <Spinner size="sm" color="white" />
                          <p>Redacting...</p>
                        </div>
                      ) : (
                        "Redact"
                      )}
                    </Button>
                  )}
                </ModalFooter>
                  </>
                )}
              </>
              );
            }}
          </ModalContent>
        ) : (
          <ModalContent className="max-h-[95vh]">
            {(onClose) => (
              <>
                <ModalHeader>
                  <h2 className="text-xl font-bold">View Redacted File</h2>
                </ModalHeader>
                <ModalBody className="max-h-[85vh]">
                  <div className="flex gap-3 justify-center items-center h-[70vh]">
                    <div className="flex-grow h-full flex flex-col -mt-8">
                      <label className="block mb-1 font-semibold text-md text-gray-800">
                        Original File
                      </label>
                      <iframe
                        src={filePreviews.length > 0 ? URL.createObjectURL(filePreviews[0]) : ""}
                        className="border border-gray-300 rounded-md w-full min-h-[70vh]"
                        title="Original File"
                      />
                    </div>
                    <div className="flex-grow h-full flex flex-col -mt-8">
                      <label className="block mb-1 font-semibold text-md text-gray-800">
                        Redacted File
                      </label>
                      <iframe
                        src={
                          redactedFile ? URL.createObjectURL(redactedFile) : ""
                        }
                        className="border border-gray-300 rounded-md w-full min-h-[70vh]"
                        title="Redacted File"
                      />
                    </div>
                  </div>
                </ModalBody>
                <ModalFooter className="flex justify-end gap-2">
                  <Button
                    color="primary"
                    onClick={() => {
                      setShowVersions(false);
                      onClose();
                    }}
                    className="bg-blue-600 text-white hover:bg-blue-700 transition duration-150"
                  >
                    Close
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        )}
      </Modal>

      {/* Compliance Details Modal */}
      <ComplianceModal
        isOpen={showComplianceModal}
        onClose={handleComplianceModalClose}
        complianceData={complianceAnalysisResult}
      />
    </>
  );
}

export default UploadModal;
