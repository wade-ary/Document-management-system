"use client";

import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Button } from "@nextui-org/react";
import { API_ENDPOINTS } from "@/config/api";

// Extend File type to include preview
interface PreviewFile extends File {
  preview?: string;
}

interface FileUploadComponentProps {
  onClose: () => void;
}

const FileUploadComponent: React.FC<FileUploadComponentProps> = ({
  onClose,
}) => {
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
    formData.append("user_id","1234");

    setUploading(true);
    toast.info("Uploading your file. Please wait for the success message.");

    try {
      const response = await fetch(API_ENDPOINTS.UPLOAD, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`${data.files.length} file(s) uploaded successfully.`);
        onClose();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Unknown error occurred.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("An error occurred during the upload.");
    }
    setUploading(false);
  };

  return (
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
        <Button
          disabled={acceptedFiles.length === 0 || uploading}
          onClick={handleUpload}
          color="primary"
        >
          {uploading ? "Uploading..." : "Upload"}
        </Button>
      </div>
    </div>
  );
};

export default FileUploadComponent;
