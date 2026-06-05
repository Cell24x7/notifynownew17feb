# 🚀 NotifyNow | Production Report & Workflow Framework

This document defines the **Standard Operating Procedure (SOP)** for handling any task from start to production, estimating timelines, coordinating with the team, and maintaining daily, weekly, and monthly tracking reports. It also details the **Current Production Status** of NotifyNow and future roadmap changes.

---

## 📋 1. End-to-End Task Flow & Estimation Blueprint
When a new feature request or bug report is received, the team must follow this **6-Phase Lifecycle** to estimate, code, test, deploy, and verify.

### Phase 1: Ingestion & Analysis (Scope Assessment)
* **What to do**: Analyze the requirement, check impacts on database schemas, and identify affected channels (SMS, WhatsApp, RCS, Email, Voice).
* **Estimation Rule**: Usually takes **10% of total task time**.
* **Key Checklist**:
  * Does this task require a new database table or column? (e.g., `ALTER TABLE` / new migration scripts).
  * Which external APIs are involved? (e.g., Meta Cloud API, Dotgo RCS, SMS Gateway, CCAvenue).
  * Does it affect the wallet deduction or billing logic?

### Phase 2: Technical Estimation & Feasibility Check
* **What to do**: Before starting, break the task into components (Backend Routes, Frontend UI, Database, Queues) and calculate the timeline.
* **Estimation Formula (Buffer included)**: 
  $$\text{Total Time} = (\text{Research} + \text{Backend Dev} + \text{Frontend Dev} + \text{Testing}) \times 1.3 \text{ (Buffer for API issues/bugs)}$$
* **How to propose to the Client/Team**:
  * Use the **Estimation Template** (provided in Section 3) to state: *Complexity Level, Expected Delivery Date, Dev Hours, Database Impact, and Risk Level*.

### Phase 3: Development & Local Testing
* **What to do**: Write code following repository patterns, create migration files if needed, and run local testing.
* **Estimation Rule**: Usually takes **40% of total task time**.
* **Key Rules**:
  * **No Hardcoded Secrets**: All keys must go into `.env` (Local) and `.env.production` (Prod).
  * **Database Safety**: Never run direct queries on prod database. Always create a schema patch script (e.g., in `backend/scripts/` or `apply_schema_updates.js`).
  * **Queues**: If bulk processing is involved, use BullMQ instead of plain loops.

### Phase 4: Staging Testing & Code Review
* **What to do**: Deploy to staging server, run integration tests (e.g., sending test SMS/WhatsApp/RCS, simulating webhook responses), and review code.
* **Estimation Rule**: Usually takes **20% of total task time**.
* **Checklist**:
  * Test with positive and negative inputs (e.g., what if the wallet is 0? What if the mobile number is invalid?).
  * Check callback logs in database to ensure status updates (delivered/failed) are captured correctly.

### Phase 5: Production Deployment
* **What to do**: Run the automated deployment script `deploy_production.sh`.
* **Estimation Rule**: Usually takes **10% of total task time**.
* **Deployment Flow**:
  1. Pull latest code from `main` branch.
  2. Smart npm install (updates only if `package-lock.json` has changed).
  3. Run database migrations in parallel batches.
  4. Build frontend bundle (`npm run build`).
  5. Reload backend process using **PM2** cluster mode (Zero-downtime).
  6. Execute background health check.

### Phase 6: Post-Deployment Verification & Handback
* **What to do**: Verify the live site, run a smoke test in production, confirm logs, and mark the task as complete.
* **Estimation Rule**: Usually takes **10% of total task time**.

---

## ⚡ 2. Real-World Task Scenario Example
**Task**: *"Add a new SMS Provider Gateway (e.g., RouteMobile API) as a fallback."*

### Task Breakdown & Timeline Calculation:
1. **Research & DB Schema Update (4 Hours)**:
   * Researching RouteMobile API documentation.
   * Adding provider details to config/databases (`ALTER TABLE sms_gateways...`).
2. **Backend Development (8 Hours)**:
   * Integrating HTTP request payload build logic in `smsService.js` or `sendingService.js`.
   * Handling RouteMobile delivery status webhook endpoint.
