"use client";
import { useState } from "react";
import Image from "next/image";
import robo from "./Assets/agent.png";


interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const AssUI = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false); // State to toggle popup

  const handleSend = async (message: string) => {
    if (!message.trim()) return;

    setIsLoading(true);
    setError(null);

    setMessages((prev) => [...prev, { role: "user", content: message }]);

    try {
        setCurrentMessage("");
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: message + "For context, the base directory is " + process.env.NEXT_PUBLIC_BASE_DIR,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch data");
      }

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.output },
      ]);
      setCurrentMessage("");
    } catch (err) {
      setError(
        `Failed to fetch data from the agent. Please try again. ${
          (err as Error).message || err
        }`
      );
    } finally {
      setIsLoading(false);
      setCurrentMessage("");
    }
  };

  const quickInputs = ["Describe file"];

  return (
    <div className="max-h-[60vh]">
      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 left-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white p-3 rounded-full shadow-lg hover:opacity-90 transition-opacity duration-200 z-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {/* Chat Icon */}
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.1 9.1 0 01-4-.8L3 20l1.3-4.3a8.962 8.962 0 01-.7-4c0-4.97 3.582-9 8-9s9 4.03 9 9z"
            />
          </svg>
        </button>
      )}

      {/* Chat Popup */}
      {isOpen && (
        <div className="fixed max-h-60vh bottom-4 left-4 z-50">
          <div
            className="w-[560px] bg-gradient-to-br  overflow-hidden from-blue-50 to-purple-100 rounded-lg shadow-lg flex flex-col"
            style={{ minHeight: "400px" }}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Image
                  src={robo}
                  alt="Agent Icon"
                  width={28}
                  height={28}
                />
                <h2 className="text-lg font-semibold text-blue-600">
                  Chat with Agent
                </h2>
              </div>
              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs p-3 rounded-lg ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-blue-400 to-purple-400 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-xs p-3 rounded-lg bg-gray-200 text-gray-800">
                    Typing...
                  </div>
                </div>
              )}
            </div>
            {error && (
              <p className="text-red-500 text-center px-4">{error}</p>
            )}

            {/* Quick Input Buttons */}
            <div className="flex space-x-2 m-2">
              {quickInputs.map((input) => (
                <button
                  key={input}
                  onClick={() => setCurrentMessage(input)}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 text-white py-1 px-3 rounded-full hover:opacity-90 transition duration-200"
                >
                  {input}
                </button>
              ))}
            </div>

            {/* Input and Send Button */}
            <div className="flex items-center space-x-2 p-2 border-t border-gray-200">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-200"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSend(currentMessage);
                  }
                }}
              />
              <button
                onClick={() => handleSend(currentMessage)}
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white py-2 px-4 rounded hover:opacity-90 transition duration-200 disabled:bg-gray-300"
                disabled={isLoading}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssUI;
