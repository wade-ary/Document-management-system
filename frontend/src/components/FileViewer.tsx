import Image from 'next/image';
import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'react-toastify';
import { useUser } from '@clerk/nextjs';
import { API_ENDPOINTS } from '@/config/api';

const API_GET_METADATA = API_ENDPOINTS.GET_METADATA;

interface FileViewerProps {
  filePath: string;
  fileName: string;
}

const FileViewer: React.FC<FileViewerProps> = ({ filePath, fileName }) => {
  const { user } = useUser();
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 }); // Default size
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);

  const fetchReadAloudText = async () => {
    try {
      // IMPORTANT: Do not send `path` to the get-metadata endpoint. Use access-aware lookup by providing
      // the file name and the current user's id so the server can resolve access without a raw path.
      const response = await fetch(API_GET_METADATA, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_name: fileName, user_id: user?.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch metadata.");
      }

      const data = await response.json();
      const extractedText = data.extracted_text || "No text available to read aloud.";
      
      if (extractedText === "No text available to read aloud.") {
        toast.error(extractedText);
        return;
      }

      // If already speaking, clicking again will stop it
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setIsPaused(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(extractedText);
      
      // Find a voice with an Indian accent
      const voices = window.speechSynthesis.getVoices();
      const indianVoice = voices.find((voice) => voice.lang === "en-IN");
      
      if (indianVoice) {
        utterance.voice = indianVoice;
      } else {
        console.warn("Indian English voice not found. Defaulting to system voice.");
      }

      // Event listeners to manage speaking state
      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };
      utterance.onerror = () => {
        toast.error("Error occurred while reading aloud.");
        setIsSpeaking(false);
        setIsPaused(false);
      };
      
      // Speak the text
      window.speechSynthesis.speak(utterance);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error fetching text to read aloud:", error);
      toast.error("Failed to fetch text for reading aloud.");
    }
  };

  const handlePause = () => {
    if (!isSpeaking) return;

    if (isPaused) {
      // Resume if currently paused
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      // Pause if currently speaking
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  useEffect(() => {
    console.log('Fetching file:', filePath);
    // If a filePath is provided, keep legacy behavior. Otherwise, request access-aware file by user_id + name
    const bodyPayload = filePath
      ? { file_path: filePath, file_name: fileName }
      : { file_name: fileName, user_id: user?.id };

    if (filePath || user?.id) {
      fetch(API_ENDPOINTS.VIEW_FILE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      })
        .then(async (response) => {
          if (response.ok) {
            const contentType = response.headers.get('Content-Type') || '';
            setFileType(contentType);

            if (contentType.startsWith('text/')) {
              const text = await response.text();
              setFileContent(text);
            } else if (contentType.startsWith('image/')) {
              const blob = await response.blob();
              const imageUrl = URL.createObjectURL(blob);
              setFileContent(imageUrl);
            } else if (contentType === 'application/pdf') {
              const blob = await response.blob();
              const pdfUrl = URL.createObjectURL(blob);
              setFileContent(pdfUrl);
            } else if (contentType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
              // PPTX files - create blob URL for download
              const blob = await response.blob();
              const pptxUrl = URL.createObjectURL(blob);
              setFileContent(pptxUrl);
            } else if (contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
              // DOCX files - create blob URL for download
              const blob = await response.blob();
              const docxUrl = URL.createObjectURL(blob);
              setFileContent(docxUrl);
            } else {
              setError('Unsupported file type.');
            }
          } else {
            const errorData = await response.json();
            setError(errorData.error || 'Failed to load file.');
          }
        })
        .catch((err) => {
          console.error('Error fetching file:', err);
          setError('An error occurred while fetching the file.');
        });
    }
  }, [filePath, fileName, user?.id]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const startWidth = viewerRef.current?.offsetWidth || 0;
    const startHeight = viewerRef.current?.offsetHeight || 0;
    const startX = e.clientX;
    const startY = e.clientY;

    const onMouseMove = (event: MouseEvent) => {
      const newWidth = Math.max(200, startWidth + (event.clientX - startX)); // Min width 200px
      const newHeight = Math.max(150, startHeight + (event.clientY - startY)); // Min height 150px
      setDimensions({ width: newWidth, height: newHeight });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  if (error) {
    return <p>{error}</p>;
  }

  if (!fileContent) {
    return <p>Loading...</p>;
  }

  return (
    <div
      ref={viewerRef}
      className="relative border border-gray-300 bg-white shadow-lg grid place-items-center"
      style={{
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        maxWidth: '100%',
        maxHeight: '100%',
        resize: 'both', // Enables basic resizing in modern browsers
        overflow: 'hidden',
        overflowY: 'auto',
      }}
    >
      {/* Render content based on file type */}
      {fileType.startsWith('text/') && (
        <pre style={{ maxHeight: '100%', overflow: 'auto' }}>{fileContent}</pre>
      )}
      {fileType.startsWith('image/') && (
        <div className="flex justify-center items-center h-full w-full aspect-auto">
          <Image
            src={fileContent}
            alt="Viewing file"
            layout="fill"
            objectFit="contain"
          />
        </div>
      )}
      {fileType === 'application/pdf' && (
        <div className="flex justify-center items-center h-full w-full">
          <iframe
            src={fileContent}
            title="PDF Viewer"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </div>
      )}
      {fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' && (
        <div className="flex flex-col justify-center items-center h-full w-full p-4">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold mb-2">PowerPoint Presentation</h3>
            <p className="text-gray-600 mb-4">PPTX files cannot be directly viewed in browser. Download to view in PowerPoint.</p>
            <a
              href={fileContent}
              download={fileName}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Download {fileName}
            </a>
          </div>
        </div>
      )}
      {fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && (
        <div className="flex flex-col justify-center items-center h-full w-full p-4">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold mb-2">Word Document</h3>
            <p className="text-gray-600 mb-4">Your browser does not support viewing Word documents. Download to view in Word.</p>
            <a
              href={fileContent}
              download={fileName}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Download {fileName}
            </a>
          </div>
        </div>
      )}

      {/* Read Aloud Button */}
      <button
        onClick={fetchReadAloudText}
        className="absolute top-2 right-2 bg-blue-500 text-white py-1 px-3 rounded shadow-md hover:bg-blue-600"
      >
        {isSpeaking ? 'Stop' : 'Read Aloud'}
      </button>

      {/* Pause/Resume Button (visible only when speaking) */}
      {isSpeaking && (
        <button
          onClick={handlePause}
          className="absolute top-2 right-20 bg-yellow-500 text-white py-1 px-3 rounded shadow-md hover:bg-yellow-600"
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
      )}

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 bg-gray-500 cursor-se-resize"
        onMouseDown={handleMouseDown}
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          cursor: 'se-resize',
          background: '#888',
          width: '16px',
          height: '16px',
        }}
      ></div>
    </div>
  );
};

export default FileViewer;
