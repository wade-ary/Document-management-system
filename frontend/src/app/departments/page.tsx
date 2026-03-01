"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useUser } from "@clerk/nextjs";
import { Department, departments, getBackendDepartmentSlug } from "./departmentConfig";
import { useDepartmentRouting } from "./useDepartmentRouting";
import DepartmentSidebar from "./components/DepartmentSidebar";
import DocumentList, { DocInfo } from "./components/DocumentList";
import DocumentModal, { ExtractionResults, TableFull } from "./components/DocumentModal";
import { parseCSV, buildUnifiedTable } from "./utils/tableUtils";
import DocumentUploadModal from "./components/DocumentUploadModal";
import { API_ENDPOINTS } from "@/config/api";
import API_BASE_URL from "@/config/api";

// Shape returned by /listdir API
interface ListDirFile {
  name: string;
  type: "file" | "directory";
  tags?: string[];
  path?: string;
  file_id?: string;
  user_id?: string;
  department?: string;
  access_to?: string;
  deadline?: string;
  uploaded_by?: string;
  upload_date?: string;
}

// Extend ListDirFile to include source and email_info fields as optional
interface EmailInfo { from?: string; to?: string; subject?: string; messageId?: string }
interface ListDirFileWithSource extends ListDirFile { source?: string; email_info?: EmailInfo }

// Shape returned by GET /api/documents (legacy - keeping for modal functionality)
// interface BackendDoc {
//   _id?: string;
//   file_id?: string;
//   filename?: string;
//   upload_date?: string | number | Date;
//   language?: string;
//   status?: DocInfo["status"] | string;
//   summary?: string;
//   doc_type?: string;
//   is_regulatory?: boolean;
//   actionable_items?: string[];
//   department?: string;
// }

export default function DepartmentsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-lg">Loading departments...</div></div>}>
      <DepartmentsContent />
    </Suspense>
  );
}

