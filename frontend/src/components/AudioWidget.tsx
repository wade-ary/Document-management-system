"use client";

import { useState } from "react";

const AudioWidget = () => {
  const [isVisible, setIsVisible] = useState(true);

  const closeWidget = () => {
    setIsVisible(false); 
  };

  return (
    <>
      {isVisible && (
        <div id="iframe-container" className="fixed bottom-0 left-0 z-[999]">
          <iframe
            id="audio_iframe"
            src="https://widget.synthflow.ai/widget/v2/1732374019927x254176968836806750/1732374019835x421958994476111040"
            allow="microphone"
            className="w-[400px] h-[600px] border-none bg-transparent"
          ></iframe>
          <button
            onClick={closeWidget}
            className="fixed bottom-[610px] left-5 px-4 py-2 bg-purple-500 text-white rounded-md shadow-md hover:bg-purple-600 transition"
          >
            Close Widget
          </button>
        </div>
      )}
    </>
  );
};

export default AudioWidget;
