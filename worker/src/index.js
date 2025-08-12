/**
 * CIB Pop Write - Cloudflare Worker for ChatGPT Text Improvement
 * Provides secure text improvement functionality using OpenAI GPT API
 * and HOCR entity extraction functionality
 */

import * as cheerio from 'cheerio';

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
    
    if (url.pathname === '/improve') {
      return handleImproveEndpoint(request, env);
    } else if (url.pathname === '/hocr') {
      return handleHocrEndpoint(request, env);
    } else {
      return createErrorResponse('Endpoint not found', 404);
    }
  }
};

/**
 * Handle requests to the /improve endpoint
 */
async function handleImproveEndpoint(request, env) {
  try {
    // Parse and validate request body
    const requestData = await request.json();
    const { text } = requestData;
    
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

    // Read prompt from backend configuration (environment variable)
    const improvementPrompt = env.DEFAULT_PROMPT || 'Verbessere den folgenden Text in Bezug auf Grammatik, Stil und Lesbarkeit, behalte aber den ursprünglichen Sinn und Ton bei:';

    // Call OpenAI API for text improvement
    const improvedText = await improveTextWithChatGPT(text, improvementPrompt, env.OPENAI_API_KEY);

    // Return successful response
    return createSuccessResponse({
      success: true,
      originalText: text,
      improvedText: improvedText,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing improve request:', error);
    
    return createErrorResponse(
      'Internal server error',
      500,
      { message: error.message }
    );
  }
}

/**
 * Handle requests to the /hocr endpoint
 */
async function handleHocrEndpoint(request, env) {
  try {
    // Parse and validate request body
    const requestData = await request.json();
    const { text } = requestData;
    
    if (!text || typeof text !== 'string') {
      return createErrorResponse('Text is required and must be a string', 400);
    }

    // Validate text length to prevent abuse
    if (text.length > 50000) {
      return createErrorResponse('Text too long. Maximum 50,000 characters allowed.', 400);
    }

    // Check for required environment variables
    if (!env.CIB_POP_USERNAME || !env.CIB_POP_PASSWORD || !env.CIB_POP_URL) {
      return createErrorResponse('CIB Pop credentials not configured', 500);
    }

    // Convert text to HOCR format
    const initialHocrContent = convertTextToHocr(text);

    // Send HOCR to remote server and get entity mappings
    const { entityMappings, hocrContent } = await processHocrWithRemoteServer(initialHocrContent, env);

    // Generate pseudonymized text from the returned HOCR content
    const pseudonymizedText = hocrContent ? generatePseudonymizedText(hocrContent) : '';

    // Return successful response
    return createSuccessResponse({
      success: true,
      originalText: text,
      entityMappings: entityMappings,
      pseudonymizedText: pseudonymizedText,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing HOCR request:', error);
    
    return createErrorResponse(
      'Internal server error',
      500,
      { message: error.message }
    );
  }
}

/**
 * Convert plain text to HOCR format, preserving linebreaks and paragraphs
 */
function convertTextToHocr(text) {
  // Split text into paragraphs and lines
  const paragraphs = text.split(/\n\s*\n/); // Split on double newlines
  
  let hocrContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head>
<title></title>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<meta name="ocr-system" content="text-to-hocr-converter" />
</head>
<body>
<div class="ocr_page" id="page_1" title="bbox 0 0 1000 1000">
`;

  let lineY = 100; // Starting Y position
  let wordId = 1;

  paragraphs.forEach((paragraph, pIndex) => {
    if (paragraph.trim()) {
      hocrContent += `<div class="ocr_par" id="par_${pIndex + 1}" title="bbox 0 ${lineY} 1000 ${lineY + 50}">
`;
      
      const lines = paragraph.split('\n');
      lines.forEach((line, lIndex) => {
        if (line.trim()) {
          hocrContent += `<span class="ocr_line" id="line_${pIndex + 1}_${lIndex + 1}" title="bbox 0 ${lineY} 1000 ${lineY + 25}">
`;
          
          const words = line.trim().split(/\s+/);
          let wordX = 50; // Starting X position
          
          words.forEach((word) => {
            if (word) {
              const wordWidth = word.length * 10; // Approximate width
              hocrContent += `<span class="ocrx_word" id="word_${wordId}" title="bbox ${wordX} ${lineY} ${wordX + wordWidth} ${lineY + 25}">${word}</span> `;
              wordX += wordWidth + 10;
              wordId++;
            }
          });
          
          hocrContent += `</span>
`;
          lineY += 30;
        }
      });
      
      hocrContent += `</div>
`;
      lineY += 20; // Extra space between paragraphs
    }
  });

  hocrContent += `</div>
</body>
</html>`;

  return hocrContent;
}

/**
 * Send HOCR content to remote server and parse the response
 * @returns {Object} Object containing entityMappings and hocrContent
 */
async function processHocrWithRemoteServer(hocrContent, env) {
  // Create form data for the POST request
  const formData = new FormData();
  
  // Create a blob from the HOCR content to simulate a file upload
  const hocrBlob = new Blob([hocrContent], { type: 'text/html' });
  formData.append('file', hocrBlob, 'input.hocr');

  // Prepare authentication
  const auth = btoa(`${env.CIB_POP_USERNAME}:${env.CIB_POP_PASSWORD}`);

  // Send request to remote server
  const response = await fetch(env.CIB_POP_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Remote server error: ${response.status} - ${response.statusText}`);
  }

  const responseData = await response.json();
  
  // If the response contains HOCR data, parse it for entity mappings
  if (responseData.hocr || responseData.hocrContent) {
    // Parse the returned HOCR content for entities
    const hocrData = responseData.hocr || responseData.hocrContent;
    const entityMappings = parseHocrContentForEntities(hocrData);
    return { entityMappings, hocrContent: hocrData };
  }
  
  // If the response is already entity mappings, return as is
  if (responseData.entities || responseData.entityMappings) {
    const entityMappings = responseData.entities || responseData.entityMappings;
    return { entityMappings, hocrContent: null };
  }
  
  // If response has a different structure, try to extract meaningful data
  return { entityMappings: responseData, hocrContent: null };
}

/**
 * Generate pseudonymized text from HOCR content by replacing words with their entity annotations
 * while preserving the original text structure (line breaks, paragraphs, etc.)
 * 
 * @param {string} hocrContent - The HOCR content from the remote server
 * @returns {string} Pseudonymized text with entity annotations
 */
function generatePseudonymizedText(hocrContent) {
  // Use cheerio to parse the HOCR content
  const $ = cheerio.load(hocrContent);
  
  // Find all word elements (spans with class ocrx_word)
  const wordElements = $('.ocrx_word');
  
  // Create a map of word positions to their replacements
  const wordReplacements = new Map();
  
  wordElements.each((index, element) => {
    const $element = $(element);
    const title = $element.attr('title') || '';
    const text = $element.text().trim();
    
    // Get the full entity name including numbers
    const fullEntity = extractFullXEntityFromTitle(title);
    
    if (fullEntity) {
      // Replace the word with its entity annotation
      $element.text(fullEntity);
    }
  });
  
  // Extract text content while preserving structure
  let pseudonymizedText = '';
  
  // Find all paragraphs
  $('.ocr_par').each((pIndex, par) => {
    const $par = $(par);
    let paragraphText = '';
    
    // Find all lines in this paragraph
    $par.find('.ocr_line').each((lIndex, line) => {
      const $line = $(line);
      let lineText = '';
      
      // Find all words in this line
      $line.find('.ocrx_word').each((wIndex, word) => {
        const $word = $(word);
        const wordText = $word.text().trim();
        if (wordText) {
          lineText += (lineText ? ' ' : '') + wordText;
        }
      });
      
      if (lineText) {
        paragraphText += (paragraphText ? '\n' : '') + lineText;
      }
    });
    
    if (paragraphText) {
      pseudonymizedText += (pseudonymizedText ? '\n\n' : '') + paragraphText;
    }
  });
  
  return pseudonymizedText || '';
}

/**
 * Parse HOCR content string for entity mappings
 */
function parseHocrContentForEntities(hocrContent) {
  // Use cheerio to parse the HOCR content (similar to the parse_hocr_directly.js)
  const $ = cheerio.load(hocrContent);
  
  // Find all word elements (spans with class ocrx_word)
  const wordElements = $('.ocrx_word');
  
  const mapping = {};
  
  wordElements.each((index, element) => {
    const $element = $(element);
    const title = $element.attr('title') || '';
    const text = $element.text().trim();
    
    // Parse the title attribute to find x_entity
    const xEntity = extractXEntityFromTitle(title);
    
    if (xEntity) {
      if (!mapping[xEntity]) {
        mapping[xEntity] = [];
      }
      mapping[xEntity].push(text);
    }
  });
  
  // Join the text parts for each entity
  const result = {};
  for (const [key, value] of Object.entries(mapping)) {
    result[key] = value.join(' ');
  }
  
  return result;
}

/**
 * Extract x_entity value from the title attribute.
 * 
 * Example title: "x_sensibility 1; bbox 414 176 526 200; x_entity first_name 0"
 * Should return: "first_name"
 * 
 * @param {string} title - The title attribute string
 * @returns {string|null} The entity name or null if not found
 */
function extractXEntityFromTitle(title) {
  if (!title.includes('x_entity')) {
    return null;
  }
  
  // Split by semicolon and find the x_entity part
  const parts = title.split(';');
  for (const part of parts) {
    const trimmedPart = part.trim();
    if (trimmedPart.startsWith('x_entity')) {
      // Extract just the entity name (everything after 'x_entity' but before any trailing number/space)
      const entityPart = trimmedPart.replace('x_entity', '').trim();
      // Take everything except the last token (which is usually a number)
      const tokens = entityPart.split(/\s+/);
      if (tokens.length > 0) {
        return tokens.length === 1 ? tokens[0] : tokens.slice(0, -1).join(' ');
      }
    }
  }
  
  return null;
}

/**
 * Extract full x_entity value from the title attribute including the number.
 * 
 * Example title: "x_sensibility 1; bbox 414 176 526 200; x_entity first_name 0"
 * Should return: "first_name_0"
 * 
 * @param {string} title - The title attribute string
 * @returns {string|null} The full entity name with number or null if not found
 */
function extractFullXEntityFromTitle(title) {
  if (!title.includes('x_entity')) {
    return null;
  }
  
  // Split by semicolon and find the x_entity part
  const parts = title.split(';');
  for (const part of parts) {
    const trimmedPart = part.trim();
    if (trimmedPart.startsWith('x_entity')) {
      // Extract the full entity part (everything after 'x_entity')
      const entityPart = trimmedPart.replace('x_entity', '').trim();
      // Join all tokens with underscores to create the full entity name
      const tokens = entityPart.split(/\s+/).filter(token => token.length > 0);
      if (tokens.length > 0) {
        return tokens.join('_');
      }
    }
  }
  
  return null;
}

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