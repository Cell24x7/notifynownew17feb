# NotifyNow Changelog

Detailed record of all technical changes, logic updates, and feature implementations.

## [2026-03-06] - Major Platform Security & Personalization Update

This update focused on financial security (Wallet Enforcement) and message personalization (Dynamic Parameters).

### 🚀 New Features

#### **1. Individual Dynamic Parameters (Personalized Messaging)**
- **Logic**: Enabled sending personalized messages like "Dear [Name]" using CSV data.
- **Backend Changes**:
  - `backend/routes/campaigns.js`: Updated contact upload to store entire CSV rows as JSON in `campaign_queue`.
  - `backend/services/queueService.js`: Implemented a variable replacement engine supporting `[var]` and `{{var}}` formats.
- **Frontend Changes**:
  - `frontend/src/components/campaigns/CampaignCreationStepper.tsx`: Updated variable detection to support square brackets.

#### **2. Robust Wallet Balance Enforcement**
- **Logic**: Prevented campaigns from starting or resuming if the user's wallet balance is less than the estimated cost.
- **Backend Changes**:
  - `backend/services/walletService.js`: Added strict balance checks in `deductCampaignCredits`.
  - `backend/routes/rcs.js` & `backend/routes/campaigns.js`: Added error handling for payment (402) during campaign initiation.
  - `backend/services/queueService.js`: Added background check to stop failed campaigns from draining processing power.
- **Frontend Changes**:
  - `CampaignCreationStepper.tsx`: Added real-time balance validation, pulsing warnings, and a "Recharge Wallet" button.

### 🛠️ Improvements & Fixes
- **Media Validation**: Added pre-upload checks for RCS templates (Dimensions: 1440x448 for rich cards, 1000x1000 for carousels).
- **Environment Support**: Added `API_BASE_URL` support in `backend/routes/bots.js` to allow `ngrok` testing for Dotgo media assets.
- **Git Cleanup**: Updated `.gitignore` to exclude large upload folders and sensitive `.env` files.

---

## [Historical Logs]

### [2026-03-05]
- **Multi-Tenancy**: Audited database routes to ensure users can only see their own data.
- **Bot Submission Fixes**: Resolved Dotgo API validation errors for bot logos.

### [2026-03-04]
- **UI Refinement**: Updated phone preview border with Hotstar-style gradient.
- **Reporting**: Fixed mobile number display in detailed reports.

### [2026-02-13]
- **Initial Upload**: Fresh project structure initialized.

---

> [!TIP]
> This document is maintained manually for major updates to ensure clear communication of technical logic changes.