3. **Frontend UI Update (4 Hours)**:
   * Adding RouteMobile selection options in the Reseller/Admin gateway panel.
4. **Testing (Staging/Sandbox) (4 Hours)**:
   * Sending test SMS campaigns and verifying delivery callback logs.
5. **Production Deployment & Verification (2 Hours)**:
   * Deploying via `deploy_production.sh` and sending a live test message.

* **Total Raw Hours**: 22 Hours
* **Total Estimated Timeline (with 30% Buffer)**: ~28.6 Hours (3-4 Working Days).

---

## 📊 3. Task Estimation Template (For Sharing with Team/Client)
Use this template whenever a new task is assigned to estimate time and effort:

```markdown
### 📋 Task Estimation & Flow Sheet

*   **Task Name**: [Name of the Task]
*   **Assigned To**: [Developer Name]
*   **Task Complexity**: [Low / Medium / High]
*   **Database Schema Changes**: [Yes/No] (If yes, specify table names)
*   **External APIs Affected**: [e.g., Meta WA API, SMTP, CCAvenue]

#### ⏱️ Timeline Estimation (Breakdown):
| Phase | Scope of Work | Estimated Hours |
| :--- | :--- | :--- |
| **Phase 1 & 2** | Requirements Analysis & DB Design | X Hours |
| **Phase 3** | Backend Logic & Integration Dev | Y Hours |
| **Phase 3** | Frontend Component & UI Dev | Z Hours |
| **Phase 4** | Sandbox Testing & Code Review | A Hours |
| **Phase 5 & 6** | Deployment & Live Smoke Verification | B Hours |
| **Total** | **Raw Estimate + 30% Buffer** | **Total Hours / Days** |

#### 🔄 Expected Execution Flow:
1. Setup DB Schema locally by running migration scripts.
2. Build backend route `[route_path]` and verify using Postman.
3. Integrate frontend views inside `frontend/src/pages/[page].tsx`.
4. Deploy to Staging and verify with test credentials.
5. Production release using `deploy_production.sh`.

#### ⚠️ Risks & Dependencies:
* [e.g., API documentation from vendor is pending, DLT approval is required for SMS templates, etc.]
```

---

## 📈 4. Daily, Weekly, and Monthly Reporting Framework
To ensure full tracking of production issues, system health, and development progress, the following reporting templates must be used:

### A. Daily Status Update (DSU) — *Post in Chat/Sync*
Every developer/QA must share this report at the end of the day:
```markdown
## 📅 Daily Production & Dev Update (Date: YYYY-MM-DD)

### ✅ Done Today:
*   [Task #1]: Finished RouteMobile API integration and tested callbacks on staging.
*   [Task #2]: Fixed template placeholder regex issue on smsApiV1.js (Line 267).

### ⏳ In Progress:
*   [Task #3]: Building gateway selection screen on Frontend (Admin Panel).

### 🛑 Impediments / Blockers:
*   [None / Waiting for client credentials for CCAvenue staging testing].

### 💻 Production System Health Check:
*   **PM2 Status**: Online (`notifynow-live-prod` active, Memory: ~120MB, CPU: <5%)
*   **Errors in Logs**: Checked pm2 logs. No fatal/crash logs reported today.
*   **Database Migrations**: No pending migrations on production.
```

### B. Weekly Progress Report (WPR) — *Share every Friday*
This provides a roll-up of dev progress, campaign deliveries, and wallet transactions.
```markdown
## 🚀 Weekly Production & Release Summary (Week: [Start Date] to [End Date])

### 🌟 Features Deployed to Production:
1.  **Failover Router v2.0**: WhatsApp-to-SMS failover with automatic idempotency locking.
2.  **Voicebot Integration**: Added text-to-speech audio gateway infrastructure.

### 🐛 Production Bugs Resolved:
*   Fixed Emoji character truncation issue in SMS gateway payload.
*   Fixed precision loss in wallet pricing calculations.

### 📊 Production System Statistics:
*   **Total Messages Dispatched (This Week)**: X,XXX,XXX (SMS: X%, WhatsApp: Y%, RCS: Z%)
*   **Successful Deliveries**: X%
*   **Wallet Transactions Logs**: Reconciled and balanced. Total credits deducted: ₹X,XXX.XX.

### 📅 Planned Tasks for Next Week:
*   [Next Feature Name / Optimization]
*   [Staging review of CCAvenue payment flow]
```

