# CIB Pop Write Worker

This directory contains the Cloudflare Worker for CIB Pop Write, providing text improvement functionality using ChatGPT and HOCR parsing capabilities.

## Features

### Cloudflare Worker API
- **Text Improvement**: Secure text improvement functionality using OpenAI GPT API
- **CORS Support**: Cross-origin resource sharing for web frontend integration
- **Rate Limiting**: Built-in text length validation to prevent abuse
- **Error Handling**: Comprehensive error responses and logging

### HOCR Parser - JavaScript Version
- Parse HOCR files directly to extract entity mappings
- Extract x_entity annotations from title attributes
- Display detailed entity information
- Check for presence of x_entity annotations

## Requirements

- Node.js (version 14 or higher)
- npm
- Wrangler CLI for Cloudflare Worker deployment

## Installation

1. Install dependencies:
```bash
npm install
```

## Usage

### Cloudflare Worker Development
```bash
# Start development server
npm run dev

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
```

### HOCR Parser Usage

#### Command Line
```bash
# Run the HOCR parser script
node parse_hocr_directly.js

# Or use npm script
npm run hocr:parse
```

#### As a Module
```javascript
import { 
    getEntitiesTextMappingFromHocr, 
    extractXEntityFromTitle, 
    hasXEntityAnnotationInHocr 
} from './parse_hocr_directly.js';

// Check if file has x_entity annotations
const hasEntities = hasXEntityAnnotationInHocr('output.hocr');

if (hasEntities) {
    // Get entity mappings
    const mapping = getEntitiesTextMappingFromHocr('output.hocr');
    console.log(mapping);
}
```

## API Endpoints

### POST /improve
Improves text using ChatGPT API.

**Request Body:**
```json
{
  "text": "Text to be improved"
}
```

**Response:**
```json
{
  "success": true,
  "originalText": "Original text",
  "improvedText": "Improved text",
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

## Environment Variables

- `OPENAI_API_KEY`: OpenAI API key for ChatGPT integration
- `DEFAULT_PROMPT`: Default prompt for text improvement (optional)

## Dependencies

### Production Dependencies
- **cheerio**: Server-side implementation of jQuery for HTML/XML parsing (for HOCR parser)

### Development Dependencies
- **wrangler**: Cloudflare Workers CLI for development and deployment

## HOCR Parser Functions

### `getEntitiesTextMappingFromHocr(hocrFile)`
Parse HOCR file and create a mapping of x_entity → concatenated original text.

**Parameters:**
- `hocrFile` (string): Path to the HOCR file

**Returns:**
- Object: Dictionary mapping entity names to their concatenated text

### `extractXEntityFromTitle(title)`
Extract x_entity value from the title attribute.

**Parameters:**
- `title` (string): The title attribute string

**Returns:**
- string|null: The entity name or null if not found

### `hasXEntityAnnotationInHocr(hocrFile)`
Check if the HOCR file has any x_entity annotations.

**Parameters:**
- `hocrFile` (string): Path to the HOCR file

**Returns:**
- boolean: True if any word has x_entity attribute, false otherwise

## Example HOCR Parser Output

```
Parsing HOCR file: /path/to/output.hocr
Has x_entity annotations: true

Entity mappings found:
----------------------------------------
company_name: Versatel Deutschland GmbH versatel Versatel Deutschland GmbH...
first_name: Johannes Holger Thorsten Juli Line
last_name: Pruchnow, Püchert, Haeser Post Steuer-
city: Düsseldort, Düsseldorf, Stuttgart Stuttgart München
...

Total entities found: 24
```

## Differences from Python Version

- Uses ES6 modules (`import`/`export`) instead of Python imports
- Uses `cheerio` instead of `BeautifulSoup` for HTML parsing
- Uses Node.js built-in `fs` and `path` modules instead of Python's `pathlib`
- JavaScript object syntax instead of Python dictionaries
- Uses `.each()` method for iteration instead of Python's `for` loops

## File Structure

```
worker/
├── package.json              # npm package configuration
├── package-lock.json         # npm lock file
├── parse_hocr_directly.js     # HOCR parser JavaScript script
├── README.md                 # This file
├── wrangler.toml             # Cloudflare Worker configuration
└── src/
    └── index.js              # Cloudflare Worker main script
```

## Development

The worker combines two main functionalities:

1. **Cloudflare Worker API** (`src/index.js`): Provides the `/improve` endpoint for text improvement using ChatGPT
2. **HOCR Parser** (`parse_hocr_directly.js`): Standalone script and module for parsing HOCR files and extracting entity mappings

Both functionalities can be used independently or together depending on your needs.