# 🚀 NotifyNow | Executive Changelog & Updates

This document tracks major feature releases, infrastructure improvements, and business logic updates.

---

## 📅 [2026-04-10] | Email Channel & UI Responsiveness
### 📧 Email Channel (Full Launch)
*   **Campaign Flow:** Recipients can now be targeted via **Email Addresses**. Added manual "Bulk Email" input support.
*   **Professional Branding:** Added **Sender Name**, **From Email ID**, and **Subject Line** customization for every campaign.
*   **Multimedia:** Support for **Attachments** (PDF, Images, Excel, DOC) up to 10MB per email.
*   **Speed:** Email templates are now **Auto-Approved**—create and send instantly without waiting.

### 🎨 Design & Experience
*   **Full Responsiveness:** Optimized the entire platform (Dashboard, Templates, Campaign Wizard) for **Mobile, Tablet, and Desktop**.
*   **Visual Indicators:** Added color-coded **Channel Badges** (RCS, WhatsApp, SMS, Email) on all template cards for quick identification.

---

## 📅 [2026-04-09] | Reseller Stability & Bot Routing
### 👥 Reseller Management
*   **Access Control:** Resellers can now manage **Campaigns, Templates, Chats, and Contacts** for their specific clients with strict permission isolation.
*   **Permission Sync:** Fixed "Fuzzy Matching" for permissions—ensuring sidebars correctly show/hide based on assigned roles.
*   **Onboarding:** Simplified the Reseller creation process with relaxed validation and better error handling.

### ⚙️ Engine & Deliverability
*   **WhatsApp Meta:** Hardened the Meta Graph API routing to ensure 100% deliverability for WhatsApp campaigns.
*   **RCS Smart Routing:** Implemented "Strict Bot Mapping"—messages are now routed only through user-assigned bots to prevent cross-account billing issues.
*   **Media Handling:** Fixed PDF/Image upload issues for Meta Graph providers.

---

## 📅 [2026-04-08] | RCS Excellence & Optimization
### 📱 RCS Rich Messaging
*   **Rich Content:** Support for **RCS Carousels and Standalone Multimedia Cards**.
*   **Smart Fallback:** Added a zero-fail delivery mechanism that intelligently searches for backup bots if the primary one is unavailable.

### 📊 Reporting
*   **Client Filtering:** Resellers can now filter reports by individual clients to track performance at a granular level.
*   **Data Cleanup:** Automated script to remove failed/corrupt logs—keeping the dashboard clean and accurate.

---

## 📅 [2026-04-06] | Compliance & Security
### 🛡️ Security & Suspension
*   **Account Controls:** Implemented **Account Suspension** and **Client Deletion**—giving Admins full control over spam or non-paying accounts.
*   **Audit Logs:** Enhanced system logs with Device Info and Location tracking for better security auditing.

### 📋 SMS DLT (Compliance)
*   **Sample Generator:** Automated generation of DLT sample files to help clients get approval faster.
*   **Unicode Support:** Added Marathi/Hindi (Unicode) billing calculation logic to prevent credit discrepancies.

---

## 📅 [2026-04-04] | Core Billing & Performance
*   **Dynamic Pricing:** Implemented 4-decimal precision for GST and Credits—ensuring 100% accurate billing.
*   **Performance:** Optimized database queries to handle **1 Crore+ records** with sub-second reporting speed.
*   **Global Search:** Smart template billing with keyword matching for auto-categorization.

---

> [!TIP]
> **CEO Summary:** All core channels (SMS, WhatsApp, RCS, Email) are now live, fully responsive, and reseller-ready. The system is optimized for high-volume 1Cr+ traffic with enterprise-grade security.

---
*Older git-based technical logs are archived below.*