function DepartmentsContent() {
  // Use URL-based department routing
  const { selectedDept, selectDepartment } = useDepartmentRouting();
  const { user } = useUser(); // Get current user from Clerk
  const [selectedDoc, setSelectedDoc] = useState<DocInfo | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [documents, setDocuments] = useState<Record<Department, DocInfo[]>>({
    "Ministry of Education": [],
    "Ministry of Finance": [],
    "Ministry of Health & Family Welfare": [],
    "Ministry of Agriculture & Farmers Welfare": [],
    "Ministry of Defence": [],
    "Ministry of Home Affairs": [],
    "Ministry of External Affairs": [],
    "Ministry of Commerce & Industry": [],
    "Ministry of Rural Development": [],
    "Ministry of Environment, Forest & Climate Change": [],
    "Ministry of Road Transport & Highways": [],
    "Ministry of Railways": [],
    "Ministry of Labour & Employment": [],
    "Ministry of Women & Child Development": [],
    "Ministry of Science & Technology": [],
    "Ministry of Information & Broadcasting": [],
    "Email Inbox": [],
  });
  const [extractionResults, setExtractionResults] = useState<ExtractionResults | null>(null);
  const [isLoadingExtraction, setIsLoadingExtraction] = useState(false);
  const [enrichedTables, setEnrichedTables] = useState<TableFull[] | null>(null);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  // No checkbox; we use a dedicated Email Inbox tab

  // Event handlers
  const handleDeptClick = (dept: Department) => {
    selectDepartment(dept); // This will update both state and URL
    setIsModalOpen(false);
  };

  const handleDocClick = (doc: DocInfo) => {
    setSelectedDoc(doc);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedDoc(null);
    setExtractionResults(null);
  };

  const handleForwardDocument = (toDepartment: Department) => {
    alert(`Document "${selectedDoc?.name}" forwarded to ${toDepartment}`);
  };

  const handleReplyToAdmin = () => {
    alert(`Opening reply interface for document "${selectedDoc?.name}"`);
  };

  // Legacy per-document optimistic insert removed; we'll simply refetch after upload
  const handleAfterUpload = () => {
    // Trigger refetch by calling fetchDocuments logic inline
    // (Duplicated minimal logic to avoid restructuring existing effect)
    (async () => {
      try {
        const response = await fetch(API_ENDPOINTS.LIST_DIR_DEPARTMENT_FILES, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ department: getBackendDepartmentSlug(selectedDept), ...(selectedDept === 'Email Inbox' ? { source: 'email' } : {}) }),
        });
        if (!response.ok) return;
        const files: ListDirFile[] = await response.json();
        const filesWithSource = files as ListDirFileWithSource[];
        const organizedDocs: Record<Department, DocInfo[]> = {
          "Ministry of Education": [],
          "Ministry of Finance": [],
          "Ministry of Health & Family Welfare": [],
          "Ministry of Agriculture & Farmers Welfare": [],
          "Ministry of Defence": [],
          "Ministry of Home Affairs": [],
          "Ministry of External Affairs": [],
          "Ministry of Commerce & Industry": [],
          "Ministry of Rural Development": [],
          "Ministry of Environment, Forest & Climate Change": [],
          "Ministry of Road Transport & Highways": [],
          "Ministry of Railways": [],
          "Ministry of Labour & Employment": [],
          "Ministry of Women & Child Development": [],
          "Ministry of Science & Technology": [],
          "Ministry of Information & Broadcasting": [],
          "Email Inbox": [],
        };
        const possibleSources = [
          'Admin Office','Internal Audit','Public Portal','Vendor Upload','Gov eOffice','HR Intake Desk','Legal Inbox','Finance Desk'
        ];
        filesWithSource.forEach((file) => {
          if (file.type !== 'file') return;
          const targetDept = selectedDept;
          const docInfo: DocInfo = {
            name: file.name || "Unknown Document",
            deadline: file.deadline || new Date(file.upload_date || new Date()).toLocaleDateString(),
            language: 'Unknown',
            source: file.source || possibleSources[Math.floor(Math.random() * possibleSources.length)],
            email_info: {
              from: file?.email_info?.from || "Unknown Sender",
              to: file?.email_info?.to || "Unknown Recipient",
              subject: file?.email_info?.subject || "No Subject",
              messageId: file?.email_info?.messageId || "No Message ID",
            },
            status: 'Uploaded',
            summary: '',
            docType: 'Document',
            relatedDepts: [targetDept],
            isRegulatory: false,
            actionableItems: [],
            _id: file.file_id,
            file_id: file.file_id,
          };
          (organizedDocs[targetDept] as DocInfo[]).push(docInfo);
        });
        setDocuments(organizedDocs);
      } catch (e) {
        console.error('Refetch after upload failed', e);
      }
    })();
  };

  const startExtraction = async (docName: string) => {
    const doc = documents[selectedDept].find(d => d.name === docName);
    if (!doc || !doc._id || !doc.file_id) return;

    setDocuments(prevDocs => {
      const newDocs = { ...prevDocs };
      const foundDoc = newDocs[selectedDept].find(d => d.name === docName);
      if (foundDoc) foundDoc.status = "Processing";
      return newDocs;
    });

    try {
      // Start backend extraction job (non-blocking)
      const startRes = await fetch(`${API_BASE_URL}/api/documents/${doc._id}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: doc.file_id }),
      });
      if (!startRes.ok) throw new Error(`Failed to start extraction: ${startRes.status}`);
      const { job_id } = await startRes.json();

      // Light polling for a short time to give quick feedback without blocking UI
      const maxAttempts = 6; // ~12s
      let attempt = 0;
      const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
      while (attempt < maxAttempts) {
        attempt += 1;
        await delay(2000);
        try {
          const js = await fetch(`${API_BASE_URL}/api/jobs/${job_id}`);
          const j = await js.json();
          if (j.status === 'SUCCEEDED') break;
          if (j.status === 'FAILED') throw new Error(j.error || 'Extraction failed');
        } catch {
          // ignore transient errors
        }
      }

      // Mark as processed (actual table view will be fetched when opening the modal)
      setDocuments(prevDocs => {
        const newDocs = { ...prevDocs };
        const foundDoc = newDocs[selectedDept].find(d => d.name === docName);
        if (foundDoc) foundDoc.status = "Processed";
        return newDocs;
      });
    } catch (error) {
      console.error("Extraction failed:", error);
      setDocuments(prevDocs => {
        const newDocs = { ...prevDocs };
        const foundDoc = newDocs[selectedDept].find(d => d.name === docName);
        if (foundDoc) foundDoc.status = "Action Required";
        return newDocs;
      });
    }
  };

  // Fetch documents when user is available or department changes
  useEffect(() => {
    const fetchDocuments = async () => {
      // department-files endpoint is allowed without a user_id; fetch whenever the
      // selected department changes so public/all-access files show up for that dept.
      setIsLoadingDocs(true);
      try {
        const organizedDocs: Record<Department, DocInfo[]> = {
          "Ministry of Education": [],
          "Ministry of Finance": [],
          "Ministry of Health & Family Welfare": [],
          "Ministry of Agriculture & Farmers Welfare": [],
          "Ministry of Defence": [],
          "Ministry of Home Affairs": [],
          "Ministry of External Affairs": [],
          "Ministry of Commerce & Industry": [],
          "Ministry of Rural Development": [],
          "Ministry of Environment, Forest & Climate Change": [],
          "Ministry of Road Transport & Highways": [],
          "Ministry of Railways": [],
          "Ministry of Labour & Employment": [],
          "Ministry of Women & Child Development": [],
          "Ministry of Science & Technology": [],
          "Ministry of Information & Broadcasting": [],
          "Email Inbox": [],
        };

        const possibleSources = [
          'Admin Office',
          'Internal Audit',
          'Public Portal',
          'Vendor Upload',
          'Gov eOffice',
          'HR Intake Desk',
          'Legal Inbox',
          'Finance Desk',
        ];

        if (selectedDept === 'Email Inbox') {
          // For Email Inbox tab, fetch email-sourced files for each backend department and aggregate
          const results = await Promise.all(
            departments
              .filter((d) => d !== 'Email Inbox')
              .map(async (dept) => {
                const resp = await fetch(API_ENDPOINTS.LIST_DIR_DEPARTMENT_FILES, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ department: getBackendDepartmentSlug(dept), source: 'email' }),
                });
                if (!resp.ok) return [] as ListDirFileWithSource[];
                const files: ListDirFile[] = await resp.json();
                return files as ListDirFileWithSource[];
              })
          );
          const flatFiles = results.flat();
          // Deduplicate by file_id to avoid repeats if a file is visible to multiple depts
          const uniqueMap = new Map<string, ListDirFileWithSource>();
          flatFiles.forEach((file) => {
            if (file.type !== 'file') return;
            if (file.file_id && !uniqueMap.has(file.file_id)) {
              uniqueMap.set(file.file_id, file as ListDirFileWithSource);
            }
          });

          Array.from(uniqueMap.values()).forEach((file) => {
            if (file.type !== 'file') return;
            const docInfo: DocInfo = {
              name: file.name || 'Unknown Document',
              // In Email Inbox, we'll show sender instead of deadline; but keep a fallback value
              deadline: file.deadline || new Date(file.upload_date || new Date()).toLocaleDateString(),
              language: 'Unknown',
              source: 'Email',
              email_info: {
                from: file?.email_info?.from || 'Unknown Sender',
                to: file?.email_info?.to || '',
                subject: file?.email_info?.subject || '',
                messageId: file?.email_info?.messageId || '',
              },
              status: 'Uploaded',
              summary: '',
              docType: 'Document',
              relatedDepts: ["Email Inbox"],
              isRegulatory: false,
              actionableItems: [],
              _id: file.file_id,
              file_id: file.file_id,
            };
            organizedDocs['Email Inbox'].push(docInfo);
          });
        } else {
          // Regular department view; fetch only that department (no email source filter)
          const resp = await fetch(API_ENDPOINTS.LIST_DIR_DEPARTMENT_FILES, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ department: getBackendDepartmentSlug(selectedDept) }),
          });
          if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
          const files: ListDirFile[] = await resp.json();
          const filesWithSource = files as ListDirFileWithSource[];
          filesWithSource.forEach((file) => {
            if (file.type !== 'file') return;
            const docInfo: DocInfo = {
              name: file.name || 'Unknown Document',
              deadline: file.deadline || new Date(file.upload_date || new Date()).toLocaleDateString(),
              language: 'Unknown',
              source: file.source || possibleSources[Math.floor(Math.random() * possibleSources.length)],  
              status: 'Uploaded',
              summary: '',
              docType: 'Document',
              relatedDepts: [selectedDept],
              isRegulatory: false,
              actionableItems: [],
              _id: file.file_id,
              file_id: file.file_id,
            };
            (organizedDocs[selectedDept] as DocInfo[]).push(docInfo);
          });
        }

        setDocuments(organizedDocs);
      } catch (error) {
        console.error('Failed to fetch documents:', error);
      } finally {
        setIsLoadingDocs(false);
      }
    };
    
    fetchDocuments();
  }, [user?.id, selectedDept]); // Re-fetch when user or selected department changes

  // Fetch extraction results when modal opens (read-only; do not auto-run jobs)
  useEffect(() => {
    if (isModalOpen && selectedDoc && selectedDoc._id) {
      setIsLoadingExtraction(true);
      (async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/documents/${selectedDoc._id}/extractions`);
          const data = await res.json();
          setExtractionResults({
            summary: data.summary || "No summary available.",
            actionableItems: data.actionable_items || data.actionableItems || [],
            tables: data.tables || [],
            signatures: data.signatures || [],
            tables_full: data.tables_full || data.individual_tables || [],
            whole_document_table: data.whole_document_table,
          });
          const tf: TableFull[] = (data.tables_full || data.individual_tables || []) as TableFull[];
          if (tf.length > 0) {
            try {
              const enriched = await Promise.all(
                tf.map(async (t: TableFull) => {
                  if (!t.csv_uri) return t;
                  try {
                    const r = await fetch(`${API_BASE_URL}${t.csv_uri}`);
                    const txt = await r.text();
                    return { ...t, csv_rows: parseCSV(txt) } as TableFull;
                  } catch { return t; }
                })
              );
              setEnrichedTables(enriched);
            } catch { setEnrichedTables(tf); }
          } else {
            setEnrichedTables(null);
          }
        } catch {
          setExtractionResults({ summary: "Failed to load extraction results.", actionableItems: [], tables: [], signatures: [], tables_full: [] });
        } finally {
          setIsLoadingExtraction(false);
        }
      })();
    } else {
      setExtractionResults(null);
      setEnrichedTables(null);
    }
  }, [isModalOpen, selectedDoc]);

  return (
    <div className="flex min-h-screen pt-4 bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Department Sidebar */}
      <DepartmentSidebar 
        selectedDept={selectedDept}
        onDepartmentSelect={handleDeptClick}
      />

      {/* Document List */}
      <DocumentList
        selectedDept={selectedDept}
        documents={documents}
        onDocumentClick={handleDocClick}
        onStartExtraction={startExtraction}
        onUploadClick={() => setIsUploadModalOpen(true)}
        isLoading={isLoadingDocs}
        isAuthenticated={true}
      />

      {/* Upload Modal */}
  <DocumentUploadModal currentPath="/" selectedDepartment={selectedDept} openModal={isUploadModalOpen} showButton={false} onAfterUpload={() => { handleAfterUpload(); setIsUploadModalOpen(false); }} onClose={() => setIsUploadModalOpen(false)} />

      {/* Document Detail Modal */}
      <DocumentModal
        isOpen={isModalOpen}
        selectedDoc={selectedDoc}
        extractionResults={extractionResults}
        isLoadingExtraction={isLoadingExtraction}
        enrichedTables={enrichedTables}
        onClose={closeModal}
        onForwardDocument={handleForwardDocument}
        onReplyToAdmin={handleReplyToAdmin}
        buildUnifiedTable={buildUnifiedTable}
      />
    </div>
  );
}