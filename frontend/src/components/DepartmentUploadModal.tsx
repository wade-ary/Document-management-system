"use client";

import React, { useState, useCallback } from 'react';
import { Department } from '@/app/departments/departmentConfig';
import { useDropzone } from 'react-dropzone';
import { FaUpload, FaFilePdf, FaTimes, FaSpinner } from 'react-icons/fa';
import { API_ENDPOINTS } from '@/config/api';

// use shared Department type from departmentConfig
interface DocInfo {
  name: string;
  deadline: string;
  language: string;
  source: string;
  status: "Processed" | "Pending" | "Action Required" | "Uploaded" | "Processing";
  summary: string;
  docType: string;
  relatedDepts: Department[];
  isRegulatory: boolean;
  actionableItems: string[];
  _id?: string;
  file_id?: string;
}

interface DepartmentUploadModalProps {
  department: Department;
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newDocument: DocInfo) => void;
}

export default function DepartmentUploadModal({ department, isOpen, onClose, onUploadSuccess }: DepartmentUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('department', department.toLowerCase().replace(' department', ''));
    formData.append('user_id', 'anonymous');
    formData.append('path', '/');
    formData.append('account_type', 'default');
    formData.append('access_to', '');
    formData.append('important', 'false');

    try {
      // Replace with your actual backend endpoint
      const response = await fetch(API_ENDPOINTS.API_DOCUMENTS, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Upload failed. Please try again.');
      }

  const newDocument = await response.json();
      
      // Create document info from backend response
      const newDocInfo: DocInfo = {
        name: file.name,
        deadline: "N/A",
        language: "N/A",
        source: "Admin Office", // static source label
        status: "Processing" as const, // show processing immediately after upload
        summary: newDocument.metadata?.summary || "",
        docType: "N/A",
        relatedDepts: [department],
        isRegulatory: false,
        actionableItems: newDocument.metadata?.actionableItems || [],
        _id: newDocument.metadata?._id, // Include the MongoDB ID
        file_id: newDocument.file_id || newDocument.metadata?.file_id // Include file_id for preview
      };

      onUploadSuccess(newDocInfo);
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError(null);
    setIsUploading(false);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Upload Document to {department}</h2>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-gray-200">
            <FaTimes className="text-gray-600"/>
          </button>
        </div>
        <div className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
            }`}
          >
            <input {...getInputProps()} />
            <FaUpload className="text-4xl text-gray-400 mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-blue-600 font-semibold">Drop the file here ...</p>
            ) : (
              <p className="text-gray-500">Drag & drop a PDF file here, or click to select a file</p>
            )}
          </div>

          {file && (
            <div className="mt-6 bg-gray-100 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaFilePdf className="text-red-500 text-2xl" />
                <div>
                  <p className="font-semibold text-gray-800">{file.name}</p>
                  <p className="text-sm text-gray-600">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button onClick={() => setFile(null)} className="p-2 rounded-full hover:bg-gray-200">
                <FaTimes className="text-gray-500"/>
              </button>
            </div>
          )}

          {error && <p className="mt-4 text-red-600 text-center">{error}</p>}

          <div className="mt-8 flex justify-end gap-4">
            <button onClick={handleClose} className="px-6 py-2 rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 font-semibold">
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUploading && <FaSpinner className="animate-spin" />}
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
