/**
 * CIB Pop Write - Cloudflare Worker for ChatGPT Text Improvement
 * Provides secure text improvement functionality using OpenAI GPT API
 * and HOCR entity extraction functionality
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

// Run main function if this file is executed directly
if (typeof process !== 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

/**
 * Main function for local testing
 */
async function main() {
  
  const text = "Meine Name ist Korben Dallas. Ich arbeite bei Microsoft als Softwareentwickler.";
  const initialHocrContent = convertTextToHocr(text);

  console.log();
  console.log('Initial Text:', text);

  console.log();
  console.log('Initial HOCR Content:', initialHocrContent);
  //return;

  const env = {
    SIMULATE: true,
    CIB_POP_USERNAME: '',
    CIB_POP_PASSWORD: '',
    CIB_POP_URL: ''
  };

  // Send HOCR to remote server and get entity mappings
  const entityMappings = await processHocrWithRemoteServer(initialHocrContent, env);

  // Generate pseudonymized text from the returned entity mappings
  let pseudonymizedText = text;
  for (const [key, value] of Object.entries(entityMappings)) {
    pseudonymizedText = pseudonymizedText.replace(new RegExp(key, 'g'), value);
  }

  console.log();
  console.log('Pseudonymized Text:', pseudonymizedText);

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
    if (text.length > 10000) {
      return createErrorResponse('Text too long. Maximum 10,000 characters allowed.', 400);
    }

    // Check for required environment variables
    if (!env.CIB_POP_USERNAME || !env.CIB_POP_PASSWORD || !env.CIB_POP_URL) {
      return createErrorResponse('CIB Pop credentials not configured', 500);
    }

    // Convert text to HOCR format
    const initialHocrContent = convertTextToHocr(text);

    // Send HOCR to remote server and get entity mappings
    const entityMappings = await processHocrWithRemoteServer(initialHocrContent, env);

    // Generate pseudonymized text from the returned entity mappings
    let pseudonymizedText = text;
    for (const [key, value] of Object.entries(entityMappings)) {
      pseudonymizedText = pseudonymizedText.replace(new RegExp(key, 'g'), value);
    }

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
<html xmlns="http://www.w3.org/1999/xhtml">
	<head>
		<title></title>
		<meta http-equiv="Content-Type" content="text/html;charset=utf-8" />
		<meta name="ocr-system" content="CIB ocr:3.1.1.0;CIB deepER:2.8.0" />
		<meta name="ocr-capabilities" content="" />
	</head>
	<body>
  <div class="ocr_page" title="image input.png; bbox 0 0 2456 3516; ppageno 1; x_useddeskewangle -0.5625" id="page_1">\n`;

  let lineY = 100; // Starting Y position
  let wordId = 1;

  paragraphs.forEach((paragraph, pIndex) => {
    if (paragraph.trim()) {
      // hocrContent += `\t<div class="ocr_par" id="par_${pIndex + 1}" title="bbox 0 ${lineY} 1000 ${lineY + 50}">\n`;
      
      const lines = paragraph.split('\n');
      lines.forEach((line, lIndex) => {
        if (line.trim()) {
          //hocrContent += `\t\t<span class="ocr_line" id="line_${pIndex + 1}_${lIndex + 1}" title="bbox 0 ${lineY} 1000 ${lineY + 25}">\n`;
          hocrContent += `\t\t<span class="ocr_line" title="bbox 0 ${lineY} 1000 ${lineY + 50}" id="line_${lIndex + 1}">\n`;
          
          const words = line.trim().split(/\s+/);
          let wordX = 100; // Starting X position
          
          words.forEach((word) => {
            if (word) {
              // Remove punctuation from the word
              const cleanWord = word.replace(/[^\w\s]/g, '');
              if (cleanWord) {
                const wordWidth = cleanWord.length * 10; // Approximate width
                hocrContent += `\t\t\t<span class="ocrx_word" title="bbox ${wordX} ${lineY} ${wordX + wordWidth} ${lineY + 50}" id="word_${wordId}">${cleanWord}</span>\n`;
                wordX += wordWidth + 10;
                wordId++;
              }
            }
          });
          
          hocrContent += `\t\t</span>\n`;
          lineY += 30;
        }
      });
      
      // hocrContent += `</div>\n`;
      lineY += 20; // Extra space between paragraphs
    }
  });

  hocrContent += `\t</div>\n</body>\n</html>\n`;

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

  let responseData;

  if (env.SIMULATE) {
    // Read test data from file instead of making real API call
    try {
      // For Node.js environment, use fs to read the file
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      
      // Get the directory of the current file
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const testFilePath = path.join(__dirname, '..', 'test.json');
      
      const testDataContent = fs.readFileSync(testFilePath, 'utf8');
      responseData = JSON.parse(testDataContent);
      console.log('Using simulated responseData from test.json file');
    } catch (error) {
      console.error('Error reading test.json file:', error);
      throw new Error('Failed to load simulation data from test.json');
    }
  } else {
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

    responseData = await response.json();
  }

  // console.log('responseData: ', responseData);
  // console.log('responseData JSON for testing: ', JSON.stringify(responseData, null, 2));

  const entityMappings = parseHocrContentForEntities(responseData);

  // console.log('entityMappings: ', entityMappings);
  
  return entityMappings;
}

/**
 * Parse JSON content for entity mappings
 */
function parseHocrContentForEntities(jsonContent) {
  // Check if the input is already a parsed JSON object or a string
  let data;
  if (typeof jsonContent === 'string') {
    try {
      data = JSON.parse(jsonContent);
    } catch (error) {
      console.log(error);
    }
  } else {
    data = jsonContent;
  }
  
  const mapping = {};
  
  // Recursive function to traverse the JSON tree
  function traverseJson(obj) {
    if (!obj || typeof obj !== 'object') {
      return;
    }
    
    // Check if this object is a word with x_entity in attributes
    if (obj.type === 'word' && obj.attributes && obj.attributes.x_entity && obj.id && obj.text) {
      const entityKey = obj.attributes.x_entity.split(/\s+/).join('_');
      mapping[obj.text] = entityKey;
    }
    
    // Recursively traverse children
    if (obj.children && Array.isArray(obj.children)) {
      obj.children.forEach(child => traverseJson(child));
    }
    
    // Traverse any other object properties that might contain nested structures
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && typeof obj[key] === 'object' && obj[key] !== null) {
        traverseJson(obj[key]);
      }
    }
  }
  
  // Start traversal from the root
  traverseJson(data);
  
  return mapping;
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
