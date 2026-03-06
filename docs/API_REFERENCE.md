# NotifyNow API Reference 📡

Base URL: `http://localhost:5000/api` (Local) or `https://your-domain.com/api` (Live)

---

## 🔑 Authentication
All private routes require an Authorization header: `Bearer {TOKEN}`.

### `POST /auth/login`
Authenticates a user and returns a JWT.
- **Request Body**: `{ "email": "user@example.com", "password": "..." }`
- **Response**: `{ "success": true, "token": "...", "user": { ... } }`

---

## 🤖 RCS Bots
Management of Dotgo-based RCS Bots.

### `POST /bots/submit`
Submits initial bot details and media to Dotgo.
- **Request**: `Multipart/form-data` with `creation_data` (JSON), `botLogoFile` (Image), and `bannerFile` (Image).
- **Response**: `{ "success": true, "brand_id": "...", "bot_id": "..." }`

### `POST /bots/verify`
Submits the bot for final verification.
- **Request**: `Multipart/form-data` with `data` (JSON) and verification images.

---

## 📱 Message Templates
Create and manage RCS/SMS message templates.

### `POST /templates`
Creates a new template in the local database.
- **Request Body**: Template type, body, footer, and buttons array.
- **Response**: `{ "success": true, "templateId": "..." }`

### `POST /templates/dotgo/submit`
Submits a template to Dotgo for carrier approval.

---

## 🌀 Campaigns
Sending bulk messages.

### `POST /campaigns`
Creates a new campaign.
- **Request Body**: Name, Channel, Template ID.

### `POST /campaigns/:id/upload-contacts`
Uploads a CSV of recipients.
- **Request**: File upload (CSV).
- **Logic**: Automatically cleans numbers and stores variables for personalization.

---

## 💰 Wallet & Transactions
Manage credits and view payment history.

### `GET /wallet/balance`
Returns the current credit balance of the authenticated user.

### `GET /wallet/transactions`
Returns a paginated list of credit deductions and top-ups.

---

> [!NOTE]
> All timestamps are in UTC and all currency values are represented in local credit units unless otherwise specified.
