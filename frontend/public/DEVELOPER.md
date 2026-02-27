# NotifyNow Developer Documentation

Welcome to the **NotifyNow** developer documentation. This guide provides a deep dive into the system architecture, module structure, API reference, and configuration for the NotifyNow platform.

---

## 1. Project Overview & Tech Stack

NotifyNow is a multi-channel notification platform supporting **SMS**, **RCS**, and potentially other channels. It features a robust multi-tenant architecture with roles for Admins, Resellers, and Clients.

### Core Tech Stack
- **Frontend**: React (Vite, TypeScript, Tailwind CSS, Lucide React)
- **Backend**: Node.js (Express)
- **Database**: MySQL (using `mysql2` with Connection Pooling)
- **Authentication**: JWT (JSON Web Tokens)
- **Job Processing**: Internal Queue Service (for bulk campaigns)

---

## 2. System Architecture

The project follows a decoupled Frontend-Backend architecture.

### [Frontend](file:///c:/SandeepYadav/NotifyProject/notifynownew17feb/frontend)
Located in the `/frontend` directory. Built with Vite and TypeScript for a fast, type-safe development experience.
- **Pages**: Defined in `src/pages/`, each representing a major functional area.
- **Services**: Located in `src/services/`, handling all API communication (e.g., `smsApi.ts`, `rcsApi.ts`).
- **Components**: Modular UI elements in `src/components/`, including complex dashboard widgets and form elements.

### [Backend](file:///c:/SandeepYadav/NotifyProject/notifynownew17feb/backend)
Located in the `/backend` directory. An Express-based REST API.
- **Entry Point**: `index.js` - Bootstraps the server, configures CORS, mounts routes, and starts the queue processor.
- **Routes**: Located in `routes/`. Each file corresponds to a specific module (e.g., `campaigns.js`, `wallet.js`).
- **Database**: Managed via `config/db.js` using a connection pool for efficiency.
- **Services**: Background logic in `services/` (e.g., `queueService.js` for campaign processing).

---

## 3. Module Deep Dive

### 🔑 Authentication (`/api/auth`)
- **JWT-based**: Uses `jsonwebtoken` for stateless authentication.
- **Roles**: Managed via user profile data.
- **Routes**: Login, Profile management, Password reset.

### 📱 SMS Module (`/api/sms`)
- Integrates with external SMS gateways.
- Supports single and bulk messaging.
- **Configuration**: Gateway credentials stored in `.env`.

### 🌀 RCS Module (`/api/rcs`, `/api/rcs-configs`)
- Rich Communication Services support via DotGo.
- **Features**: Template management, Config management, RCS Campaigns.
- **RCS Configs**: Dedicated endpoints for managing various RCS service profiles.

### 📅 Campaign Management (`/api/campaigns`)
- Central hub for creating and tracking multi-channel campaigns.
- **Queueing**: Campaigns are added to a queue (`campaign_queue` table) and processed background by `runQueue()` in `index.js`.

### 💰 Wallet & Plans (`/api/wallet`, `/api/plans`)
- Credits management for users/clients.
- Subscription plan definitions and assignments.
- Financial logs for all transactions.

---

## 4. API Reference (Key Endpoints)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate user and return JWT |
| `POST` | `/api/sms/send` | Send a single SMS |
| `POST` | `/api/campaigns/create` | Create a new campaign (SMS/RCS) |
| `GET` | `/api/reports/summary` | Fetch campaign performance statistics |
| `GET` | `/api/wallet/balance` | Check current credit balance |

---

## 5. Configuration Guide

### Backend `.env` Variables
- `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`: MySQL connection details.
- `JWT_SECRET`: Secret key for signing tokens.
- `SMS_USER`, `SMS_PASSWORD`: Gateway credentials.
- `DOTGO_ADMIN_CLIENT_ID`: RCS provider credentials.

### Frontend
- API base URL usually points to `http://localhost:5000/api` in development.

---

## 6. Development & Deployment

### Installation
1. **Database**: Import the MySQL schema into `notifynow_db`.
2. **Backend**: `cd backend && npm install`
3. **Frontend**: `cd frontend && npm install`

### Running Locally
- **Backend**: `npm start` (from backend dir)
- **Frontend**: `npm run dev` (from frontend dir)

### Deployment
- The backend `index.js` is configured to serve the frontend production build from `frontend/dist` if it exists.
- Run `npm run build` in the frontend directory before deploying.
