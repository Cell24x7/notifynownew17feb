# Unofficial WhatsApp Developer API Reference Guide (v1)

Welcome to the **NotifyNow Unofficial WhatsApp Developer API (v1)**. This API allows developer clients to programmatically manage WhatsApp channels, pair devices using QR codes, dispatch bulk or single messages, and query real-time delivery status/logs.

---

## 🔒 Authentication

The API supports two authentication methods. You can choose either:

1. **API Key Header**: Include `x-api-key` in your request headers.
2. **Body/Query Parameters**: Pass your registered dashboard email/phone as `username` and your developer API password as `password` (or `pwd`).

---

## 🛠️ Channels Management API

### 1. List Channels
Retrieve all registered channels, phone numbers, and active pairing statuses (`connected` or `disconnected`).

* **Endpoint**: `GET /api/wa-unofficial-v1/channels`
* **Authentication**: Pass credentials via URL query parameters.
* **cURL Example**:
  ```bash
  curl -X GET "https://notifynow.in/api/wa-unofficial-v1/channels?username=YOUR_EMAIL&password=YOUR_API_PASSWORD"
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "channels": [
      {
        "id": 3,
        "name": "Primary Sales Channel",
        "phone_number": "919876839965",
        "provider": "Proero",
        "status": "connected",
        "created": "2026-05-19T10:45:00.000Z"
      }
    ]
  }
  ```

---

### 2. Create Channel
Register a new WhatsApp channel slot in the system before pairing.

* **Endpoint**: `POST /api/wa-unofficial-v1/channels/create`
* **Headers**: `Content-Type: application/json`
* **cURL Example**:
  ```bash
  curl -X POST "https://notifynow.in/api/wa-unofficial-v1/channels/create" \
       -H "Content-Type: application/json" \
       -d '{
         "username": "YOUR_EMAIL",
         "password": "YOUR_API_PASSWORD",
         "name": "Support Desk Channel"
       }'
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Channel created successfully",
    "channelId": 5,
    "name": "Support Desk Channel",
    "provider": "Proero"
  }
  ```

---

### 3. Connect Channel & Fetch QR Code
Generate a session and fetch the raw QR code to scan. Connect your phone using WhatsApp Web.

* **Endpoint**: `POST /api/wa-unofficial-v1/channels/:channelId/connect`
* **Headers**: `Content-Type: application/json`
* **cURL Example** (for Channel ID `3`):
  ```bash
  curl -X POST "https://notifynow.in/api/wa-unofficial-v1/channels/3/connect" \
       -H "Content-Type: application/json" \
       -d '{
         "username": "YOUR_EMAIL",
         "password": "YOUR_API_PASSWORD"
       }'
  ```
* **Response (Needs Scan)**:
  ```json
  {
    "success": true,
    "message": "QR Code generated successfully. Scan using your WhatsApp device.",
    "qr": "2@41gJvT5S...[Base64/Raw String]",
    "connected": false
  }
  ```
* **Response (Already Paired)**:
  ```json
  {
    "success": true,
    "message": "Session already connected",
    "connected": true
  }
  ```

---

### 4. Sync Session Status
Manually synchronize local database status with the live WhatsApp engine.

* **Endpoint**: `POST /api/wa-unofficial-v1/channels/:channelId/sync`
* **cURL Example**:
  ```bash
  curl -X POST "https://notifynow.in/api/wa-unofficial-v1/channels/3/sync" \
       -H "Content-Type: application/json" \
       -d '{
         "username": "YOUR_EMAIL",
         "password": "YOUR_API_PASSWORD"
       }'
  ```
* **Success Response**:
  ```json
  {
    "success": true,
    "message": "Channel status synchronized",
    "status": "connected",
    "phone_number": "919876839965"
  }
  ```

---

### 5. Disconnect/Log Out Channel
Disconnect the WhatsApp session and unpair the device.

