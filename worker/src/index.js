/**
 * CIB Pop Write - Cloudflare Worker for ChatGPT Text Improvement
 * Handles secure text improvement requests using OpenAI GPT API
 */

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }

    // Only allow POST requests to /improve endpoint
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: getCORSHeaders()
      });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/improve') {
      return new Response('Not found', { 
        status: 404,
        headers: getCORSHeaders()
      });
    }

    try {
      // Parse request body
      const { text, prompt } = await request.json();
      
      if (!text || typeof text !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Text is required and must be a string' }), 
          { 
            status: 400, 
            headers: {
              'Content-Type': 'application/json',
              ...getCORSHeaders()
            }
          }
        );
      }

      // Validate text length (prevent abuse)
      if (text.length > 10000) {
        return new Response(
          JSON.stringify({ error: 'Text too long. Maximum 10,000 characters allowed.' }), 
          { 
            status: 400, 
            headers: {
              'Content-Type': 'application/json',
              ...getCORSHeaders()
            }
          }
        );
      }

      // Check for OpenAI API key
      if (!env.OPENAI_API_KEY) {
        return new Response(
          JSON.stringify({ error: 'OpenAI API key not configured' }), 
          { 
            status: 500, 
            headers: {
              'Content-Type': 'application/json',
              ...getCORSHeaders()
            }
          }
        );
      }

      // Prepare the improvement prompt
      const defaultPrompt = 'Verbessere den folgenden Text in Bezug auf Grammatik, Stil und Lesbarkeit, behalte aber den ursprünglichen Sinn und Ton bei:';
      const systemPrompt = prompt || defaultPrompt;

      // Call OpenAI API
      const improvedText = await improveTextWithOpenAI(text, systemPrompt, env.OPENAI_API_KEY);

      return new Response(
        JSON.stringify({ 
          success: true,
          originalText: text,
          improvedText: improvedText,
          prompt: systemPrompt,
          timestamp: new Date().toISOString()
        }), 
        { 
          status: 200, 
          headers: {
            'Content-Type': 'application/json',
            ...getCORSHeaders()
          }
        }
      );

    } catch (error) {
      console.error('Error processing request:', error);
      
      return new Response(
        JSON.stringify({ 
          error: 'Internal server error',
          message: error.message 
        }), 
        { 
          status: 500, 
          headers: {
            'Content-Type': 'application/json',
            ...getCORSHeaders()
          }
        }
      );
    }
  }
};

/**
 * Improve text using OpenAI GPT API
 */
async function improveTextWithOpenAI(text, prompt, apiKey) {
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
    throw new Error('Invalid response from OpenAI API');
  }

  return data.choices[0].message.content.trim();
}

/**
 * Handle CORS preflight requests
 */
function handleCORS() {
  return new Response(null, {
    status: 204,
    headers: getCORSHeaders()
  });
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