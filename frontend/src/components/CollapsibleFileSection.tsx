import React, { useState } from 'react';
import FileCard from './FileCard';
import { File } from '../app/types';

interface CollapsibleFileSectionProps {
  title: string;
  files: File[];
  isOpenByDefault?: boolean;
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  onDirectoryClick: (fileName: string) => void;
  onViewFile: (file: File) => void;
  onAnalyze: (file: File) => void;
  onMove: (file: File) => void;
  onTagsChange: (fileId: string, fileName: string, newTags: string[], currentPath: string) => void;
  currentPath: string;
  emptyMessage?: string;
  sectionColor?: 'blue' | 'green' | 'purple' | 'orange';
}

const CollapsibleFileSection: React.FC<CollapsibleFileSectionProps> = ({
  title,
  files,
  isOpenByDefault = false,
  setFiles,
  onDirectoryClick,
  onViewFile,
  onAnalyze,
  onMove,
  onTagsChange,
  currentPath,
  emptyMessage = "No files found in this section",
  sectionColor = 'blue'
}) => {
  const [isOpen, setIsOpen] = useState(isOpenByDefault);

  const colorClasses = {
    blue: {
      header: 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200',
      title: 'text-blue-800',
      count: 'bg-blue-500 text-white',
      icon: 'text-blue-600'
    },
    green: {
      header: 'bg-gradient-to-r from-green-50 to-green-100 border-green-200',
      title: 'text-green-800',
      count: 'bg-green-500 text-white',
      icon: 'text-green-600'
    },
    purple: {
      header: 'bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200',
      title: 'text-purple-800',
      count: 'bg-purple-500 text-white',
      icon: 'text-purple-600'
    },
    orange: {
      header: 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200',
      title: 'text-orange-800',
      count: 'bg-orange-500 text-white',
      icon: 'text-orange-600'
    }
  };

  const colors = colorClasses[sectionColor];

  return (
    <div className="mb-6">
      {/* Section Header */}
      <div
        className={`${colors.header} border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className={`text-lg font-semibold ${colors.title}`}>
              {title}
            </h2>
            <span className={`${colors.count} text-xs px-2 py-1 rounded-full font-medium`}>
              {files.length}
            </span>
          </div>
          <div className={`${colors.icon} transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={isOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Section Content */}
      {isOpen && (
        <div className="mt-4 px-2">
          {files.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {files.map((file, index) => (
                <FileCard
                  key={`${file.fileId}-${index}`}
                  file={file}
                  setFiles={setFiles}
                  onDirectoryClick={onDirectoryClick}
                  onViewFile={onViewFile}
                  onAnalyze={onAnalyze}
                  onMove={onMove}
                  onTagsChange={onTagsChange}
                  currentPath={currentPath}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📂</div>
              <p>{emptyMessage}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CollapsibleFileSection;