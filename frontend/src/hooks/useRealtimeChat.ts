/**
 * Custom hook for real-time chat with streaming responses
 * Integrates with OpenAI GPT-4 real-time model via backend
 */

import { useState, useCallback, useRef } from 'react';
import { API_ENDPOINTS } from '@/config/api';

export interface RealtimeChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface DocumentContext {
  file_id: string;
  file_name: string;
  summary?: string;
  relevance?: number;
}

interface UseRealtimeChatOptions {
  userId?: string;
  sessionId?: string;
  onMessage?: (message: RealtimeChatMessage) => void;
  onError?: (error: Error) => void;
  enableStreaming?: boolean;
}

export const useRealtimeChat = (options: UseRealtimeChatOptions = {}) => {
  const {
    userId = 'anonymous',
    sessionId = 'default',
    onMessage,
    onError,
    enableStreaming = true,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Send a message and get streaming response
   */
  const sendMessageStream = useCallback(
    async (
      message: string,
      documentContext?: DocumentContext[]
    ): Promise<void> => {
      if (!message.trim()) {
        throw new Error('Message cannot be empty');
      }

      setIsLoading(true);
      setIsStreaming(true);

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(API_ENDPOINTS.CHAT.REALTIME_STREAM, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            session_id: sessionId,
            message,
            document_context: documentContext || [],
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('Response body is not readable');
        }

        let fullContent = '';
        const streamingMessageId = `streaming-${Date.now()}`;

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'chunk') {
                fullContent += data.content;

                // Emit streaming message update
                if (onMessage) {
                  onMessage({
                    id: streamingMessageId,
                    role: 'assistant',
                    content: fullContent,
                    timestamp: new Date(),
                    isStreaming: !data.done,
                  });
                }
              } else if (data.type === 'complete') {
                // Final message
                if (onMessage) {
                  onMessage({
                    id: `msg-${Date.now()}`,
                    role: 'assistant',
                    content: data.content,
                    timestamp: new Date(),
                    isStreaming: false,
                  });
                }
              } else if (data.type === 'error') {
                throw new Error(data.content);
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            console.log('Stream aborted');
          } else {
            onError?.(error);
            throw error;
          }
        }
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [userId, sessionId, onMessage, onError]
  );

  /**
   * Send a message and get complete response (non-streaming)
   */
  const sendMessage = useCallback(
    async (
      message: string,
      documentContext?: DocumentContext[]
    ): Promise<string> => {
      if (!message.trim()) {
        throw new Error('Message cannot be empty');
      }

      setIsLoading(true);

      try {
        const response = await fetch(API_ENDPOINTS.CHAT.REALTIME, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            session_id: sessionId,
            message,
            document_context: documentContext || [],
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to get response');
        }

        return result.content;
      } catch (error) {
        if (error instanceof Error) {
          onError?.(error);
        }
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [userId, sessionId, onError]
  );

  /**
   * Analyze message intent
   */
  const analyzeIntent = useCallback(
    async (message: string) => {
      try {
        const response = await fetch(API_ENDPOINTS.CHAT.REALTIME_INTENT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            session_id: sessionId,
            message,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        console.error('Error analyzing intent:', error);
        // Return fallback intent
        return {
          type: 'question',
          confidence: 0.5,
          reasoning: 'Fallback due to API error',
        };
      }
    },
    [userId, sessionId]
  );

  /**
   * Clear the chat session
   */
  const clearSession = useCallback(async () => {
    try {
      const response = await fetch(API_ENDPOINTS.CHAT.REALTIME_SESSION, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error clearing session:', error);
      throw error;
    }
  }, [userId, sessionId]);

  /**
   * Cancel current streaming request
   */
  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setIsLoading(false);
    }
  }, []);

  return {
    sendMessage: enableStreaming ? sendMessageStream : sendMessage,
    sendMessageStream,
    sendMessageSync: sendMessage,
    analyzeIntent,
    clearSession,
    cancelStream,
    isLoading,
    isStreaming,
  };
};
