/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
import { Search, FileText, Calendar, X } from 'lucide-react';
import { API_ENDPOINTS } from '@/config/api';
import { toast } from 'react-toastify';

interface PrecedentResult {
  file_id: string;
  file_name: string;
  path: string;
  relevance_score: number;
  semantic_score: number;
  tags: string[];
  file_type: string;
  upload_date: string;
  key_topics: string[];
  matching_sections: string[];
}

interface PrecedentFinderProps {
  fileId: string;
  onClose: () => void;
  onViewComparison: (currentFileId: string, precedentFileId: string) => void;
  onViewAnalysis: (currentFileId: string, precedentFileId: string) => void;
}

const PrecedentFinder: React.FC<PrecedentFinderProps> = ({
  fileId,
  onClose,
  onViewComparison,
  onViewAnalysis
}) => {
  const [results, setResults] = useState<PrecedentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.3);
  const [fileTypes, setFileTypes] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [totalFound, setTotalFound] = useState(0);

  const fileTypeOptions = ['pdf', 'docx', 'txt', 'pptx'];

  const searchPrecedents = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.PRECEDENTS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_id: fileId,
          similarity_threshold: similarityThreshold,
          file_types: fileTypes.length > 0 ? fileTypes : undefined,
          date_range: dateRange,
          top_k: 50
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to find precedents');
      }

      const data = await response.json();
      
      if (data.error) {
        toast.error(data.error);
        setResults([]);
      } else {
        setResults(data.results || []);
        setTotalFound(data.total_found || 0);
        toast.success(`Found ${data.results?.length || 0} similar documents`);
      }
    } catch (error) {
      console.error('Error finding precedents:', error);
      toast.error('Failed to find precedents');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleFileType = (type: string) => {
    setFileTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.7) return 'text-green-600 bg-green-50';
    if (score >= 0.5) return 'text-yellow-600 bg-yellow-50';
    return 'text-orange-600 bg-orange-50';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Search className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Find Similar Precedents</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="space-y-4">
            {/* Similarity Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Similarity Threshold: {(similarityThreshold * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={similarityThreshold}
                onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10% (Broad)</span>
                <span>100% (Exact)</span>
              </div>
            </div>

            {/* File Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File Types
              </label>
              <div className="flex gap-2 flex-wrap">
                {fileTypeOptions.map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleFileType(type)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      fileTypes.includes(type)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Button */}
            <button
              onClick={searchPrecedents}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Find Precedents
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 380px)' }}>
          {results.length > 0 && (
            <div className="mb-4 text-sm text-gray-600">
              Found <span className="font-semibold">{totalFound}</span> similar document(s)
            </div>
          )}

          {results.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No precedents found</p>
              <p className="text-sm mt-2">Try adjusting the similarity threshold or filters</p>
            </div>
          )}

          <div className="space-y-4">
            {results.map((result, index) => (
              <div
                key={result.file_id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <h3 className="font-semibold text-gray-900 line-clamp-1">
                        {result.file_name}
                      </h3>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2 line-clamp-1">{result.path}</p>
                    
                    {result.key_topics && result.key_topics.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {result.key_topics.slice(0, 3).map((topic, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}

                    {result.upload_date && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                        <Calendar className="w-3 h-3" />
                        {new Date(result.upload_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className={`px-3 py-1.5 rounded-full text-sm font-semibold ${getRelevanceColor(result.relevance_score)}`}>
                      {(result.relevance_score * 100).toFixed(0)}% Match
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => onViewComparison(fileId, result.file_id)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                      >
                        Compare
                      </button>
                      <button
                        onClick={() => onViewAnalysis(fileId, result.file_id)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                      >
                        Analyze
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrecedentFinder;
