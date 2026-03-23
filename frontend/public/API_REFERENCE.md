# NotifyNow API Reference 📡

Base URL: `http://localhost:5000/api` (Local) or `https://notifynow.in/api` (Live)

---

## 🔑 Authentication
All developer APIs use your email as `username` and your specialized **API Password** (found in your Profile settings) for basic authentication within the JSON body.

---

## 🟢 WhatsApp API
High-performance WhatsApp Business API integration.

### `POST /whatsapp/api/send-bulk`
Send personalized bulk WhatsApp messages with dynamic variables and optional media.
- **Request Body**: 
```json
{
  "username": "user@example.com",
  "password": "your_api_password",
  "templateName": "promo_v1",
  "campaignName": "Spring Sale",
  "numbers": [
    {
      "to": "919004207813",
      "variables": { "1": "Sandeep", "2": "SALE50" },
      "mediaUrl": "https://assets.site.com/promo.png"
    }
  ]
}
```

### `POST /whatsapp/api/send-single`
Instant dispatch for transactional WhatsApp alerts (OTPs, notifications).
- **Request Body**:
```json
{
  "username": "user@example.com",
  "password": "your_api_password",
  "to": "919004207813",
  "templateName": "transactional_otp",
  "variables": { "1": "992105" }
}
```

---

## 🟠 SMS API v1
Direct carrier-grade SMS routing.

### `POST /sms-v1/send-bulk`
Bulk personalized SMS campaigns.
- **Request Body**:
```json
{
  "username": "user@example.com",
  "password": "your_api_password",
  "templateId": "DLT_12345",
  "campaignName": "Notification Burst",
  "numbers": [
    {
      "to": "919004207813",
      "variables": ["Sandeep", "Order #123"]
    }
  ]
}
```

### `POST /sms-v1/send-single`
Instant SMS dispatch.
- **Request Body**: `{ "username": "...", "password": "...", "to": "...", "templateId": "...", "variables": ["..."] }`

---

## 🔵 RCS API
Rich Communication Services with images and carousels.

### `POST /rcs/api/send-bulk`
Bulk RCS campaign for Android users.
- **Request Body**:
```json
{
  "username": "user@example.com",
  "password": "your_api_password",
  "templateName": "rcs_welcome",
  "campaignName": "RCS Onboarding",
  "numbers": ["919004207813", "919876543210"]
}
```

### `POST /rcs/api/send-single`
Single peer-to-peer RCS message.
- **Request Body**:
```json
{
  "username": "user@example.com",
  "password": "your_api_password",
  "to": "919004207813",
  "templateName": "rcs_alert",
  "params": ["Urgent Update"]
}
```

---

## 🤖 RCS Bot Onboarding
Management of Dotgo-based RCS Bots.

### `POST /bots/submit`
Submits initial bot details to Dotgo.
- **Request**: `Multipart/form-data` with `creation_data`, `botLogoFile`, and `bannerFile`.

---

> [!NOTE]
> All timestamps are in UTC. Credits are deducted automatically based on your current plan pricing.