### C. Monthly Production Audit (MPR) — *Review on the 1st of every Month*
A high-level report to check database optimization, server memory, vendor payments, and platform usage.
```markdown
## 🏢 Monthly NotifyNow Production Audit (Month: [Month, Year])

### 🖥️ Server & Database Audit:
*   **CPU/Memory Average**: CPU ~15%, RAM usage ~70% (2GB of 4GB utilized).
*   **Database Size**: SQL Database size is Z GB.
*   **Index Optimization**: Executed `turbo_speed_optimize.js` to ensure fast queries on messaging logs.
*   **Redis Queue Status**: BullMQ processed X Million jobs; 0 stuck jobs currently in queue.

### 💰 Wallet Ledger & Reconciliation:
*   **Total Credits Recharged by Resellers**: ₹X,XX,XXX.XX
*   **Total Credits Consumed by Clients**: ₹Y,YY,YYY.YY
*   **Discrepancies**: 0 (Wallet balance matches ledger logs exactly).

### ⚙️ Gateway & Webhook Performance:
*   **Meta WhatsApp API Success Rate**: Z%
*   **SMS Gateway API Latency**: Average callback latency is ~W ms.
*   **Unofficial WhatsApp Session Stability (Proero)**: QR codes active, sessions auto-reconnected successfully.
```

---

## 🛠️ 5. Current State of NotifyNow Production App
This section summarizes what is currently implemented, active, and live in production:

### 1. Core Architecture & Tech Stack:
*   **Backend (Node.js/Express)**: Running in cluster mode under **PM2** on Port **5050**. Live API URL: `https://notifynow.in/api`.
*   **Frontend (React/TypeScript/TailwindCSS)**: Production build compiles to `/frontend/dist` and is served statically.
*   **Database (MySQL)**: relational database storing user roles, API logs, wallet ledger, templates, and campaign details.
*   **Queues (Redis + BullMQ)**: Campaigns are processed asynchronously via BullMQ workers. If Redis is offline, a backup SQL polling queue (`queueService.js`) takes over.

### 2. Channels Deployed:
*   **SMS**: Custom gateway router with automated DLT template matching.
*   **WhatsApp (Official)**: Meta Cloud API integrated through the Pinbot portal.
*   **WhatsApp (Unofficial)**: Proero gateway integration with QR code pairing and live webhook syncing.
*   **RCS (Rich Communication Services)**: Multi-provider support via Dotgo API.
*   **Email**: Nodemailer SMTP integration for alerts and updates.
*   **Voicebot**: Infrastructure for text-to-speech audio calls.

### 3. Active Features:
*   **Template Mockup Panel**: Visual builder for SMS/WA/RCS templates with phone preview.
*   **Variable CSV Ingestion**: Fuzzy matching of CSV columns to template placeholders.
*   **Intelligent Failover**: WhatsApp/RCS to SMS fallback with Redis lock safety.
*   **Live WebSocket Inbox**: Support system syncing incoming messages.
*   **Wallet Manager**: Relational billing ledger with transaction safety locks.

---

## 🔮 6. Planned Future Roadmap Changes
These are the planned items to address in upcoming development sprints:
1.  **Automated Chatflow UI Nodes**: Enhancing the drag-and-drop node workspace for complex automation paths.
2.  **Payment Gateway Expansion**: Integrating more local UPI payment options alongside CCAvenue.
3.  **Detailed Click Analytics**: Tracking CTAs (Call-to-Action) inside RCS and WhatsApp messages to generate CTR reports.
4.  **Advanced DB Archiving**: Archiving old campaign logs (older than 90 days) into cold storage to maintain high database speed.
