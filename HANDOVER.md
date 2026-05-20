# 🚀 NotifyNow | Developer Handover & Technical Documentation

This document serves as the complete technical handover report for **NotifyNow** (Multi-Channel Notification Platform). It is structured to help incoming developers quickly understand the stack, system modules, architecture, database schemas, and deploy procedures.

---

## 📋 1. Project Overview & Business Logic
**NotifyNow** is an enterprise-grade multi-channel notification engine (SMS, WhatsApp, RCS, Email, and Voicebot) designed for marketing campaign dispatch, transactional alert routing, and interactive chat automation.

### Key Logic & Workflows:
1. **Multi-Tenancy**: Isolated database structure using `user_id` filters in SQL.
2. **Role-Based Access Control (RBAC)**:
   * **Admin (Super-Admin)**: Controls gateways, wallet recharge, plans, default templates, system logs, and reseller margins.
   * **Reseller**: Operates a sub-tenant business. Can create client accounts, assign credits, set custom pricing for channels, and view consolidated usage reports.
   * **Client**: Runs campaigns, uploads CSV contacts, maps variables, customizes SMS/RCS/WA/Email templates, interacts via Live Support Chat, and accesses detailed delivery logs.
3. **Wallet & Billing Ledger**: Every campaign recipient deducts credits atomically from the user's wallet. If the wallet balance reaches zero during sending, campaigns are paused automatically to avoid debt. Billing calculations factor in SMS unicode parts, WhatsApp Meta categories, and voice call durations.

---

## 🛠️ 2. Technical Stack
The system is built on a high-throughput **MEN** stack (MySQL, Express, Node.js) with a **React** frontend.

* **Frontend**:
  * React (Vite + TypeScript) SPA
  * CSS Framework: Tailwind CSS (fully responsive, mobile-first layouts)
  * Icons: Lucide React
  * Routing: React Router DOM
* **Backend**:
  * Node.js & Express.js REST API
  * Databases:
    * **MySQL** (Primary relational storage for users, configs, campaigns, logs, and wallet)
    * **Redis** (In-memory storage for BullMQ queue state & rate-limiting)
  * Websockets: Socket.io for live chat syncing.
* **Campaign Processing Engine**:
  * **BullMQ (Redis-based)**: High-scale message ingestion queue capable of executing 1Cr+ sends.
  * **Classic SQL Worker (`queueService.js`)**: Runs a backup polling loop (every 15 seconds) to process messages directly via SQL if Redis is offline or during local development.
* **Integrations**:
  * **RCS**: Dotgo API
  * **WhatsApp (Official)**: Meta Cloud API via Pinbot gateway (`partnersv1.pinbot.ai`)
  * **WhatsApp (Unofficial)**: Custom WhatsApp Web API gateway via Proero (`wa.notifynow.in`) with QR session pairing
  * **SMS**: Custom HTTP gateways (compatible with Kannel SMS gateway structures)
  * **Email**: SMTP integration via Nodemailer
  * **Voicebot**: TTS (Text-to-Speech) / static audio API gateways
  * **Payment Gateway**: CCAvenue Secure Gateway

---

## 📊 3. Core Modules & Features Implemented So Far

### 📲 Multi-Channel Template Builder
* Unified visual template designer for **SMS, WhatsApp, RCS, Email, and Voice**.
* Supports rich components: Headers (Image, Video, Document, Text links), body paragraphs with custom placeholders (`{{1}}`, `[var]`), and suggestion buttons (Call-to-Action/Quick Replies).
* Live Interactive Phone Mockup preview panel on the UI showing real-time text/image rendering.

### 🗂️ Ingestion & Contact Variable Mapping
* Allows CSV/Excel file uploads for bulk campaigns.
* **Fuzzy Variables Mapping**: Replaces dynamic placeholders (like `{{name}}`, `[amount]`, `{#var#}`) with CSV row values millisecond before dispatching. Handles fallback mapping rules gracefully if headers mismatch.

### 🔄 Intelligent WhatsApp-to-SMS / RCS-to-SMS Failover (v2.0)
* Built-in fallback router. If a WhatsApp or RCS message fails to deliver, the backend automatically triggers a DLT-approved SMS template.
* **Idempotency Locking**: Implements an atomic Redis/DB lock (`failover_triggered`) to guarantee that SMS fallbacks are sent exactly once per failure.

### 💬 Live Chat Inbox & Support System
* Real-time WebSocket support inbox showing active conversations.
* Campaign replies from webhooks are automatically synced to the live chat logs (`webhook_logs` table) so clients can message back.

### 🤖 Visual Chatflows & Automation Builder
* Drag-and-drop node graph workspace. Clients can configure automated responses (e.g. if customer replies with keyword "HELP", auto-trigger support flow).

### 💳 Reseller & Whitelabel Hub
* Complete credit management system where resellers can add their clients, configure customized rate cards per channel, and view analytics.

---

## 📂 4. Repository Structure & Key Files

