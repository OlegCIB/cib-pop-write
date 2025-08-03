/**
 * CIB Pop Write - Cloudflare Worker for ChatGPT Text Improvement
 * Provides secure text improvement functionality using OpenAI GPT API
 */

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return handleCORSPreflight();
    }

    // Only allow POST requests to /improve endpoint
    if (request.method !== 'POST') {
      return createErrorResponse('Method not allowed', 405);
    }

    const url = new URL(request.url);
    if (url.pathname !== '/improve') {
      return createErrorResponse('Endpoint not found', 404);
    }

    try {
      // Parse and validate request body
      const requestData = await request.json();
      const { text, prompt } = requestData;
      
      if (!text || typeof text !== 'string') {
        return createErrorResponse('Text is required and must be a string', 400);
      }

      // Validate text length to prevent abuse
      if (text.length > 10000) {
        return createErrorResponse('Text too long. Maximum 10,000 characters allowed.', 400);
      }

      // Check for OpenAI API key configuration
      if (!env.OPENAI_API_KEY) {
        return createErrorResponse('OpenAI API key not configured', 500);
      }

      // Use provided prompt or default German prompt
      const improvementPrompt = prompt || 'Verbessere den folgenden Text in Bezug auf Grammatik, Stil und Lesbarkeit, behalte aber den ursprünglichen Sinn und Ton bei:';

      // Call OpenAI API for text improvement
      const improvedText = await improveTextWithChatGPT(text, improvementPrompt, env.OPENAI_API_KEY);

      // Return successful response
      return createSuccessResponse({
        success: true,
        originalText: text,
        improvedText: improvedText,
        prompt: improvementPrompt,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error processing request:', error);
      
      return createErrorResponse(
        'Internal server error',
        500,
        { message: error.message }
      );
    }
  }
};

/**
 * Improve text using OpenAI GPT API
 */
async function improveTextWithChatGPT(text, prompt, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: prompt
        },
        {
          role: 'user',
          content: text
        }
      ],
      max_tokens: 2000,
      temperature: 0.7,
      frequency_penalty: 0.0,
      presence_penalty: 0.0
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Invalid response format from OpenAI API');
  }

  return data.choices[0].message.content.trim();
}

/**
 * Handle CORS preflight requests
 */
function handleCORSPreflight() {
  return new Response(null, {
    status: 204,
    headers: getCORSHeaders()
  });
}

/**
 * Create error response with CORS headers
 */
function createErrorResponse(message, status, additionalData = {}) {
  return new Response(
    JSON.stringify({ 
      error: message,
      ...additionalData
    }), 
    { 
      status, 
      headers: {
        'Content-Type': 'application/json',
        ...getCORSHeaders()
      }
    }
  );
}

/**
 * Create success response with CORS headers
 */
function createSuccessResponse(data) {
  return new Response(
    JSON.stringify(data), 
    { 
      status: 200, 
      headers: {
        'Content-Type': 'application/json',
        ...getCORSHeaders()
      }
    }
  );
}

/**
 * Get CORS headers for cross-origin requests
 */
function getCORSHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}