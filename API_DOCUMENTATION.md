# NotifyNow - Professional API Documentation

Yeh document NotifyNow platform ke saare backend API endpoints ko cover karta hai. Isme Authentication, Campaigns, Contacts, aur Messaging (WhatsApp/RCS) se jude saare details hain.

---

## 🔐 1. Authentication APIs
**Base URL:** `/api/auth`

| Method | Endpoint | Description | Request Body (Key Fields) |
| :--- | :--- | :--- | :--- |
| **POST** | `/send-otp` | Signup ya Login ke liye OTP bhejne ke liye. | `{ email, mobile, is_signup }` |
| **POST** | `/verify-otp` | Bheje gaye OTP ko verify karne ke liye. | `{ identifier, otp }` |
| **POST** | `/signup` | Naya account create karne ke liye (OTP verify hone ke baad). | `{ identifier, password, otp, name }` |
| **POST** | `/login` | Email/Mobile aur Password se login karne ke liye. | `{ identifier, password }` |
| **GET** | `/me` | Logged-in user ki details aur permissions lane ke liye. | *Header: Authorization* |
| **PUT** | `/update-profile`| User ki profile details (Name, Password, Company) update karne ke liye. | `{ full_name, company, password }` |

---

## 📈 2. Dashboard & Stats APIs
**Base URL:** `/api/dashboard`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/stats` | User dashboard ke liye (Total chats, Campaigns, Weekly counts). |
| **GET** | `/super-admin` | Admin/Reseller dashboard ke liye (Revenue, Total Clients, Channel usage). |

---

## 📁 3. Contact Management APIs
**Base URL:** `/api/contacts`

| Method | Endpoint | Description | Request Body / Query |
| :--- | :--- | :--- | :--- |
| **GET** | `/` | Saare contacts ki list lane ke liye (Filters: search, category, status). | `?search=xyz&status=active` |
| **POST** | `/` | Naya contact manually add karne ke liye. | `{ name, phone, email, category, channel }` |
| **PUT** | `/:id` | Purane contact ki details update karne ke liye. | `{ name, phone, email, ... }` |
| **DELETE** | `/:id` | Kisi contact ko delete karne ke liye. | *Params: id* |
| **POST** | `/bulk` | Hazaron contacts ko ek sath array format mein import karne ke liye. | `{ contacts: [...] }` |

---

## 🚀 4. Campaign Management APIs
**Base URL:** `/api/campaigns`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/` | User ke banaye huye saare campaigns ki list. |
| **POST** | `/` | Naya campaign (Draft) create karne ke liye. |
| **PUT** | `/:id/status` | Campaign ko 'running' ya 'paused' karne ke liye. |
| **POST** | `/:id/duplicate`| Purane campaign ki copy banane ke liye. |
| **POST** | `/:id/upload-contacts` | Campaign ke liye CSV file se numbers upload karne ke liye. |

---

## 💬 5. WhatsApp & RCS Messaging APIs
**Base URL:** `/api/whatsapp` & `/api/rcs`

### WhatsApp Specific:
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/templates` | Meta/Pinbot se approved saare WhatsApp templates fetch karna. |
| **POST** | `/templates` | Naya WhatsApp template create aur submit karna. |
| **POST** | `/send-template`| Kisi bhi number par approved WhatsApp template message bhejna. |
| **POST** | `/media/upload-local` | WhatsApp messages ke liye media files (Image/PDF) upload karna. |

### RCS Specific:
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/templates/external` | Dotgo se approved saare RCS templates ki list lana. |
| **POST** | `/send-campaign` | RCS templates ke sath bulk campaign trigger karna. |

---

## 📝 6. Message Templates APIs
**Base URL:** `/api/templates`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/` | Local database mein saved saare templates. |
| **POST** | `/` | Local DB mein naya template (WhatsApp/RCS/SMS) save karna. |
| **PATCH** | `/:id/status` | (Admin Only) Kisi template ko Approve ya Reject karna. |

---

## 🛠️ 7. Settings & Wallet APIs
| Base URL | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| `/api/wallet` | **GET**| `/balance` | User ke current wallet balance ki jankari. |
| `/api/plans` | **GET**| `/` | Available subscription plans ki list. |
| `/api/integrations`| **GET**| `/` | API Keys aur Webhook configurations management. |

---

## 📄 How to Export this to PDF?

Aap is Markdown file ko badi aasani se ek professional PDF mein convert kar sakte hain:

1.  **VS Code (Best Option):**
    *   VS Code mein jayein aur **"Markdown PDF"** extension install karein.
    *   Is `API_DOCUMENTATION.md` file ko open karein.
    *   Right-click karein aur **"Markdown PDF: Export (pdf)"** select karein.
2.  **Online Converter:**
    *   Google par **"Markdown to PDF"** search karein.
    *   Is file ka content copy karke wahan paste karein aur PDF download kar lein.
3.  **Browser:**
    *   Is file ko GitHub ya kisi viewer mein kholein aur `Ctrl + P` (Print) karke "Save as PDF" kar lein.

---
