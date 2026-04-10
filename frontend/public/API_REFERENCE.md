# NotifyNow | API Reference (v1.2)

Welcome to the NotifyNow Developer API. Our API allows you to programmatically send messages via RCS, SMS, and WhatsApp, as well as manage templates.

---

## Authentication
All API requests require a **Username** and **API Password** (Legacy support) or an **API Key**.
For the current version, please use the following in your JSON body:
- `username`: Your registered email.
- `password`: Your unique API Password (set in Profile Settings).

---

## RCS Messaging

### 1. Send RCS Message
Send a message using a pre-approved RCS template.

**Endpoint:** `POST /api/rcs/send`

**Request Body:**
```json
{
    "username": "developer@example.com",
    "password": "your_api_password",
    "to": "919876543210",
    "templateName": "registration_otp",
    "params": ["123456"]
}
```

**Parameters:**
- `to`: Recipient phone number with country code (e.g., 91 for India).
- `templateName`: The technical name of the template.
- `params`: Array of strings for variables in the template (e.g., `{{1}}`, `{{2}}`).

---

### 2. Create RCS Template (Beta)
Programmatically create and submit RCS templates for approval.

**Endpoint:** `POST /api/rcs/templates/create`

**Request Body (Text Message):**
```json
{
    "username": "developer@example.com",
    "password": "your_api_password",
    "name": "promo_new_year",
    "type": "text_message",
    "body": "Happy New Year! Get 20% off using code NEW20.",
    "suggestions": [
        {
            "type": "reply",
            "displayText": "I am interested",
            "postback": "interested_postback"
        },
        {
            "type": "url_action",
            "displayText": "Visit Website",
            "url": "https://notifynow.in"
        }
    ]
}
```

**Request Body (Rich Card):**
```json
{
    "username": "developer@example.com",
    "password": "your_api_password",
    "name": "product_launch",
    "type": "rich_card",
    "cardTitle": "New Product Launch!",
    "body": "Check out our latest premium gadget available now.",
    "mediaUrl": "https://example.com/image.jpg",
    "suggestions": [
        {
            "type": "url_action",
            "displayText": "Buy Now",
            "url": "https://notifynow.in/shop"
        }
    ]
}
```

**Field Specifications:**
- `name`: Max 20 characters, alphanumeric and underscores only.
- `type`: `text_message` or `rich_card`.
- `suggestions`: Array of interactive buttons.
    - `type`: `reply`, `url_action`, or `dialer_action`.
    - `displayText`: Button label.
    - `postback` / `url` / `phoneNumber`: Data associated with the action.

---

## Webhooks
You can configure a callback URL to receive real-time delivery reports.

**Delivery Report Payload:**
```json
{
    "messageId": "msg_12345",
    "status": "delivered",
    "timestamp": "2026-04-11T02:00:00Z",
    "to": "919876543210"
}
```

---

## Error Codes
| Code | Meaning |
|------|---------|
| 200  | Success |
| 400  | Bad Request (Missing fields or invalid data) |
| 401  | Unauthorized (Check username/password) |
| 402  | Payment Required (Insufficient wallet balance) |
| 500  | Internal Server Error |
