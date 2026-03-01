"use client";
import React, { useState } from "react";
import { OctopusWorker } from "@picovoice/octopus-web";

const OCTOPUS_PARAMS_PATH = "/octopus_params.pv"; // Relative path to your model
const ACCESS_KEY = "XW8JEeIqM+YFHzpdGJjUYOXUD3XIVpkWUIFciEpt2w7xIzr2tLI1dw=="; // Your access key
const SEARCH_PHRASE = "Sandbox"; // The phrase to search for in the audio

const OctopusComponent: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const getAudioData = async (): Promise<Int16Array> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const mediaStreamSource = audioContext.createMediaStreamSource(stream);

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      mediaStreamSource.connect(analyser);

      const buffer = new Float32Array(analyser.frequencyBinCount);

      // Capture audio for a fixed duration (5 seconds here)
      const duration = 5000; // milliseconds
      const int16Array = [];
      console.log("Recording audio...");
      const startTime = Date.now();

      while (Date.now() - startTime < duration) {
        analyser.getFloatTimeDomainData(buffer);

        // Convert Float32Array to Int16Array
        for (let i = 0; i < buffer.length; i++) {
          int16Array.push(Math.max(-1, Math.min(1, buffer[i])) * 32767);
        }

        await new Promise((resolve) => setTimeout(resolve, 100)); // Wait 100ms
      }

      console.log("Audio captured:", int16Array.length);
      return new Int16Array(int16Array);
    } catch (err) {
      if (err instanceof Error) {
        throw new Error("Failed to capture audio: " + err.message);
      } else {
        throw new Error("Failed to capture audio: " + String(err));
      }
    }
  };

  const handleSearch = async () => {
    setIsLoading(true);
    setError(null);
    setSearchResults([]);

    try {
      // Load the Octopus model
      console.log("Initializing Octopus...");
      const octopus = await OctopusWorker.create(ACCESS_KEY, {
        publicPath: OCTOPUS_PARAMS_PATH,
      });

      // Capture audio data
      const audioData = await getAudioData();
      if (audioData.length === 0) {
        throw new Error("No audio data captured.");
      }

      console.log("Audio data length:", audioData.length);

      // Index the audio data
      console.log("Indexing audio...");
      const octopusMetadata = await octopus.index(audioData);

      // Search for the phrase in the indexed audio
      console.log("Searching for the phrase:", SEARCH_PHRASE);
      const result = await octopus.search(octopusMetadata, SEARCH_PHRASE);

      // Log and display search results
      console.log("Search results:", result);
      const matches = result.map(
        (match) => `Start: ${match.startSec}s, End: ${match.endSec}s`
      );
      setSearchResults(matches);

      // Release the Octopus model
      await octopus.release();
    } catch (err) {
      if (err instanceof Error) {
        setError("An error occurred while processing: " + err.message);
      } else {
        setError("An error occurred while processing.");
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-6 bg-gray-100 rounded-lg shadow-lg max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">Octopus Audio Search</h1>

      {error && (
        <p className="mb-4 text-red-600 bg-red-100 border border-red-400 px-4 py-2 rounded">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="text-blue-600 mb-4">Processing...</p>
      ) : (
        <button
          onClick={handleSearch}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded shadow"
        >
          Start Search
        </button>
      )}

      {searchResults.length > 0 && (
        <div className="mt-6 w-full">
          <h2 className="text-lg font-bold mb-2">Search Results:</h2>
          <ul className="list-disc list-inside bg-white p-4 rounded shadow">
            {searchResults.map((result, index) => (
              <li key={index} className="text-gray-700">
                {result}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default OctopusComponent;
