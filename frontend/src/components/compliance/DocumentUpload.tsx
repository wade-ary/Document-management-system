"use client";

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardBody, CardHeader } from '@nextui-org/react';
import { Button } from '@nextui-org/react';
import { Progress } from '@nextui-org/react';
import { Chip } from '@nextui-org/react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  X,
  Brain,
  Search,
  Clock,
  Mail
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_ENDPOINTS } from '@/config/api';
import { useUser } from '@clerk/nextjs';

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  status: 'uploading' | 'processing' | 'analyzing' | 'completed' | 'error';
  progress: number;
  extractedData?: {
    title: string;
    deadline?: string;
    riskLevel: 'high' | 'medium' | 'low';
    keywords: string[];
    summary: string;
    department: string;
  };
  error?: string;
}

interface DocumentUploadProps {
  onUploadComplete: () => void;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ onUploadComplete }) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const { user } = useUser();

  const updateFileStatus = (fileId: string, status: UploadedFile['status'], progress: number) => {
    setUploadedFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, status, progress } : file
    ));
  };

  const processFile = useCallback(async (uploadedFile: UploadedFile) => {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', uploadedFile.file);

      // Update status to uploading
      updateFileStatus(uploadedFile.id, 'uploading', 0);
      
      // Get user ID from Clerk
      const userId = user?.id;
      
      // Make actual API call to backend
      const response = await fetch(API_ENDPOINTS.COMPLIANCE_UPLOAD, {
        method: 'POST',
        headers: {
          ...(userId && { 'X-User-ID': userId }),
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      // Update status to processing
      updateFileStatus(uploadedFile.id, 'processing', 50);
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to process document');
      }

      // Update status to analyzing
      updateFileStatus(uploadedFile.id, 'analyzing', 80);

      // Extract compliance data from API response
      const extractedData = {
        title: result.data.title,
        deadline: result.data.deadline,
        riskLevel: result.data.riskLevel as 'high' | 'medium' | 'low',
        keywords: result.data.keywords,
        summary: result.data.description,
        department: result.data.department
      };
      
      // Complete the process
      setUploadedFiles(prev => prev.map(file => 
        file.id === uploadedFile.id 
          ? { ...file, status: 'completed', progress: 100, extractedData }
          : file
      ));

      toast.success(`Successfully processed ${uploadedFile.file.name}. Email notification sent!`);
      
    } catch (error) {
      console.error('File processing error:', error);
      setUploadedFiles(prev => prev.map(file => 
        file.id === uploadedFile.id 
          ? { 
              ...file, 
              status: 'error', 
              progress: 0, 
              error: error instanceof Error ? error.message : 'Processing failed'
            }
          : file
      ));
      toast.error(`Failed to process ${uploadedFile.file.name}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      status: 'uploading',
      progress: 0,
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    
    // Start processing each file
    newFiles.forEach(uploadedFile => {
      processFile(uploadedFile);
    });
  }, [processFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp'],
      'text/plain': ['.txt'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading': return <Upload className="text-blue-500" size={16} />;
      case 'processing': return <Search className="text-orange-500" size={16} />;
      case 'analyzing': return <Brain className="text-purple-500" size={16} />;
      case 'completed': return <CheckCircle className="text-green-500" size={16} />;
      case 'error': return <AlertCircle className="text-red-500" size={16} />;
    }
  };

  const getStatusText = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading': return 'Uploading...';
      case 'processing': return 'Processing document...';
      case 'analyzing': return 'AI Analysis in progress...';
      case 'completed': return 'Analysis completed';
      case 'error': return 'Processing failed';
    }
  };

  const getProgressColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading': return 'primary';
      case 'processing': return 'warning';
      case 'analyzing': return 'secondary';
      case 'completed': return 'success';
      case 'error': return 'danger';
      default: return 'default';
    }
  };

  const completedFiles = uploadedFiles.filter(f => f.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Upload size={24} />
            Upload Compliance Documents
          </h2>
        </CardHeader>
        <CardBody>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <Upload className="text-gray-500" size={24} />
              </div>
              {isDragActive ? (
                <p className="text-blue-600 font-medium">Drop the files here...</p>
              ) : (
                <div>
                  <p className="text-gray-600 mb-2">
                    Drag & drop documents here, or <span className="text-blue-600 font-medium">click to browse</span>
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports PDF, DOC, DOCX, images, and text files (max 10MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* AI Processing Info */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <Brain size={18} />
              AI-Powered Document Analysis
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Automatic text extraction from PDFs and images (OCR)</li>
              <li>• Intelligent keyword and deadline detection</li>
              <li>• Risk level assessment and compliance categorization</li>
              <li>• Department routing and action item extraction</li>
            </ul>
          </div>
        </CardBody>
      </Card>

      {/* Processing Files */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Clock size={24} />
              Processing Status
            </h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {uploadedFiles.map((uploadedFile) => (
                <div key={uploadedFile.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex-shrink-0">
                        {uploadedFile.preview ? (
                          <Image 
                            src={uploadedFile.preview} 
                            alt="Preview" 
                            width={40}
                            height={40}
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <FileText className="text-gray-500" size={24} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {uploadedFile.file.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      isIconOnly
                      variant="light"
                      color="danger"
                      size="sm"
                      onPress={() => removeFile(uploadedFile.id)}
                    >
                      <X size={16} />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(uploadedFile.status)}
                        <span className="text-sm text-gray-600">
                          {getStatusText(uploadedFile.status)}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {Math.round(uploadedFile.progress)}%
                      </span>
                    </div>
                    
                    <Progress 
                      value={uploadedFile.progress} 
                      color={getProgressColor(uploadedFile.status)}
                      size="sm"
                    />

                    {uploadedFile.error && (
                      <p className="text-red-600 text-sm mt-2">
                        Error: {uploadedFile.error}
                      </p>
                    )}

                    {uploadedFile.extractedData && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">
                            {uploadedFile.extractedData.title}
                          </h4>
                          <div className="flex items-center gap-1 text-green-600 text-xs">
                            <Mail size={12} />
                            <span>Email sent</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Chip size="sm" color="primary">
                            {uploadedFile.extractedData.department}
                          </Chip>
                          <Chip 
                            size="sm" 
                            color={uploadedFile.extractedData.riskLevel === 'high' ? 'danger' : 
                                  uploadedFile.extractedData.riskLevel === 'medium' ? 'warning' : 'success'}
                          >
                            {uploadedFile.extractedData.riskLevel.toUpperCase()} RISK
                          </Chip>
                          {uploadedFile.extractedData.deadline && (
                            <Chip size="sm" variant="flat">
                              Due: {new Date(uploadedFile.extractedData.deadline).toLocaleDateString()}
                            </Chip>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {uploadedFile.extractedData.summary}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {uploadedFile.extractedData.keywords.map((keyword, idx) => (
                            <span key={idx} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Action Buttons */}
      {completedFiles.length > 0 && (
        <div className="flex justify-end gap-4">
          <Button
            variant="flat"
            onPress={() => setUploadedFiles([])}
          >
            Clear All
          </Button>
          <Button
            color="primary"
            onPress={() => {
              toast.success(`${completedFiles.length} compliance items added to dashboard`);
              onUploadComplete();
            }}
          >
            Add to Compliance Dashboard ({completedFiles.length})
          </Button>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;