```bash
📂 PROJECT ROOT
├── 📂 backend/                      # Express.js Application
│   ├── 📂 config/
│   │   └── db.js                    # MySQL connection pooling (mysql2/promise)
│   ├── 📂 middleware/
│   │   └── authMiddleware.js        # JWT route guard
│   ├── 📂 queues/
│   │   ├── campaignQueue.js         # BullMQ queue definition
│   │   └── campaignWorker.js        # BullMQ background worker (RCS, WhatsApp, SMS dispatch)
│   ├── 📂 routes/
│   │   ├── auth.js                  # Login/Register, OTP verification, Google/Microsoft OAuth
│   │   ├── campaigns.js             # Campaign CRUD, CSV ingestion
│   │   ├── proero.js                # Unofficial WhatsApp pairing API routes (proxied)
│   │   ├── sendingService.js        # Core helper: builds template payloads & handles API requests
│   │   └── rcs.js / whatsapp.js     # Messaging endpoints
│   ├── 📂 services/
│   │   ├── queueService.js          # Polling SQL Backup Queue processor
│   │   └── walletService.js         # Transaction-safe wallet balance manager
│   ├── apply_schema_updates.js      # Consolidated MySQL schema patching script
│   └── index.js                     # Server entry point & Socket.io initiator
│
├── 📂 frontend/                     # React (Vite + TypeScript)
│   ├── 📂 src/
│   │   ├── 📂 pages/
│   │   │   ├── Dashboard.tsx        # Analytics graphs & central metrics
│   │   │   ├── Templates.tsx        # Visual template creator + preview phone frame
│   │   │   ├── Campaigns.tsx        # Campaign wizard, variable mapping, schedule options
│   │   │   ├── Chats.tsx            # Live support WebSocket inbox
│   │   │   └── DLTTemplates.tsx     # SMS DLT approvals registry
│   │   └── App.tsx                  # Root Routing configuration
│   └── package.json                 # UI Build configuration
│
├── deploy_production.sh             # Zero-downtime shell deployment script (GitHub Pull -> Build -> PM2)
├── ecosystem.config.js              # PM2 cluster configuration file
└── Partners_API_V3_...json          # Postman collection for testing Meta APIs
```

---

## 🛠️ 5. Deployment & Environment Setup

### Local Run:
1. **Database**: Setup a MySQL instance, create a database named `notifynow_db` (or custom name), and run migration:
   ```bash
   cd backend
   node apply_schema_updates.js
   ```
2. **Environment**: Create `.env` in `backend/` and configure port, DB credentials, Redis connection, and API credentials.
3. **Launch Server**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
4. **Launch Client**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Production Deployment:
The server uses **PM2** to run in cluster mode. To push updates live, execute:
```bash
./deploy_production.sh
```
This script automates:
1. Hard-fetching latest code from branch `main`.
2. Running production node installs.
3. Building frontend production bundle (`/dist`).
4. Injecting secure credentials (CCAvenue, DB, ports) into `.env.production`.
5. Running database schema migrations.
6. Zero-downtime hot reloading of the PM2 process (`notifynow-live-prod`).

---

## ✉️ 6. Email Template for Developer Handover

Below is a professional email template. Replace the bracketed placeholders `[like this]` with your actual details before sending.

```text
Subject: Technical Handover: NotifyNow Multi-Channel Notification Platform

Dear [Developer Name/Team],

I hope this email finds you well. 

As part of our transition, I am handing over the codebase and credentials for the "NotifyNow" platform. This is a multi-channel notification engine (supporting SMS, WhatsApp, RCS, Email, and Voice) built with a React (Vite/TS) frontend and an Express (Node.js) + MySQL backend.

We have prepared a comprehensive handover directory for you. Here are the key details to get you started:

1. Codebase Architecture:
- Frontend: Single Page React App located in the /frontend directory, styled with Tailwind CSS. Production builds are compiled into the /dist directory.
- Backend: RESTful API server located in the /backend directory.
- Queuing: Implements BullMQ + Redis for high-scale campaign queuing (1Cr+ records) with a fallback polling system (queueService.js) built directly on MySQL for local/non-Redis development.
- Database: MySQL database. The primary schema updates are handled via consolidated migration scripts.

2. Access & Repository Details:
- Git Repository URL: [Insert GitHub Repository Link, e.g., https://github.com/username/notifynow.git]
- Active Production Server IP: [Insert Server IP Address]
- Database Host: [Insert Database Host/Port details]
- PM2 Process Name: notifynow-live-prod (running on port 5050)

3. Key Configuration Files:
- Local Config: /backend/.env
- Production Config: /backend/.env.production
- PM2 Configuration: /ecosystem.config.js
- Deployment Automation: /deploy_production.sh (Run this shell script on the server for zero-downtime deployments)

4. API Documentation:
We have included comprehensive Markdown documentation inside the repository:
- API_DOCUMENTATION.md (Covers authentication, contact, and template APIs)
- UNOFFICIAL_WHATSAPP_API_GUIDE.md (Covers unofficial WhatsApp pairing, session sync, and sending via Proero gateway)
- Postman Collection: Partners_API_V3_Postman_Collection.postman_collection.json (available in the root)

Please review the attached "HANDOVER.md" file in the workspace directory. It contains the detailed directory hierarchy, list of database tables, features completed so far, and local environment setup instructions.

Let me know your availability for a brief walkthrough call to address any initial questions you might have.

Best regards,

[Your Name]
[Your Contact Information]
```
