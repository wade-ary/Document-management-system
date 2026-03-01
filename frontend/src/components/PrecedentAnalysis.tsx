/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { X, Brain, FileText, Lightbulb, AlertTriangle, CheckCircle } from 'lucide-react';
import API_BASE_URL from '../config/api';
import { toast } from 'react-hot-toast';

interface DocumentInfo {
  file_id: string;
  file_name: string;
  upload_date?: string;
}

interface AnalysisData {
  current_document: DocumentInfo;
  precedent_document: DocumentInfo;
  analysis: {
    summary: string;
    similarities: string;
    applicability: string;
    differences: string;
  };
}

interface PrecedentAnalysisProps {
  currentFileId: string;
  precedentFileId: string;
  onClose: () => void;
}

const PrecedentAnalysis: React.FC<PrecedentAnalysisProps> = ({
  currentFileId,
  precedentFileId,
  onClose
}) => {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalysis();
  }, [currentFileId, precedentFileId]);

  const loadAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/precedent-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_file_id: currentFileId,
          precedent_file_id: precedentFileId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze precedent relationship');
      }

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        toast.error(data.error);
      } else {
        setAnalysisData(data);
      }
    } catch (error) {
      console.error('Error analyzing precedent:', error);
      setError('Failed to analyze precedent relationship');
      toast.error('Failed to analyze precedent relationship');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6" />
            <h2 className="text-2xl font-bold">AI Precedent Analysis</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-gray-600">Analyzing documents with AI...</p>
          </div>
        )}

        {error && (
          <div className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && analysisData && (
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
            {/* Document Info */}
            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Current Document</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {analysisData.current_document.file_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Precedent Document</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {analysisData.precedent_document.file_name}
                    </p>
                    {analysisData.precedent_document.upload_date && (
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(analysisData.precedent_document.upload_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Analysis Sections */}
            <div className="p-6 space-y-6">
              {/* Summary */}
              {analysisData.analysis.summary && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-5 border border-indigo-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-bold text-gray-900">Summary</h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {analysisData.analysis.summary}
                  </p>
                </div>
              )}

              {/* Similarities */}
              {analysisData.analysis.similarities && (
                <div className="bg-green-50 rounded-lg p-5 border border-green-200">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-bold text-gray-900">Key Similarities</h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {analysisData.analysis.similarities}
                  </p>
                </div>
              )}

              {/* Applicability */}
              {analysisData.analysis.applicability && (
                <div className="bg-blue-50 rounded-lg p-5 border border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-gray-900">How This Precedent Applies</h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {analysisData.analysis.applicability}
                  </p>
                </div>
              )}

              {/* Differences */}
              {analysisData.analysis.differences && (
                <div className="bg-orange-50 rounded-lg p-5 border border-orange-200">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <h3 className="text-lg font-bold text-gray-900">Notable Differences</h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {analysisData.analysis.differences}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrecedentAnalysis;
