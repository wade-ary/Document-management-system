"use client";

import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import { API_ENDPOINTS } from "@/config/api";

interface PreviewFile extends File {
  preview?: string;
}

interface UploadFileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UploadFileModal: React.FC<UploadFileModalProps> = ({ isOpen, onClose }) => {
  const [uploading, setUploading] = useState<boolean>(false);
  const [filePreviews, setFilePreviews] = useState<PreviewFile[]>([]);

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
  };

  const { getRootProps, getInputProps, acceptedFiles } = useDropzone({
    accept,
    onDrop: (acceptedFiles: File[]) => {
      // Update previews with the new files
      setFilePreviews(
        acceptedFiles.map((file) =>
          Object.assign(file, {
            preview: URL.createObjectURL(file), // Add preview property
          })
        )
      );
    },
  });

  const handleUpload = async () => {
    if (acceptedFiles.length === 0) {
      toast.error("Please select files to upload.");
      return;
    }
  
    const formData = new FormData();
    acceptedFiles.forEach((file) => {
      formData.append("files", file);
    });
    formData.append("path", "~/Sandbox");
    formData.append("user_id", "1234");
  
    setUploading(true);
    toast("Uploading your file. Please wait for the success message.");
  
    try {
      const response = await fetch(API_ENDPOINTS.UPLOAD, {
        method: "POST",
        body: formData,
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Server error response:", errorData);
        toast.error(errorData.error || "An error occurred during the upload.");
        return;
      }
  
      const data = await response.json();
      console.log("Upload response data:", data);
  
      
      if (Array.isArray(data.files)) {
        toast.success(`${data.files.length} file(s) uploaded successfully.`);
        onClose();
      } else {
        console.error("Unexpected response format:", data);
        toast.error("Upload failed: Unexpected server response.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("An error occurred during the upload.");
    } finally {
      setUploading(false);
    }
  };
  

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close Modal"
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 focus:outline-none"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

       
        <div className="w-full h-full p-4">
          <div className="mb-4">
            <label className="block mb-2 font-semibold">
              Select Files to Upload
            </label>
          </div>
          <div
            {...getRootProps({
              className:
                "border-dashed border-2 border-gray-400 p-4 rounded-md text-center cursor-pointer",
            })}
          >
            <input {...getInputProps()} />
            <p>Drag and drop files here, or click to select files</p>
          </div>

          {filePreviews.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">File Previews:</h3>
              <ul className="space-y-2">
                {filePreviews.map((file, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between border p-2 rounded-md shadow-sm bg-gray-50"
                  >
                    <div className="flex items-center space-x-4">
                      {file.type.startsWith("image/") && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={file.preview}
                          alt={file.name}
                          className="w-12 h-12 rounded-md object-cover"
                        />
                      )}
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {Math.round(file.size / 1024)} KB
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4">
            <button
              disabled={acceptedFiles.length === 0 || uploading}
              onClick={handleUpload}
              className={`px-4 py-2 rounded-md text-white ${
                acceptedFiles.length === 0 || uploading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadFileModal;
