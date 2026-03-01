import React, { useState } from "react";
import { Card, Button, Input, Tooltip, Spinner } from "@nextui-org/react";
import { File } from "../app/types";
import DeleteModal from "./DeleteModal";
import { MdDriveFileMove } from "react-icons/md";
import { FaRedoAlt } from "react-icons/fa";
import { HiOutlineDocumentSearch } from "react-icons/hi";
import { FaFilePdf, FaImage, FaFileWord, FaFileExcel, FaFilePowerpoint, FaFileArchive, FaFileVideo, FaFileCode } from "react-icons/fa"; // Import file type icons
import { BsFileText, BsFileMusic } from "react-icons/bs"; // Add text or other file types
import { ChevronDown, ChevronUp, X } from "lucide-react";
import useMuteStore from "@/store/muteStore";

interface FileCardProps {
  file: File;
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  onDirectoryClick: (fileName: string) => void;
  onViewFile: (file: File) => void;
  onAnalyze: (file: File) => void;
  onMove: (file: File) => void;
  onTagsChange: (
    fileId: string,
    fileName: string,
    newTags: string[],
    currentPath: string
  ) => void;
  currentPath: string;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const speakText = (text: string) => {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }
};

const FileCard: React.FC<FileCardProps> = ({
  file,
  onDirectoryClick,
  onViewFile,
  onAnalyze,
  onMove,
  onTagsChange,
  currentPath,
}) => {
  const [newTag, setNewTag] = useState("");
  const [showAllTags, setShowAllTags] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { mute } = useMuteStore();

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newTag.trim()) {
      onTagsChange(
        file.fileId,
        file.fileName,
        [...(file.tags || []), newTag.trim()],
        currentPath
      );
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(
      file.fileId,
      file.fileName,
      (file.tags || []).filter((tag) => tag !== tagToRemove),
      currentPath
    );
  };

  const isDirectory = file.fileName.endsWith("/");

  const displayTags = showAllTags ? file.tags : file.tags?.slice(0, 3);

  // Function to render appropriate icons for file types with better coverage
  const renderFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <FaFilePdf color="#FF4444" size={18} title="PDF Document" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'svg':
      case 'webp':
        return <FaImage color="#4A90E2" size={18} title="Image File" />;
      case 'doc':
      case 'docx':
        return <FaFileWord color="#2B579A" size={18} title="Word Document" />;
      case 'xls':
      case 'xlsx':
        return <FaFileExcel color="#217346" size={18} title="Excel Spreadsheet" />;
      case 'ppt':
      case 'pptx':
        return <FaFilePowerpoint color="#D24726" size={18} title="PowerPoint Presentation" />;
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
        return <FaFileArchive color="#8E44AD" size={18} title="Archive File" />;
      case 'mp4':
      case 'avi':
      case 'mkv':
      case 'mov':
      case 'wmv':
        return <FaFileVideo color="#E67E22" size={18} title="Video File" />;
      case 'mp3':
      case 'wav':
      case 'flac':
      case 'aac':
        return <BsFileMusic color="#9B59B6" size={18} title="Audio File" />;
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'py':
      case 'java':
      case 'cpp':
      case 'c':
      case 'html':
      case 'css':
      case 'json':
        return <FaFileCode color="#2ECC71" size={18} title="Code File" />;
      case 'txt':
      case 'md':
      case 'readme':
        return <BsFileText color="#34495E" size={18} title="Text File" />;
      default:
        return <BsFileText color="#95A5A6" size={18} title="Unknown File Type" />;
    }
  };

  // Helper function to determine deadline urgency
  const getDeadlineUrgency = (deadline: string | Date) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffHours = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 0) return 'overdue';
    if (diffHours < 24) return 'urgent';
    if (diffHours < 72) return 'upcoming';
    return 'normal';
  };

  return (
    <Card
      className="max-w-[28vw] p-6 mb-6 rounded-lg bg-gray-100 shadow-lg transform hover:scale-105 transition-all duration-300 ease-in-out"
      isHoverable
    >
      <div className="flex flex-col gap-3">
        {/* Header with file name and actions */}
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <div
              className="cursor-pointer font-semibold flex items-center gap-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (isDirectory) {
                    onDirectoryClick(file.fileName);
                  } else {
                    onViewFile(file);
                  }
                }
              }}
              onClick={() => {
                if (isDirectory) {
                  onDirectoryClick(file.fileName);
                } else {
                  onViewFile(file);
                }
              }}
              tabIndex={0}
              style={{
                fontFamily:
                  "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                fontSize: "16px",
                color: "#007AFF",
              }}
            >
              {isDirectory ? (
                <span className="flex-shrink-0">📁</span>
              ) : (
                <div className="flex-shrink-0">{renderFileIcon(file.fileName)}</div>
              )}
              <p className="truncate flex-1 min-w-0">{file.fileName}</p>
            </div>
          </div>
          
          {/* Action buttons - now properly positioned */}
          <div className="flex-shrink-0 flex gap-1">
            {!isDirectory && (
              <div className="flex gap-1">
                <Tooltip content="Analyze this file">
                  <Button
                    tabIndex={-1}
                    className="min-w-7 h-7 p-1 rounded-lg bg-violet-500"
                    onClick={() => onAnalyze(file)}
                    disabled={
                      file.status === "analyzing" || file.status === "pending"
                    }
                  >
                    {file.status === "analyzed" || file.status === "failed" ? (
                      <FaRedoAlt color="white" size={12} />
                    ) : (
                      <HiOutlineDocumentSearch color="white" size={16} />
                    )}
                  </Button>
                </Tooltip>
                {file.status === "analyzed" && (
                  <Tooltip content="Move this file">
                    <Button
                      className="min-w-7 h-7 p-1 rounded-lg"
                      color="success"
                      tabIndex={-1}
                      onClick={() => {
                        onMove(file);
                      }}
                    >
                      <MdDriveFileMove color="white" size={16} />
                    </Button>
                  </Tooltip>
                )}
              </div>
            )}
            <DeleteModal file={file} />
          </div>
        </div>
        
        {/* Deadline display with urgency indicators */}
        {!isDirectory && file.deadline && (() => {
          const urgency = getDeadlineUrgency(file.deadline);
          const urgencyStyles = {
            overdue: { bg: 'bg-red-50', border: 'border-red-200', icon: '🚨', iconColor: 'text-red-600', textColor: 'text-red-800', label: 'Overdue' },
            urgent: { bg: 'bg-orange-50', border: 'border-orange-200', icon: '⚡', iconColor: 'text-orange-600', textColor: 'text-orange-800', label: 'Urgent' },
            upcoming: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: '⏰', iconColor: 'text-yellow-600', textColor: 'text-yellow-800', label: 'Due Soon' },
            normal: { bg: 'bg-blue-50', border: 'border-blue-200', icon: '📅', iconColor: 'text-blue-600', textColor: 'text-blue-800', label: 'Deadline' }
          };
          const style = urgencyStyles[urgency];
          
          return (
            <div className={`${style.bg} ${style.border} rounded-lg p-2 border`}>
              <div className="flex items-center gap-2 text-sm">
                <span className={style.iconColor}>{style.icon}</span>
                <span className={`${style.textColor} font-medium`}>{style.label}:</span>
                <span className={style.textColor}>
                  {new Date(file.deadline).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                {urgency === 'overdue' && (
                  <span className="text-xs bg-red-600 text-white px-2 py-1 rounded-full ml-auto">
                    OVERDUE
                  </span>
                )}
              </div>
            </div>
          );
        })()}
      </div>
      
      {/* Status display */}
      {!isDirectory && file.status && (
        <div className="flex items-center justify-start gap-2 mt-2">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
            file.status === "analyzed"
              ? "bg-green-100 text-green-700"
              : file.status === "analyzing"
              ? "bg-blue-100 text-blue-700"
              : file.status === "failed"
              ? "bg-red-100 text-red-700"
              : "bg-gray-100 text-gray-700"
          }`}>
            {file.status === "analyzing" && <Spinner size="sm" />}
            <span className="capitalize">{file.status}</span>
          </div>
        </div>
      )}
      
      {/* Tags section */}
      {!isDirectory && (
        <>
          <div className="flex flex-wrap gap-2 mt-4">
            {displayTags &&
              displayTags.map((tag, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-1 text-xs rounded-full px-3 py-1 bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                >
                  <span>{tag}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTag(tag);
                    }}
                    className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    title={`Remove tag: ${tag}`}
                    aria-label={`Remove tag: ${tag}`}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
          </div>
          {(file.tags?.length ?? 0) > 3 && (
            <button
              onClick={() => setShowAllTags(!showAllTags)}
              className="flex items-center gap-1 text-xs mt-2 px-2 py-1 rounded-md text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors self-start"
              aria-label={showAllTags ? 'Show fewer tags' : `Show ${(file.tags?.length ?? 0) - 3} more tags`}
            >
              {!showAllTags ? (
                <>
                  Show {(file.tags?.length ?? 0) - 3} more tags
                  <ChevronDown size={14} />
                </>
              ) : (
                <>
                  Show fewer tags
                  <ChevronUp size={14} />
                </>
              )}
            </button>
          )}
        </>
      )}
      
      {/* Add tag input */}
      {!isDirectory && (
        <Input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={handleAddTag}
          placeholder="Type a tag and press Enter"
          className="mt-4 text-normal h-[36px] rounded-lg"
          size="sm"
          variant="bordered"
          startContent={<span className="text-gray-400 text-xs">#</span>}
          description={newTag.trim() ? "Press Enter to add tag" : ""}
        />
      )}
    </Card>
  );
};

export default FileCard;
