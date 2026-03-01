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
import { Department, getBackendDepartmentSlug } from "../departmentConfig";

interface PreviewFile extends File {
  preview: string;
}

type UploadModalProps = {
  currentPath: string;
  selectedDepartment?: Department; // current department context for uploads
  openModal?: boolean; // when true, open the modal (one-shot)
  showButton?: boolean; // whether to render the built-in trigger button
  onAfterUpload?: () => void; // callback after a successful upload
  onClose?: () => void; // callback when modal fully closes
};

function DocumentUploadModal({
  currentPath,
  selectedDepartment,
  openModal,
  showButton = true,
  onAfterUpload,
  onClose: externalOnClose,
}: UploadModalProps) {
  // File visibility removed — per latest spec we only collect department access and deadline
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [wasOpen, setWasOpen] = useState(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [filePreviews, setFilePreviews] = useState<PreviewFile[]>([]);
  // Deadline for departments to respond (ISO date string)
  const [deadline, setDeadline] = useState<string>("");
  const [important, setImportant] = useState<boolean>(false);
  // Departments that will have access to the uploaded file. "all" means every department.
  const [departmentAccess, setDepartmentAccess] = useState<string[]>(["all"]);
  const { user } = useUser();

  // Helper to convert departmentAccess to a form-friendly string
  const getDepartmentFormValue = () => {
    if (!departmentAccess || departmentAccess.length === 0) return "all";
    if (departmentAccess.includes("all")) return "all";
    return departmentAccess.join(",");
  };

  // Helper to toggle the 'All Departments' option
  const toggleAllDepartments = (checked: boolean) => {
    if (checked) setDepartmentAccess(["all"]);
    else setDepartmentAccess([]);
  };

  // Helper to toggle an individual department checkbox
  const toggleDepartment = (dept: string, checked: boolean) => {
    if (checked) {
      setDepartmentAccess((prev) => prev.filter((d) => d !== "all").concat(dept));
    } else {
      setDepartmentAccess((prev) => prev.filter((d) => d !== dept));
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
  // Set department to the current selected department (backend slug)
  if (selectedDepartment && selectedDepartment !== "Email Inbox") {
    formData.append("department", getBackendDepartmentSlug(selectedDepartment));
  } else {
    formData.append("department", "admin"); // fallback for Email Inbox or no selection
  }
  // Access recipients: selected departments or 'all'
  formData.append("access_to", getDepartmentFormValue());
  // Optional deadline (ISO date string)
  if (deadline) {
    formData.append("deadline", deadline);
  }
  formData.append("important", important.toString());
    setUploading(true);

    let success = false;
    await toast.promise(
      (async () => {
        const response = await fetch(API_ENDPOINTS.UPLOAD, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          // Response shape can vary (MR vs bulk). Just mark success.
          success = true;
          return "Upload completed.";
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || "Unknown error occurred.");
        }
      })(),
      {
        pending: "Processing your file...",
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
    setUploading(false);
    if (success) {
      if (onAfterUpload) {
        onAfterUpload();
      }
    }
  };

  // (Deprecated) compliance & redaction flow removed for simplification
  const [checkingCompliance, setCheckingCompliance] = useState<boolean>(false); // retained only for potential future reinstatement
  const [complianceText, setComplianceText] = useState("");
  const [isCompliant, setCompliant] = useState(false);
  const [complianceFileId, setComplianceFileId] = useState("");
  const [complianceEntities, setComplianceEntities] = useState([]);

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

  useEffect(() => {
    if (openModal) onOpen();
  }, [openModal, onOpen]);

  // Track open state transitions to call external onClose
  useEffect(() => {
    if (isOpen && !wasOpen) setWasOpen(true);
    if (!isOpen && wasOpen) {
      setWasOpen(false);
      if (externalOnClose) {
        externalOnClose();
      }
    }
  }, [isOpen, wasOpen, externalOnClose]);

  // Redaction / version comparison feature (restored)
  const [redactedFile, setRedactedFile] = useState<Blob | null>(null);
  const [redactLoad, setRedactLoad] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [personalRedact, setPersonalRedact] = useState(false); // reserved for potential personal redaction flow
  const [redactedImage, setRedactedImage] = useState<string | null>(null);
  const [detectedEntities, setDetectedEntities] = useState<any[]>([]);

  const handleUploadRedacted = async (file: PreviewFile) => {
    if (filePreviews.length === 0) {
      toast.error("Please select files to upload.");
      return;
    }

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
    formData.append("access_to", getDepartmentFormValue());
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
          console.log(data);
          return `Redacted file uploaded and auto-approved.`;
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || "Unknown error occurred.");
        }
      })(),
      {
        pending: "Uploading Redacted file...",
        success: { render({ data }) { return data; } },
        error: { render({ data }: { data: { message?: string } }) { return data.message || "An error occurred during the upload."; } },
      }
    );
  };

  const handleRedact = async (fileId: string) => {
    if (!fileId) {
      toast.error('Missing file identifier for redaction.');
      return;
    }
    setRedactLoad(true);
    try {
      const response = await fetch(API_ENDPOINTS.REDACT_TEMP, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: fileId }),
      });

      if (response.ok) {
        const blob = await response.blob();
        setRedactedFile(blob);
        if (!blob) return;
        // create a pseudo file for comparison (not auto-uploading yet)
        const fileName = filePreviews[0]?.name || 'document.pdf';
        const base = fileName.split('.').slice(0, -1).join('.') || 'document';
        const ext = fileName.split('.').pop() || 'pdf';
        const previewFile = new File([blob], `${base}_redacted.${ext}`, { type: 'application/pdf' }) as PreviewFile;
        previewFile.preview = URL.createObjectURL(blob);
        // We only show comparison; actual upload of redacted file is separate button inside comparison view
        setShowVersions(true);
        toast.success("Generated redacted preview.");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Unknown error occurred.");
      }
    } catch (e) {
      console.error(e);
      toast.error('Redaction failed.');
    } finally {
      setRedactLoad(false);
    }
  };

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
      setRedactedFile(null);
      setRedactedImage(null);
      setDetectedEntities([]);
    }
  }, [isOpen]);

  // Today's date in YYYY-MM-DD format for the date input min attribute
  const todayStr = new Date().toISOString().split("T")[0];

  // Inline body now rendered directly in ModalBody (removed helper function)

  return (
    <>
      {/* Upload Button */}
      {showButton && (
        <Button
          className="mr-4 bg-blue-600 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 text-white shadow-md font-medium tracking-wide"
          onClick={onOpen}
          title="Upload new File to Directory"
          style={{ borderRadius: "12px", padding: "12px 16px" }}
        >
          Upload New File
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
            {(onClose) => (
              <>
                <ModalHeader className="pb-0">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-semibold tracking-wide text-gray-800">Upload Files</h2>
                    <p className="text-xs text-gray-500">Select one or more files and assign department access and optional deadline.</p>
                  </div>
                </ModalHeader>
                <ModalBody className="overflow-y-auto max-h-[80vh]">
                  <div className="w-full h-full p-4 space-y-6">
                    <div className="mb-4">
                      <label className="block mb-2 font-semibold text-lg text-gray-800">Select Files to Upload</label>
                    </div>
                    <div
                      {...getRootProps({
                        className: 'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors bg-white hover:bg-gray-50 border-gray-300',
                      })}
                    >
                      <input {...getInputProps()} />
                      <p className="text-sm text-gray-700">Drag and drop files here, or click to select files</p>
                    </div>
                    {filePreviews.length > 0 && (
                      <div className="mt-6">
                        <h3 className="font-semibold mb-3 text-lg text-gray-800">File Previews</h3>
                        <ul className={'space-y-3 max-h-[30vh] overflow-y-auto pr-1'}>
                          {filePreviews.map((file, index) => {
                            const notMachineReadable = ['docx','pdf','ppt','pptx','png','jpg','jpeg'].includes(file.name.split('.').pop() as string);
                            return (
                              <li key={index} className={'w-full flex items-center justify-between border p-3 rounded-lg shadow-sm transition bg-gray-50 hover:bg-white border-gray-300'}>
                                <div className="flex items-center space-x-4 w-full">
                                  {file.type.startsWith('image/') && (
                                    <Image src={file.preview} alt={file.name} width={48} height={48} className="rounded-md object-cover" />
                                  )}
                                  <div className="w-full flex justify-between items-center gap-2">
                                    <div className="flex-grow">
                                      <p className="text-sm font-medium text-gray-800 line-clamp-1">
                                        {file.name}{' '}
                                        {notMachineReadable && (<span className="text-red-500 text-xs ml-1">[Not Machine Readable]</span>)}
                                      </p>
                                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                    </div>
                                    <button onClick={() => handleRemoveFile(index)} className="w-6 h-6 grid place-items-center bg-transparent cursor-pointer text-red-500 hover:text-red-700 rounded-full" title="Remove file">
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
                    <div className="mt-6">
                      <label className="block mb-2 font-semibold text-lg text-gray-800">Response Deadline for Departments</label>
                      <input type="date" value={deadline} min={todayStr} onChange={(e) => { const val = e.target.value; if (!val) { setDeadline(''); return; } const selected = new Date(val); selected.setHours(0,0,0,0); const today = new Date(); today.setHours(0,0,0,0); if (selected < today) { toast.error('Deadline cannot be in the past.'); setDeadline(''); return; } setDeadline(val); }} className="border rounded-md p-2 w-full" />
                      <p className="text-sm text-gray-500 mt-1">Optional: departments will be asked to respond by this date.</p>
                    </div>
                    <div className="mt-6">
                      <label className="block mb-2 font-semibold text-lg text-gray-800">Department Access <span className="text-red-500">*</span></label>
                      <div className="space-y-3">
                        <Checkbox size="sm" color="primary" isSelected={departmentAccess.includes('all')} onValueChange={(checked) => toggleAllDepartments(checked)}>All Departments</Checkbox>
                        <div className="grid grid-cols-2 gap-3">
                          {['safety','hr','finance','engineering','procurement','legal'].map((dept) => (
                            <Checkbox key={dept} size="sm" color="primary" isSelected={departmentAccess.includes(dept)} isDisabled={departmentAccess.includes('all')} onValueChange={(checked) => toggleDepartment(dept, checked)}>
                              {dept.charAt(0).toUpperCase() + dept.slice(1)}
                            </Checkbox>
                          ))}
                        </div>
                      </div>
                    </div>
                    {complianceText !== '' && (isCompliant ? (<p className="text-green-500 text-sm mt-4">{complianceText}</p>) : (
                      <div className="mt-4 space-y-3">
                        <div>
                          <p className="text-red-500 text-sm">Sensitive data was found in the file(s). <span className="font-bold">Consider redacting.</span></p>
                          <p className="text-red-500 text-sm font-semibold mt-2">Sensitive Info:</p>
                          {complianceEntities.map((item: any, index) => (<p key={index} className="text-red-500 text-xs">- {item.label}: {item.text}</p>))}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" color="warning" className="bg-amber-500 hover:bg-amber-600 text-white" disabled={!complianceFileId || redactLoad || filePreviews.length === 0} onClick={() => handleRedact(complianceFileId)}>
                            {redactLoad ? 'Redacting...' : 'Generate Redacted Preview'}
                          </Button>
                          {showVersions && redactedFile && (
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { const fileName = filePreviews[0]?.name || 'document.pdf'; const base = fileName.split('.').slice(0, -1).join('.') || 'document'; const ext = fileName.split('.').pop() || 'pdf'; const previewFile = new File([redactedFile], `${base}_redacted.${ext}`, { type: 'application/pdf' }) as PreviewFile; previewFile.preview = URL.createObjectURL(redactedFile); handleUploadRedacted(previewFile); }}>
                              Upload Redacted
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ModalBody>
                <ModalFooter className="flex justify-end gap-3 bg-gray-50 border-t border-gray-200">
                  <Button disabled={filePreviews.length === 0 || uploading} onClick={() => { handleUpload(); setFilePreviews([]); setComplianceText(''); setCompliant(false); onClose(); }} className={'bg-blue-600 hover:bg-blue-700 text-white transition duration-150 shadow'}>
                    {uploading ? 'Uploading...' : 'Upload'}
                  </Button>
                  <Button onClick={() => { setFilePreviews([]); setComplianceText(''); setCompliant(false); onClose(); }} className={'bg-gray-200 text-gray-700 hover:bg-gray-300 transition'}>
                    Cancel
                  </Button>
                </ModalFooter>
              </>
            )}
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
                      <label className="block mb-1 font-semibold text-md text-gray-800">Original File</label>
                      {filePreviews[0] && (
                        <iframe
                          src={URL.createObjectURL(filePreviews[0])}
                          className="border border-gray-300 rounded-md w-full min-h-[70vh]"
                          title="Original File"
                        />
                      )}
                    </div>
                    <div className="flex-grow h-full flex flex-col -mt-8">
                      <label className="block mb-1 font-semibold text-md text-gray-800">Redacted File</label>
                      {redactedFile && (
                        <iframe
                          src={URL.createObjectURL(redactedFile)}
                          className="border border-gray-300 rounded-md w-full min-h-[70vh]"
                          title="Redacted File"
                        />
                      )}
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
    </>
  );
}

export default DocumentUploadModal;