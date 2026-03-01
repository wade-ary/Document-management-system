"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import ReactMarkdown from "react-markdown";
import { API_ENDPOINTS } from "../config/api";
import robo from "./Assets/agent.png";
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatUIProps {
  filename: string;
  filepath: string;
  fileId?: string;
  userId?: string;
}

const ChatUI: React.FC<ChatUIProps> = ({ filename, filepath, fileId, userId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { user } = useUser();
  // prefer explicit prop, otherwise use Clerk user id from hook if available
  const effectiveUserId = userId ?? user?.id;
  const autoScroll = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    autoScroll();
  }, [messages, isLoading]);

  const handleSend = async (message: string) => {
    if (!message.trim()) return;

    const hasFileContext = Boolean(fileId) || (filename.trim() && filepath.trim());
    if (!hasFileContext) {
      // In this UI the chat must be file-specific
      setError("Please open a file before chatting with the AI.");
      return;
    }

    setIsLoading(true);
    setError(null);

  setMessages((prev) => [...prev, { role: "user", content: message }]);

    try {
      // use a relative path so it works in proxied setups / same-origin deployments
      const res = await fetch(API_ENDPOINTS.ASK_FILE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: message,
          ...(filename.trim() ? { file_name: filename } : {}),
          ...(filepath.trim() ? { file_path: filepath } : {}),
          ...(fileId ? { file_id: fileId } : {}),
          ...(effectiveUserId ? { user_id: effectiveUserId } : {}),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch data");
      }

      const data = await res.json();
      const assistantContent = typeof data.response === 'string' ? data.response : JSON.stringify(data.response);

      setMessages((prev) => [...prev, { role: "assistant", content: assistantContent }]);
      setCurrentMessage("");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      setError(`Failed to fetch data from the agent. Please try again. `);
    } finally {
      setIsLoading(false);
      setCurrentMessage("");
      // focus input after send
      inputRef.current?.focus();
    }
  };

  const quickInputs = ["Describe file"];

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-gradient-to-r from-slate-50 to-blue-50">
        <Image src={robo} alt="Agent Icon" width={28} height={28} />
        <h2 className="text-base font-semibold text-blue-600">Chat with Agent</h2>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60">
        {messages.length === 0 && !isLoading && (
          <div className="text-center text-gray-400 text-sm mt-10">Ask a question about this document to get started.</div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'} `}>
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-strong:text-gray-800 prose-ul:text-gray-700">
                  <ReactMarkdown
                    components={{
                      h1: ({children}) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                      h2: ({children}) => <h2 className="text-base font-semibold mb-2">{children}</h2>,
                      h3: ({children}) => <h3 className="text-sm font-medium mb-1">{children}</h3>,
                      ul: ({children}) => <ul className="list-disc pl-4 space-y-1">{children}</ul>,
                      li: ({children}) => <li className="text-sm">{children}</li>,
                      p: ({children}) => <p className="text-sm mb-2 last:mb-0">{children}</p>,
                      strong: ({children}) => <strong className="font-semibold">{children}</strong>
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <span>{msg.content}</span>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs animate-pulse">Assistant is typing…</div>
          </div>
        )}
      </div>
      {error && <div className="px-4 py-2 bg-red-50 text-red-600 text-xs border-t border-red-200">{error}</div>}
      <div className="px-4 pt-2 pb-3 border-t bg-white space-y-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {quickInputs.map((input) => (
            <button
              key={input}
              onClick={() => setCurrentMessage(input)}
              className="shrink-0 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-medium px-3 py-1 rounded-full transition-colors"
            >
              {input}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!isLoading) handleSend(currentMessage);
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!isLoading) handleSend(currentMessage);
              }
            }}
            placeholder="Ask about the document..."
            className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !(Boolean(fileId) || (filename.trim() && filepath.trim()))}
            className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatUI;
