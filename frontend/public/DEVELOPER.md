# NotifyNow Developer Documentation 🛠️

## 1. Technical Architecture
NotifyNow is built on a modern **MEN** stack (MySQL, Express, Node) with a **React** (Vite + TS) frontend.

- **Frontend**: Single Page Application (SPA) using React, Tailwind CSS for styling, and Lucide for icons.
- **Backend**: RESTful API using Express.js.
- **Database**: MySQL with a robust relational schema for multi-tenancy.
- **Messaging**: Integrated with Dotgo APIs for RCS and custom gateways for SMS.

## 2. Multi-Tenancy Logic
Data isolation is handled at the database level using a `user_id` column in almost every table (`campaigns`, `message_templates`, `rcs_configs`, etc.).
- **Isolation**: Every API request is authenticated via JWT. The `userId` is extracted and used in every SQL query to ensure users only access their own data.
- **Roles**:
  - `admin`: Full access to system configs and aggregated reports.
  - `reseller`: Can manage their own clients and credits.
  - `client`: End-user capable of sending campaigns.

## 3. Campaign & Queue System
For performance, NotifyNow uses a background queue processor.
1. **Creation**: When a campaign is created, its recipients are added to the `campaign_queue` table with a `pending` status.
2. **Processor**: The `queueService.js` runs in the background. It periodically checks for pending items, deducts credits, and prepares messages.
3. **Dynamic Parameters**: 
   - Row data from CSVs is stored in the `variables` column of `campaign_queue`.
   - The engine uses a regex-based replacement to swap placeholders (e.g., `[name]`) with real values just milliseconds before the API call.

## 4. Wallet & Credit Logic
Credits are the currency of NotifyNow.
- **Deduction**: Credits are deducted *per recipient* during processing.
- **Locking**: If a user's balance hits zero during a campaign, the queue processor marks the campaign as `failed` to prevent credit debt.
- **Balance Update**: User balances are updated atomically in the `users` table.

## 5. Setup & Development
1. **Server**: `npm start` (Backend on port 5000).
2. **Frontend**: `npm run dev` (Frontend on port 5173).
3. **Database**: Migration scripts are available in the root to update schema (`migrate_variables.js`, etc.).

## 6. Smart Failover System 📲
NotifyNow features an automated fallback engine for high-criticality messages (like OTPs).
1.  **Triggers:** Failover can be triggered by:
    - `API Rejection`: Instant failure during the provider request.
    - `Webhook Status`: When Meta or Dotgo returns a `failed` or `undelivered` status later.
2.  **Idempotency (Double-Send Prevention):**
    - To prevent duplicate SMS sends, the engine uses a `failover_triggered` flag in the log table.
    - An atomic SQL update (`UPDATE ... SET failover_triggered=1 WHERE id=? AND failover_triggered=0`) acts as a lock.
3.  **UI Feedback:** Failover messages are logged with a specific `failure_reason` (e.g., `Failover from WHATSAPP`), which the frontend uses to display the `⚡ Fallback` badge.

---

> [!IMPORTANT]
> Always ensure `API_BASE_URL` in `.env` matches your environment (Local/Ngrok/Live) to ensure Dotgo can fetch your media assets.
