import { NextRequest, NextResponse } from 'next/server';

interface IntentAnalysis {
  type: 'search' | 'question';
  confidence: number;
  reasoning: string;
  extractedTerms?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    const analysis = analyzeIntent(message);
    
    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Intent analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze intent' },
      { status: 500 }
    );
  }
}

function analyzeIntent(message: string): IntentAnalysis {
  const lowerMessage = message.toLowerCase().trim();
  
  // Question indicators
  const questionWords = [
    'what', 'how', 'when', 'where', 'who', 'why', 'which', 'whose', 'whom',
    'tell me', 'explain', 'describe', 'define', 'clarify'
  ];
  
  const questionPatterns = [
    /what\s+(is|was|are|were|will|would|can|could|should|might)/,
    /how\s+(much|many|often|long|far|do|does|did|can|could|should|would)/,
    /when\s+(did|was|will|would|can|could|should|might)/,
    /where\s+(is|was|are|were|will|would|can|could|should|might)/,
    /who\s+(is|was|are|were|will|would|can|could|should|might|bought|signed|approved|created)/,
    /why\s+(did|was|is|are|were|will|would|can|could|should|might)/,
    /which\s+(one|ones|is|was|are|were|will|would|can|could|should|might)/,
    /price|cost|amount|value|budget|expense|fee/,
    /timeline|deadline|schedule|date|time/,
    /responsible|approved|signed|created|bought|purchased/
  ];

  // Search indicators
  const searchWords = [
    'find', 'search', 'show', 'list', 'get', 'fetch', 'retrieve', 'display',
    'documents', 'files', 'reports', 'contracts', 'specifications'
  ];

  const searchPatterns = [
    /find\s+(all|the|some|any)/,
    /show\s+(me|all|the|some|any)/,
    /get\s+(me|all|the|some|any)/,
    /list\s+(all|the|some|any)/,
    /search\s+(for|through)/,
    /documents?\s+(about|regarding|related|containing)/,
    /files?\s+(about|regarding|related|containing)/
  ];

  // Check for question patterns
  const hasQuestionMark = message.includes('?');
  const hasQuestionWords = questionWords.some(word => lowerMessage.includes(word));
  const hasQuestionPatterns = questionPatterns.some(pattern => pattern.test(lowerMessage));
  
  // Check for search patterns
  const hasSearchWords = searchWords.some(word => lowerMessage.includes(word));
  const hasSearchPatterns = searchPatterns.some(pattern => pattern.test(lowerMessage));

  // Specific question indicators that suggest information extraction
  const specificQueryPatterns = [
    /price|cost|amount|value|budget/,
    /when\s+.*(bought|purchased|signed|approved|created|delivered)/,
    /who\s+.*(bought|purchased|signed|approved|created|responsible)/,
    /what\s+.*(price|cost|budget|timeline|deadline|specification)/,
    /how\s+(much|many)\s+.*(cost|price|budget|time|long)/
  ];

  const hasSpecificQuery = specificQueryPatterns.some(pattern => pattern.test(lowerMessage));

  // Calculate scores
  let questionScore = 0;
  let searchScore = 0;

  // Question scoring
  if (hasQuestionMark) questionScore += 0.3;
  if (hasQuestionWords) questionScore += 0.25;
  if (hasQuestionPatterns) questionScore += 0.3;
  if (hasSpecificQuery) questionScore += 0.4;

  // Search scoring
  if (hasSearchWords) searchScore += 0.4;
  if (hasSearchPatterns) searchScore += 0.3;
  if (lowerMessage.includes('documents') || lowerMessage.includes('files')) searchScore += 0.2;

  // If both search and question indicators, prefer question for specific queries
  if (questionScore > 0 && hasSpecificQuery) {
    questionScore += 0.2;
  }

  // Determine intent
  if (questionScore > searchScore && questionScore > 0.5) {
    return {
      type: 'question',
      confidence: Math.min(0.95, questionScore),
      reasoning: 'Message contains question patterns and appears to seek specific information from documents',
      extractedTerms: extractKeyTerms(message)
    };
  } else if (searchScore > 0.3) {
    return {
      type: 'search',
      confidence: Math.min(0.9, searchScore),
      reasoning: 'Message contains search patterns and appears to request document discovery',
      extractedTerms: extractKeyTerms(message)
    };
  } else {
    // Default fallback based on simple heuristics
    const defaultIsQuestion = hasQuestionMark || hasQuestionWords || hasSpecificQuery;
    return {
      type: defaultIsQuestion ? 'question' : 'search',
      confidence: 0.6,
      reasoning: defaultIsQuestion 
        ? 'Default classification as question based on basic indicators'
        : 'Default classification as search request',
      extractedTerms: extractKeyTerms(message)
    };
  }
}

function extractKeyTerms(message: string): string[] {
  // Remove question words and common words
  const stopWords = [
    'what', 'how', 'when', 'where', 'who', 'why', 'which', 'whose', 'whom',
    'tell', 'me', 'explain', 'describe', 'find', 'search', 'show', 'get',
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'is', 'was', 'are', 'were', 'will', 'would', 'can',
    'could', 'should', 'might', 'may', 'do', 'does', 'did', 'have', 'has', 'had'
  ];

  const words = message
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => 
      word.length > 2 && 
      !stopWords.includes(word) &&
      !/^\d+$/.test(word)
    );

  // Remove duplicates and return
  return [...new Set(words)];
}