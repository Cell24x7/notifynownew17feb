# API Reference for Clients

This guide details the API endpoints available for developers to integrate with the NotifyNow platform.

## 🔑 Authentication

All API requests must include a JWT token in the `Authorization` header.

**Header Example:**
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 📱 SMS API

### Send a Single SMS
Send a message to a single recipient.

**Endpoint:** `POST /api/sms/send`  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "mobile": "919876543210",
  "message": "Hello, this is a test message from NotifyNow!",
  "senderId": "NOTIFY"
}
```

**Response:**
```json
{
  "success": true,
  "message": "SMS sent successfully",
  "messageId": "sms_123456"
}
```

---

## 🌀 RCS API

### Send RCS Campaign
Send a rich message campaign to multiple contacts.

**Endpoint:** `POST /api/rcs/send-campaign`  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "campaignName": "Spring Sale",
  "templateName": "promotion_template_v1",
  "contacts": ["919876543210", "919876543211"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Campaign processing started",
  "campaignId": "CAMP_1700000000"
}
```

---

## 💰 Wallet API

### Get Wallet Balance
Check your current credit balance.

**Endpoint:** `GET /api/wallet/balance`

**Response:**
```json
{
  "success": true,
  "balance": 500.25
}
```

---

## ⚠️ Error Codes

| Status | Code | Description |
| :--- | :--- | :--- |
| 401 | `Unauthorized` | Invalid or missing token |
| 403 | `Forbidden` | Access denied to resource |
| 400 | `Bad Request` | Missing required fields or invalid format |
| 500 | `Server Error` | Internal platform issue |
