import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE_URL = process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_API_BASE_URL 
    : 'http://localhost:5000';

export async function POST(request: NextRequest) {
  try {
    const { file_id, question, context } = await request.json();

    if (!file_id || !question) {
      return NextResponse.json(
        { error: 'file_id and question are required' },
        { status: 400 }
      );
    }

    // Call the backend ask-file API
    const response = await fetch(`${BACKEND_BASE_URL}/ask-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_id: file_id,
        query: question,
        user_id: 'document_chat_agent' // Default user ID for agent requests
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Backend request failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Format the response for the frontend
    const answer = formatAnswer(result, question, context);
    
    return NextResponse.json({
      success: true,
      answer: answer,
      source_file_id: file_id,
      context: context
    });

  } catch (error) {
    console.error('Document Q&A error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process document question',
        answer: null
      },
      { status: 500 }
    );
  }
}

interface BackendResult {
  response?: string;
  answer?: string;
  result?: string;
  [key: string]: unknown;
}

interface ContextItem {
  file_name?: string;
  relevance?: number;
}

function formatAnswer(backendResult: BackendResult, question: string, context: ContextItem[]): string {
  // Check if the backend returned a valid response
  if (!backendResult) {
    throw new Error('No response from document analysis');
  }

  // Handle different response formats from the backend
  let answerText = '';
  
  if (typeof backendResult === 'string') {
    answerText = backendResult;
  } else if (backendResult.response) {
    answerText = backendResult.response;
  } else if (backendResult.answer) {
    answerText = backendResult.answer;
  } else if (backendResult.result) {
    answerText = backendResult.result;
  } else {
    // Try to extract any text-like content
    const possibleAnswers = Object.values(backendResult).filter(
      (value): value is string => typeof value === 'string' && value.length > 10
    );
    
    if (possibleAnswers.length > 0) {
      answerText = possibleAnswers[0];
    } else {
      throw new Error('Could not extract answer from document');
    }
  }

  // Clean and validate the answer
  if (!answerText || answerText.trim().length === 0) {
    throw new Error('Document analysis returned empty response');
  }

  // Format the answer nicely
  const formattedAnswer = answerText.trim();
  
  // Add context if the answer is very short (likely needs more explanation)
  if (formattedAnswer.length < 50 && context && context.length > 0) {
    return `${formattedAnswer}

*This information was extracted from ${context[0]?.file_name || 'the document'} based on your question: "${question}"*`;
  }

  return formattedAnswer;
}