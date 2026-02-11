# Vi RBM Microservice

A production-ready Node.js + Express + TypeScript microservice for Vodafone Idea (Vi) RCS Business Messaging.

## Features

- **Authentication**: Auto-manages Vi RBM OAuth2 tokens (Client Credentials).
- **Template Management**: Create, List, Delete, and Upload Media for RCS Templates.
- **Messaging**: Send Text, Rich Cards, and Custom Payloads (Google & GSMA styles).
- **Webhooks**: Handle incoming user messages, delivery receipts, and events.
- **Type Safety**: Full TypeScript definitions for RBM payloads.

## Project Structure

```
src/
├── config/         # Environment configuration
├── controllers/    # Request handlers
├── middleware/     # Auth and utility middleware
├── routes/         # API route definitions
├── services/       # Business logic (Auth, Templates, Messages)
├── types/          # TypeScript interfaces
├── webhook/        # Webhook event handlers
└── app.ts          # App entry point
```

## Setup & Installation

1.  **Install Dependencies**
    ```bash
    npm init -y
    npm install express axios cors dotenv form-data multer uuid winston
    npm install -D typescript @types/node @types/express @types/cors @types/multer @types/uuid ts-node nodemon
    ```

2.  **Configure Environment**
    - Copy `.env.example` to `.env`
    - Fill in your Vi RBM credentials (`CLIENT_ID`, `CLIENT_SECRET`, `BOT_ID`, etc.)

3.  **Build & Run**
    - Development:
      ```bash
      npx nodemon src/app.ts
      ```
    - Production Build:
      ```bash
      npx tsc
      node dist/app.js
      ```

## API Endpoints

### Templates
- `POST /api/templates`: Create a new RCS template
- `GET /api/templates`: List all templates
- `DELETE /api/templates/:id`: Delete a template
- `POST /api/templates/upload`: Upload media file

### Messages
- `POST /api/messages/text`: Send simple text message
- `POST /api/messages/rich-card`: Send a rich card
- `POST /api/messages/custom`: Send custom payload

### Webhooks
- `POST /api/webhooks/vi-rbm`: Endpoint to register with Vi RBM Console

## Important Notes

1.  **File Uploads**: Files uploaded via `/upload` are sent to Vi RBM storage. Ensure you handle local cleanup if needed.
2.  **Auth Token**: The service caches the access token and refreshes it 5 minutes before expiry.
3.  **Error Handling**: All API errors are logged and returned with 500 status codes for simplicity; customize as needed.
4.  **Google vs GSMA**: The service defaults to Google-style API for messaging as it's more common for RBM agents. GSMA style is available in `MessageService` if required.
