# NotifyNow | Multi-Channel Developer API Documentation (v1.5)

Welcome to the NotifyNow Developer Portal. This documentation covers all programmatic interfaces for RCS, SMS, WhatsApp, and Webhooks.

---

## 🔐 General Authentication
Most endpoints require your **API Username** and **API Password** (Legacy) or an **API Key**.

- **API Credentials:** Found in your **Profile Settings**.
- **Base URL:** `https://notifynow.in` (unless otherwise specified).

---

## 📱 RCS (Rich Communication Services)
Powered by Dotgo, providing a rich, interactive experience.

### 1. Create RCS Template (API)
**Endpoint:** `POST /api/rcs/templates/create`

**Request Example:**
```json
{
    "username": "demo@gmail.com",
    "password": "your_api_password",
    "name": "promo_campaign_v1",
    "type": "text_message",
    "body": "Hello! Get 20% off on your first order. Use code: SAVE20",
    "suggestions": [
        {
            "type": "reply",
            "displayText": "Interested",
            "postback": "opt_in"
        },
        {
            "type": "url_action",
            "displayText": "Shop Now",
            "url": "https://notifynow.in"
        }
    ]
}
```

### 2. Send RCS Template (POST)
**Endpoint:** `POST /api/rcs/send`

**Request Example:**
```json
{
    "username": "demo@gmail.com",
    "password": "your_api_password",
    "to": "919000000000",
    "templateName": "registration_otp",
    "params": ["123456"]
}
```

### 3. Send RCS Message (GET)
**Endpoint:** `GET /api/rcs/send?username=...&password=...&to=...&templateName=...`

---

## 💬 SMS (Short Message Service)
Compliant with TRAI/DLT regulations for India.

### 1. Send SMS (API v1)
**Endpoint:** `POST /api/sms-v1/send`
**Headers:** `x-api-key: YOUR_API_KEY` (Recommended)

**Request Example:**
```json
{
    "to": "919000000000",
    "message": "Your OTP for NotifyNow is 9988. Do not share this with anyone.",
    "templateId": "120716172839405",
    "peId": "140156273849506"
}
```
*Note: Our system supports auto-detection of DLT templates based on message content.*

---

## 🟢 WhatsApp (Business API)
Universal API for Meta Graph and Pinbot Providers.

### 1. Send Direct Template
**Endpoint:** `POST /api/whatsapp/api/send-single`

**Request Example:**
```json
{
    "username": "demo@gmail.com",
    "password": "your_api_password",
    "to": "919000000000",
    "templateName": "hello_world",
    "variables": {
        "1": "John Doe",
        "2": "NotifyNow"
    }
}
```

### 2. Send Bulk Campaign (API)
**Endpoint:** `POST /api/whatsapp/api/send-bulk`
*Accepts an array of numbers and handles credit calculation automatically.*

---

## ⚙️ Webhooks & Status Updates
Configure your callback URL in **Settings > API & Webhooks** to receive real-time delivery reports.

**Delivery Report Payload:**
```json
{
    "messageId": "msg_987654321",
    "status": "delivered", // sent, delivered, read, failed
    "timestamp": "2026-04-11T02:00:00Z",
    "to": "919000000000",
    "channel": "RCS"
}
```

---

## 🚦 Status Codes & Troubleshooting
| Code | Description | Solution |
|------|-------------|----------|
| 200  | Success | Request processed |
| 400  | Missing Fields | Check required keys (to, username, etc) |
| 401  | Unauthorized | Verify API password or API Key |
| 402  | Payment Required | Recharge your wallet |
| 500  | Server Error | Contact support@notifynow.in |

---
**NotifyNow Support**
Website: [https://notifynow.in](https://notifynow.in)
Documentation: [https://notifynow.in/docs.html](https://notifynow.in/docs.html)
