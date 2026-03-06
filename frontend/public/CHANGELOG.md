# NotifyNow Project History & Changelog

A detailed and transparent record of all technical updates, logic changes, and file modifications.

---

## [2026-03-06] - Platform Security, Personalization & Docs Consolidation
**Focus**: Visual Overhaul, File Management, and Data Isolation.

### 🚀 Major Logic Updates
- **Documentation Refactoring**: Consolidated all documentation into `frontend/public/` to establish a single source of truth and fix 404 errors.
- **Environment Detection**: Wrote custom logic in `docs.html` to auto-detect port 8080 (Vite) vs port 5000 (Node) for seamless file fetching.
- **Dynamic Parameters**: Enhanced `queueService.js` to support `[var]` replacement for personalized campaigns.

### 📂 File Changes
- **Modified**: `frontend/public/docs.html`, `backend/index.js`, `backend/services/queueService.js`
- **New**: `frontend/public/API_REFERENCE.md`, `frontend/public/USER_GUIDE.md`
- **Consolidated**: Moved all `.md` files from `docs/` subfolder to root `public/` folder.

---

## [2026-03-05] - Bot Validation & Multi-Tenancy
**Focus**: Strengthening backend security and carrier compliance.

### 🚀 Major Logic Updates
- **User Isolation**: Implemented `user_id` filtering in `backend/routes/reports.js` and `webhooks.js` to prevent data leaking between accounts.
- **Carrier Compliance**: Fixed Dotgo logo submission logic in `backend/routes/bots.js` to handle strict Base64 requirements.

### 📂 File Changes
- **Modified**: `backend/routes/campaigns.js`, `backend/routes/bots.js`, `frontend/src/pages/Reports.tsx`

---

## [2026-03-04] - UI Refinement & Real-time Tracking
**Focus**: Improving the User Experience (UX) and data visualization.

### 🚀 Major Logic Updates
- **Visual Polish**: Added Hotstar-style gradient borders to the phone preview components.
- **Real-time Status**: Fixed webhook reception logic in `backend/index.js` to update existing database rows instead of creating duplicates.

### 📂 File Changes
- **Modified**: `frontend/src/components/PhonePreview.tsx`, `backend/models/webhookLogs.js`

---

## [2026-02-13] - Project Initialization
**Focus**: Structural foundation.

- Initialized NotifyNow multi-channel platform (SMS, RCS, Email).
- Setup primary database schemas for Auth and Campaigns.

---

> [!NOTE]
> This history is maintained for full visibility into the project's evolution. Logic and file details are verified against git commit records.