* **Endpoint**: `POST /api/wa-unofficial-v1/channels/:channelId/disconnect`
* **cURL Example**:
  ```bash
  curl -X POST "https://notifynow.in/api/wa-unofficial-v1/channels/3/disconnect" \
       -H "Content-Type: application/json" \
       -d '{
         "username": "YOUR_EMAIL",
         "password": "YOUR_API_PASSWORD"
       }'
  ```
* **Success Response**:
  ```json
  {
    "success": true,
    "message": "Channel disconnected successfully."
  }
  ```

---

### 6. Delete Channel
Deletes the channel profile from the dashboard database.

* **Endpoint**: `DELETE /api/wa-unofficial-v1/channels/:channelId`
* **cURL Example**:
  ```bash
  curl -X DELETE "https://notifynow.in/api/wa-unofficial-v1/channels/3?username=YOUR_EMAIL&password=YOUR_API_PASSWORD"
  ```
* **Success Response**:
  ```json
  {
    "success": true,
    "message": "Channel deleted successfully."
  }
  ```

---

## 💬 Message Dispatch API

### 1. Send Message (Single or Bulk)
Trigger text dispatch through a connected channel to one or more mobile numbers.

* **Endpoint**: `POST /api/wa-unofficial-v1/send`
* **Headers**: `Content-Type: application/json`
* **Body Fields**:
  * `channelId` (Integer): The ID of your connected channel.
  * `to` (String): Comma-separated mobile numbers with country code (e.g. `919876839965` or `919876839965,918888888888`).
  * `message` (String): The text message content.
* **cURL Example**:
  ```bash
  curl -X POST "https://notifynow.in/api/wa-unofficial-v1/send" \
       -H "Content-Type: application/json" \
       -d '{
         "username": "YOUR_EMAIL",
         "password": "YOUR_API_PASSWORD",
         "channelId": 3,
         "to": "919876839965",
         "message": "Hello! This is a test message from Unofficial WhatsApp Developer API."
       }'
  ```
* **Success Response**:
  ```json
  {
    "success": true,
    "message": "WhatsApp message dispatch initiated successfully.",
    "campaignId": 1931947042,
    "recipientCount": 1,
    "channelUsed": "Primary Sales Channel",
    "providerResponse": {
      "success": true,
      "message": "Campaign started",
      "campaignId": 1931947042,
      "templateId": null,
      "contactCount": 1,
      "statusCheckUrl": "/api/campaign/1931947042/status"
    }
  }
  ```

---

## 📊 Reports & Logs API

### 1. Query Campaign Dispatch Status
Fetch the macro progress counters for a sent campaign.

* **Endpoint**: `GET /api/wa-unofficial-v1/campaigns/:campaignId/status`
* **cURL Example**:
  ```bash
  curl -X GET "https://notifynow.in/api/wa-unofficial-v1/campaigns/1931947042/status?username=YOUR_EMAIL&password=YOUR_API_PASSWORD"
  ```
* **Success Response**:
  ```json
  {
    "success": true,
    "data": {
      "campaignId": "1931947042",
      "pending": 0,
      "sent": 1,
      "failed": 0,
      "in_progress": 0
    },
    "completionPercentage": 100
  }
  ```

---

### 2. Get Detailed Recipient Logs
Retrieve the exact list of recipient numbers, message body, sending timestamps, and individual status for a campaign.

* **Endpoint**: `GET /api/wa-unofficial-v1/campaigns/:campaignId/logs`
* **cURL Example**:
  ```bash
  curl -X GET "https://notifynow.in/api/wa-unofficial-v1/campaigns/1931947042/logs?username=YOUR_EMAIL&password=YOUR_API_PASSWORD"
  ```
* **Success Response**:
  ```json
  {
    "success": true,
    "campaignId": "1931947042",
    "total": 1,
    "logs": [
      {
        "id": 4820,
        "recipient": "919876839965",
        "status": "sent",
        "message_content": "Hello! This is a test message from Unofficial WhatsApp Developer API.",
        "send_time": "2026-05-19T10:48:32.000Z",
        "delivery_time": null
      }
    ]
  }
  ```
