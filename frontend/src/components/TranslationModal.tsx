/**
 * TranslationModal Component
 * Provides translation functionality for document text between English and Malayalam
 */

"use client";

import React, { useState, useEffect } from "react";
import { Spinner } from "@nextui-org/react";
import { FaLanguage, FaExchangeAlt, FaCopy, FaDownload } from "react-icons/fa";
import { toast } from "react-toastify";
import { API_ENDPOINTS } from "@/config/api";

interface TranslationModalProps {
  extractedText: string | null;
  fileId?: string;
  fileName?: string;
}

interface TranslationResult {
  success: boolean;
  original_text: string;
  translated_text: string;
  detected_language: string;
  translation_direction: string;
  method: string;
  chunks_processed: number;
  supported_languages: Record<string, string>;
}

export default function TranslationModal({ extractedText, fileId, fileName }: TranslationModalProps) {
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [sourceLang, setSourceLang] = useState<string>("");
  const [targetLang, setTargetLang] = useState<string>("");
  const [customText, setCustomText] = useState<string>("");
  const [useCustomText, setUseCustomText] = useState(false);

  // Auto-translate when component mounts if we have extracted text
  useEffect(() => {
    if (extractedText && !useCustomText) {
      handleTranslate();
    }
  }, [extractedText]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTranslate = async () => {
    const textToTranslate = useCustomText ? customText : extractedText;
    
    if (!textToTranslate?.trim()) {
      toast.error("No text available for translation");
      return;
    }

    setIsTranslating(true);
    try {
      const requestBody: {
        text: string;
        source_lang?: string;
        target_lang?: string;
        file_id?: string;
      } = {
        text: textToTranslate,
      };

      if (sourceLang) requestBody.source_lang = sourceLang;
      if (targetLang) requestBody.target_lang = targetLang;
      if (fileId && !useCustomText) requestBody.file_id = fileId;

      const response = await fetch(API_ENDPOINTS.TRANSLATE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Translation failed");
      }

      const result: TranslationResult = await response.json();
      setTranslationResult(result);

      if (result.success) {
        toast.success(`Translated from ${result.detected_language} to ${result.translation_direction.split(" -> ")[1]}`);
      } else {
        toast.warning("Translation completed with some issues");
      }
    } catch (error) {
      console.error("Translation error:", error);
      toast.error(`Translation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopyTranslation = () => {
    if (translationResult?.translated_text) {
      navigator.clipboard.writeText(translationResult.translated_text);
      toast.success("Translation copied to clipboard");
    }
  };

  const handleDownloadTranslation = () => {
    if (translationResult?.translated_text) {
      const blob = new Blob([translationResult.translated_text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName || "document"}_translation.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Translation downloaded");
    }
  };

  const getLanguageDisplayName = (code: string) => {
    const languages = {
      'en': 'English',
      'hi': 'Hindi',
      'bn': 'Bengali',
      'te': 'Telugu',
      'mr': 'Marathi',
      'ta': 'Tamil',
      'ur': 'Urdu',
      'gu': 'Gujarati',
      'kn': 'Kannada',
      'ml': 'Malayalam',
      'or': 'Odia',
      'pa': 'Punjabi',
      'as': 'Assamese',
      'mai': 'Maithili',
      'sa': 'Sanskrit',
      'ne': 'Nepali',
      'sd': 'Sindhi',
      'ks': 'Kashmiri',
      'doi': 'Dogri',
      'mni': 'Manipuri',
      'sat': 'Santali',
      'kok': 'Konkani',
      'bho': 'Bhojpuri',
      'unknown': 'Unknown'
    };
    return languages[code as keyof typeof languages] || code;
  };

  const swapLanguages = () => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <FaLanguage className="text-blue-600" />
          Document Translation
        </h3>
        <div className="text-sm text-gray-500">
          English ↔ Indian Languages
        </div>
      </div>

      {/* Translation Controls */}
      <div className="bg-gray-50 p-4 rounded-lg border">
        <div className="space-y-4">
          {/* Language Selection */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source Language
              </label>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Auto-detect</option>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="bn">Bengali</option>
                <option value="te">Telugu</option>
                <option value="mr">Marathi</option>
                <option value="ta">Tamil</option>
                <option value="ur">Urdu</option>
                <option value="gu">Gujarati</option>
                <option value="kn">Kannada</option>
                <option value="ml">Malayalam</option>
                <option value="or">Odia</option>
                <option value="pa">Punjabi</option>
                <option value="as">Assamese</option>
                <option value="mai">Maithili</option>
                <option value="sa">Sanskrit</option>
                <option value="ne">Nepali</option>
                <option value="sd">Sindhi</option>
                <option value="ks">Kashmiri</option>
                <option value="doi">Dogri</option>
                <option value="mni">Manipuri</option>
                <option value="sat">Santali</option>
                <option value="kok">Konkani</option>
                <option value="bho">Bhojpuri</option>
              </select>
            </div>
            
            <button
              onClick={swapLanguages}
              className="mt-6 p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="Swap languages"
            >
              <FaExchangeAlt />
            </button>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Language
              </label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Auto-determine</option>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="bn">Bengali</option>
                <option value="te">Telugu</option>
                <option value="mr">Marathi</option>
                <option value="ta">Tamil</option>
                <option value="ur">Urdu</option>
                <option value="gu">Gujarati</option>
                <option value="kn">Kannada</option>
                <option value="ml">Malayalam</option>
                <option value="or">Odia</option>
                <option value="pa">Punjabi</option>
                <option value="as">Assamese</option>
                <option value="mai">Maithili</option>
                <option value="sa">Sanskrit</option>
                <option value="ne">Nepali</option>
                <option value="sd">Sindhi</option>
                <option value="ks">Kashmiri</option>
                <option value="doi">Dogri</option>
                <option value="mni">Manipuri</option>
                <option value="sat">Santali</option>
                <option value="kok">Konkani</option>
                <option value="bho">Bhojpuri</option>
              </select>
            </div>
          </div>

          {/* Text Source Selection */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={!useCustomText}
                onChange={() => setUseCustomText(false)}
                className="text-blue-600"
              />
              <span className="text-sm">Use extracted document text</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={useCustomText}
                onChange={() => setUseCustomText(true)}
                className="text-blue-600"
              />
              <span className="text-sm">Use custom text</span>
            </label>
          </div>

          {/* Custom Text Input */}
          {useCustomText && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Text
              </label>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Enter text to translate..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={4}
              />
            </div>
          )}

          {/* Translate Button */}
          <button
            onClick={handleTranslate}
            disabled={isTranslating || (!extractedText && !customText.trim())}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isTranslating ? (
              <>
                <Spinner size="sm" color="white" />
                Translating...
              </>
            ) : (
              <>
                <FaLanguage />
                Translate
              </>
            )}
          </button>
        </div>
      </div>

      {/* Translation Results */}
      {translationResult && (
        <div className="space-y-4">
          {/* Translation Info */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="font-medium">
                  Detected: {getLanguageDisplayName(translationResult.detected_language)}
                </span>
                <span className="text-gray-600">
                  Direction: {translationResult.translation_direction}
                </span>
                {translationResult.chunks_processed > 1 && (
                  <span className="text-gray-600">
                    Chunks: {translationResult.chunks_processed}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyTranslation}
                  className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                  title="Copy translation"
                >
                  <FaCopy />
                </button>
                <button
                  onClick={handleDownloadTranslation}
                  className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                  title="Download translation"
                >
                  <FaDownload />
                </button>
              </div>
            </div>
          </div>

          {/* Original Text */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">Original Text</h4>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-48 overflow-y-auto">
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {translationResult.original_text}
              </p>
            </div>
          </div>

          {/* Translated Text */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">Translated Text</h4>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200 max-h-48 overflow-y-auto">
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {translationResult.translated_text}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No Text Available */}
      {!extractedText && !useCustomText && (
        <div className="text-center text-gray-500 py-8">
          <FaLanguage className="mx-auto text-4xl mb-4 text-gray-300" />
          <p>No extracted text available for translation.</p>
          <p className="text-sm mt-2">Try using custom text instead.</p>
        </div>
      )}
    </div>
  );
}