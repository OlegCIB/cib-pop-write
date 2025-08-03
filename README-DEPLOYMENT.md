# CIB Pop Write - Cloudflare Worker Deployment Guide

This guide explains how to set up and deploy the ChatGPT text improvement feature using Cloudflare Workers and GitHub Actions.

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **OpenAI API Key**: Get one from [platform.openai.com](https://platform.openai.com/api-keys)
3. **GitHub Repository**: Fork or clone this repository

## Setup Instructions

### 1. Cloudflare Configuration

1. **Get your Cloudflare Account ID**:
   - Log in to Cloudflare Dashboard
   - Select your domain (or create a new one)
   - Copy the Account ID from the right sidebar

2. **Create API Token**:
   - Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
   - Click "Create Token"
   - Use "Edit Cloudflare Workers" template
   - Set permissions:
     - Zone: Zone Settings:Read, Zone:Read
     - Account: Cloudflare Workers:Edit
   - Copy the generated token

### 2. GitHub Secrets Configuration

Add these secrets to your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add the following **Repository secrets**:

```
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token_here
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id_here
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Local Development Setup

1. **Install dependencies**:
   ```bash
   cd worker
   npm install
   ```

2. **Set up Wrangler CLI**:
   ```bash
   npx wrangler login
   ```

3. **Configure secrets locally**:
   ```bash
   cd worker
   npx wrangler secret put OPENAI_API_KEY
   # Enter your OpenAI API key when prompted
   ```

4. **Test locally**:
   ```bash
   npm run dev
   ```

### 4. Deploy Worker

#### Automatic Deployment (Recommended)

1. **Push to main branch** - triggers production deployment
2. **Create pull request** - triggers staging deployment

#### Manual Deployment

```bash
cd worker

# Deploy to staging
npm run deploy:staging

# Deploy to production  
npm run deploy:production
```

### 5. Workers.dev Subdomain Registration

**Important**: If you encounter a warning about needing to register a workers.dev subdomain, you have two options:

1. **Register a subdomain** (if you want to use workers.dev):
   ```bash
   cd worker
   npx wrangler subdomain
   ```

2. **Use custom routes** (recommended for production):
   - Add a custom domain in your wrangler.toml
   - Configure DNS records in Cloudflare Dashboard

### 6. Update Frontend Configuration

Update the worker URL in your frontend:

1. **Edit `index.html`**:
   ```html
   <meta name="worker-url" content="https://cib-pop-write-text-improver.YOUR_SUBDOMAIN.workers.dev">
   ```

2. **Or update `script.js`** (line 241):
   ```javascript
   return 'https://cib-pop-write-text-improver.YOUR_SUBDOMAIN.workers.dev';
   ```

Replace `YOUR_SUBDOMAIN` with your actual Cloudflare Workers subdomain.

## Configuration

### Text Improvement Prompt

The prompt used for text improvement is configured in the backend for security reasons and cannot be changed via client requests.

**To modify the prompt**:

1. **Edit `worker/wrangler.toml`**:
   ```toml
   [vars]
   DEFAULT_PROMPT = "Your custom prompt here"
   ```

2. **Redeploy the worker**:
   ```bash
   cd worker
   npm run deploy:production
   ```

**Default prompt**: "Verbessere den folgenden Text in Bezug auf Grammatik, Stil und Lesbarkeit, behalte aber den ursprünglichen Sinn und Ton bei:"

## API Endpoint

The worker exposes one endpoint:

### POST `/improve`

**Request Body**:
```json
{
  "text": "Text to improve"
}
```

**Response**:
```json
{
  "success": true,
  "originalText": "Original text",
  "improvedText": "Improved text from ChatGPT",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Note**: The prompt used for text improvement is now configured in the backend (`wrangler.toml`) and cannot be changed via API requests for security reasons.

## Security Features

- **CORS enabled** for cross-origin requests
- **Rate limiting** via text length validation (max 10,000 chars)
- **API key protection** - OpenAI key stored as encrypted secret
- **Error handling** with fallback to simulation mode

## Monitoring & Debugging

1. **View logs**:
   ```bash
   npx wrangler tail
   ```

2. **Check deployment status**:
   ```bash
   npx wrangler deployments list
   ```

3. **Test endpoint**:
   ```bash
   curl -X POST https://your-worker.workers.dev/improve \
     -H "Content-Type: application/json" \
     -d '{"text":"Hello world"}'
   ```

## Troubleshooting

### Common Issues

1. **"[WARNING] You need to register a workers.dev subdomain"**
   - Run `npx wrangler subdomain` to register a subdomain
   - Or configure custom routes in wrangler.toml for production use

2. **"OpenAI API key not configured"**
   - Ensure `OPENAI_API_KEY` secret is set in GitHub and Cloudflare

3. **CORS errors**
   - Worker includes CORS headers, check browser console for details

4. **Worker not found**
   - Verify the worker URL in the frontend matches your deployed worker
   - Check that the worker name matches the one in wrangler.toml

5. **GitHub Actions failing**
   - Check that all required secrets are set in repository settings
   - Verify Cloudflare API token has correct permissions

### Support

- **Cloudflare Workers**: [developers.cloudflare.com/workers](https://developers.cloudflare.com/workers/)
- **OpenAI API**: [platform.openai.com/docs](https://platform.openai.com/docs)
- **Wrangler CLI**: [developers.cloudflare.com/workers/wrangler](https://developers.cloudflare.com/workers/wrangler/)

## Cost Estimation

- **Cloudflare Workers**: Free tier includes 100,000 requests/day
- **OpenAI API**: ~$0.002 per 1K tokens (varies by model)
- **GitHub Actions**: Free for public repositories

For production use, consider implementing additional rate limiting and monitoring.

## Migration from Previous Versions

### Version 2.0.0 - Backend Configuration for Prompts

**Breaking Changes**:
- The `prompt` parameter is no longer accepted in the `/improve` API endpoint
- Prompt configuration has been moved to the backend for security reasons

**Migration Steps**:

1. **Update your `wrangler.toml`** to include the prompt configuration:
   ```toml
   [vars]
   DEFAULT_PROMPT = "Your custom prompt here"
   ```

2. **Update client code** to remove the `prompt` parameter from API calls:
   ```javascript
   // Before (v1.x)
   fetch('/improve', {
     method: 'POST',
     body: JSON.stringify({ text: "...", prompt: "..." })
   })
   
   // After (v2.0+)
   fetch('/improve', {
     method: 'POST', 
     body: JSON.stringify({ text: "..." })
   })
   ```

3. **Redeploy the worker** after configuration changes

**Reason for Change**: This change improves security by preventing dynamic prompt injection and ensures consistent text improvement behavior across all requests.