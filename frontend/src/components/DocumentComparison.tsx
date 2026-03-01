/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { X, FileText, CheckCircle } from 'lucide-react';
import API_BASE_URL from '../config/api';
import { toast } from 'react-hot-toast';

interface DocumentInfo {
  file_id: string;
  file_name: string;
  path: string;
  tags: string[];
  key_topics: string[];
  upload_date: string;
}

interface MatchingSection {
  section_1: string;
  section_2: string;
  similarity: number;
  position_1: number;
  position_2: number;
}

interface ComparisonData {
  document_1: DocumentInfo;
  document_2: DocumentInfo;
  matching_sections: MatchingSection[];
  total_matches: number;
}

interface DocumentComparisonProps {
  fileId1: string;
  fileId2: string;
  onClose: () => void;
}

const DocumentComparison: React.FC<DocumentComparisonProps> = ({
  fileId1,
  fileId2,
  onClose
}) => {
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadComparison();
  }, [fileId1, fileId2]);

  const loadComparison = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/compare-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_id_1: fileId1,
          file_id_2: fileId2
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to compare documents');
      }

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        toast.error(data.error);
      } else {
        setComparisonData(data);
      }
    } catch (error) {
      console.error('Error comparing documents:', error);
      setError('Failed to compare documents');
      toast.error('Failed to compare documents');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Document Comparison</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        )}

        {error && (
          <div className="p-6 text-center">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && comparisonData && (
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
            {/* Document Headers */}
            <div className="grid grid-cols-2 gap-4 p-6 border-b border-gray-200 bg-gray-50">
              <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-gray-900">Current Document</h3>
                </div>
                <p className="text-sm text-gray-700 font-medium mb-2">
                  {comparisonData.document_1.file_name}
                </p>
                <p className="text-xs text-gray-500 mb-2">{comparisonData.document_1.path}</p>
                {comparisonData.document_1.key_topics && comparisonData.document_1.key_topics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {comparisonData.document_1.key_topics.slice(0, 4).map((topic, i) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg p-4 border-2 border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  <h3 className="font-bold text-gray-900">Precedent Document</h3>
                </div>
                <p className="text-sm text-gray-700 font-medium mb-2">
                  {comparisonData.document_2.file_name}
                </p>
                <p className="text-xs text-gray-500 mb-2">{comparisonData.document_2.path}</p>
                {comparisonData.document_2.upload_date && (
                  <p className="text-xs text-gray-600 mb-2">
                    Date: {new Date(comparisonData.document_2.upload_date).toLocaleDateString()}
                  </p>
                )}
                {comparisonData.document_2.key_topics && comparisonData.document_2.key_topics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {comparisonData.document_2.key_topics.slice(0, 4).map((topic, i) => (
                      <span key={i} className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Matching Sections */}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  Matching Sections ({comparisonData.total_matches} found)
                </h3>
              </div>

              {comparisonData.matching_sections.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p>No significant matching sections found</p>
                </div>
              )}

              <div className="space-y-4">
                {comparisonData.matching_sections.map((match, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm"
                  >
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          Match #{index + 1}
                        </span>
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                          {(match.similarity * 100).toFixed(0)}% Similar
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 p-4">
                      <div className="border-l-4 border-blue-400 pl-3">
                        <p className="text-xs font-semibold text-gray-500 mb-1">Current Document</p>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {match.section_1}
                          {match.section_1.length >= 200 && '...'}
                        </p>
                      </div>
                      
                      <div className="border-l-4 border-green-400 pl-3">
                        <p className="text-xs font-semibold text-gray-500 mb-1">Precedent Document</p>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {match.section_2}
                          {match.section_2.length >= 200 && '...'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentComparison;
