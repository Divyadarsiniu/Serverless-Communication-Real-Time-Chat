# Serverless Chat Frontend

Modern React Single Page Application (SPA) built with Vite, Tailwind-styled design tokens, and dual-mode connectivity for Amazon Web Services (AWS) or local offline preview.

## Features

- **Dual-Mode Architecture:** Connects to real AWS Cognito + API Gateway (WSS/REST), with automated fallback to local BroadcastChannel real-time bus for rapid offline demonstrations across multiple browser windows.
- **Bi-directional WebSocket Communication:** Maintains persistent WSS connectivity with automatic 4-minute heartbeat and exponential-backoff reconnection.
- **Zero-Refresh Real-Time Feed:** Immediate message rendering via native event listeners.
- **Responsive Layout:** Desktop multi-pane interface with responsive drawer support for mobile views.
- **Presence Indicators:** Visual online/offline status indicators.
- **S3 Avatar Integration:** Direct client upload to Amazon S3 using pre-signed PUT URLs.

## Quick Start

```powershell
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build for production
npm run build
```

## Connecting to AWS

Once the backend is deployed via AWS SAM, update `.env` or run `infrastructure/deploy.ps1` to populate:

```env
VITE_AWS_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_WS_API_URL=wss://xxxxxx.execute-api.us-east-1.amazonaws.com/dev
VITE_REST_API_URL=https://xxxxxx.execute-api.us-east-1.amazonaws.com/dev
VITE_S3_BUCKET_NAME=serverless-chat-assets-xxxxxx-dev
VITE_USE_MOCK=false
```
