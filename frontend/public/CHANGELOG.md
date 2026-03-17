# Daily Updates & Changelog

This document is automatically updated based on development activity.

## [2026-03-17]
- Fix: Environment separation for production and developer instances (1cf8f45)
- Final strict separation: Clean PM2 starts and folder-based config enforcement (3a49a1a)
- Force strict DB separation based on folder path (88a7799)
- Log database name on connection (6a57351)
- Better API auth debugging messages (36ed412)
- Auto-detect environment scripts for Dev and Prod (0bbcb54)

---

## [2026-03-16]
- Fix: OTP delivery matching, Signup segmentation, and DB status schema update (b55ce74)

---

## [2026-03-14]
- Fix: Re-defined baseUrl in smsService and ensured correct API format (414b25b)
- Fix: Updated Email API to use GET format with OTP-specific parameters (944f2dd)
- Fix: Removed redundant dotenv config in email service (975f37f)
- Fix: Ensured all migration scripts load .env.production and synchronized deploy_server settings (6ce4ed5)
- Fix: Added robust mobile cleaning and detailed logging to OTP/Auth services (5fb126c)
- Deploy: Synchronized all migrations across both deployment scripts (2a654b7)
- Deploy: Added all missing schema migrations to production deploy script (162a66e)
- Deploy: Updated production script with correct DB and migrations (54e791c)
- Fix: Improved API logs sorting, fixed RCS sync URL, and enhanced reports UI (2871fd0)
- Fix: Resolved doubling of recipient_count in reports and aligned duplication logic (98e0814)
- Fix: Comprehensive variable detection in WhatsApp templates to prevent Parameter Mismatch errors (d25a51e)
- Fix: Final stability fixes for Developer server, DB enforcement, and robust template payload construction (d67eb07)
- Fix: Ensure template name is never null in queue and improved WA stability (27ad958)
- Fix: Align audience_count to recipient_count and enhanced detail logging (b5dc79e)

---

## [2026-03-13]
- Fix: Chat list now shows contact name instead of phone number via contacts JOIN (eb603ef)
- Polished Topbar: My Profile link, better dropdown, fixed lint and testimonial text (b149ed5)
- Fixed Auth page mobile responsiveness: enabled scrolling and improved layout stacking (8390f1c)
- Polished UI: Live testimonials on Auth page, sharpened logo, and updated Topbar to match provided designs (no glassmorphism) (ef8e7c4)
- Refined Auth page: smaller header, password toggle (eye icon), and fixed non-scrolling layout at 100% zoom (c8a1ec5)
- Fixed scrolling and layout issues for Auth page at 100% zoom (d6e7919)
- Adjusted layout scaling for 100% zoom visibility, lightened BG, and increased blur on decorative elements (5eb987a)
- Fixed login page design to match image exactly - adjusted fonts, colors, and removed glassmorphism (e06c15c)
- Revamped login page to match new design specifications (9ba585c)
- Fix: Restore Package icon in AppSidebar for DLT Templates (d7f389d)
- Fix: Add missing CreditCard import in AppSidebar (fec052a)
- Unify Plans UI and integrate into Settings tab (863c36c)
- Implement functional automation system with backend and database integration (2a417a8)
- Refine filter control center in Templates page (5b428a7)
- Sidebar menu rearrangement and Reports UI enhancement with live campaign activity (14cd73a)
- Optimize dashboard channel cards layout and responsiveness (06676a0)
- Filter dashboard channels based on user permissions and role (2d68392)
- Unify Dashboard stats for Admin/User and filter inactive channels dynamically (f12cc20)
- Replace dummy stats values with real API variables in Dashboard (dc14359)
- Enhance Auth page: Replace marquee with rotating FeedbackBox next to contact buttons (87c5fd1)
- Fix missing lucide icon import in Dashboard (17efc79)
- Complete redesign of Dashboard Analytics with charts and agent performance matching mockups (5acddc7)
- Merge from remote (c2f8b5f)
- Fix API logs not displaying by making insertion log to message_logs properly (e30c3d3)
- Implement WhatsApp custom pricing and standardized ₹1.00 billing across all channels (556eb04)
- Auto add database columns for campaign tracking on developer trigger (cd7707f)
- Update DB schema to support tracking campaign logs properly (e82204b)
- Add API Logs tracking for developer webhook triggers (c7cbf25)
- Update webhook to upload PDF and send as template component (2ebbfd7)
- Update hardcoded user id to 1 for Developer Webhook (6ff3f43)
- Fix Developer Webhook Route to bypass Nginx 405 constraint (b4f2306)
- Add Developer Webhook for automatic WhatsApp replies (2715533)
- Enhance Roles UI and update User Permissions (5f4a79e)
- Fix whatsapp webhook interactive buttons (267e692)
- Add TGE chatflow seeder and integrate into deploy script (645969a)

---

## [2026-03-12]
- fix: restore external template fetching and improve unsynced template UI (f6d0a8e)
- style: enhance Templates UI and remove unsynced external placeholders (a728576)
- style: sync UserPlans UI with premium 3-column layout and high-end SaaS aesthetic (72f7839)
- style: overhaul plans page UI with premium 3-column layout and improved spacing (67c2280)
- feat: separate NotifyNow documentation Postman collection from original Partners collection (6f52a0e)
- style: ultra-light premium API doc portal with sticky sidebar and perfect mobile UI (43f0075)
- feat: ultra-responsive WhatsApp API Doc portal with step-by-step guide (b5058e5)
- feat: upgrade WhatsApp API docs to premium UI with Postman download (b298d7c)
- feat: add public browser-accessible API documentation page (63fa29e)
- fix: enforce parent-dir based PM2 naming to isolate instances (93e5eca)
- fix: add missing fs import in ecosystem.config.js (c0c2d90)
- fix: remove dotenv dependency from ecosystem.config.js using native fs parsing (e780f0e)
- fix: explicit port passing for PM2 using dotenv to resolve instance clashing (539792d)
- Fix deployment system: Unique PM2 names (Parent-Folder-Naming) and smart migrations (d08a3a0)
- Fix deployment: Dynamic PM2 naming, smart env migration, and directory-independent deployment (6a93df6)
- Finalize WhatsApp APIs: Added Bulk, Single and Status endpoints with polished documentation (eb566b0)
- Split WhatsApp API into Bulk and Single endpoints (62d12ef)
- Enhance WhatsApp Campaign API: Add dynamic variables and media header support (7c255b8)
- Refactor RCS Configuration: Soften UI aesthetics and fix structural JSX errors (b302812)
- Refactor RCS Configuration: remove preview sidebar and implement full-width layout (86642a9)
- style: fixed over-stretched layout for RCS Configuration, added max-width and balanced grid (02cb5f6)
- fix: added missing Zap icon import (52e9cf7)
- style: full professional layout for RCS onboarding - larger inputs, balanced grid, premium aesthetics (1ed9fca)
- style: updated RCS onboarding layout to 8/4 grid split for better desktop view (76782ad)
- fix: RCS preview scaling and visibility in different zoom levels (cb328d3)
- fix: full auto deploy - permissions, npm install, frontend build, dist verify, pm2 production restart all in one (751cef0)
- feat: auto env switching - production uses .env.production, dev uses .env (ecosystem.config.js + deploy_server.sh updated) (de22590)
- feat: improved deploy_server.sh - added frontend build step, error handling, pm2 status (4a4892a)
- merge: keep RCS onboarding responsive layout fix (local changes kept) (41ecfab)
- fix: RCS Bot Onboarding form - full width responsive layout, all sections visible, preview fixed, countryCode type fix (edd54e1)
- fix: layout responsiveness and remove root constraints (7fcd36a)
- feat: upgrade chatflow with interactive buttons/lists and populate TGE flows (14ae5a6)
- Fix Media MIME type: Proxy WhatsApp media through /api to avoid Nginx/React HTML fallback (584a11a)
- Comprehensive fix for WhatsApp templates: Correct handle for creation, Link for sending (d506f28)
- Fix Pinbot media upload (raw binary with Content-Length and offset) (22497bb)
- Fix Pinbot media upload (use binary POST for resumable session) (1dbe662)
- Force error on failed Pinbot upload to prevent URL fallback for templates (3e0aabe)
- Implement Resumable Upload Session for Pinbot to get template handles (a6a9514)
- Fix Pinbot media upload field name (sheet -> file) and handle detection (f4290b9)
- Fix WhatsApp template creation for Pinbot (lowercase fields and better validation) (d7a5d1d)
- Add detailed logging for WhatsApp template creation payload (be586b2)
- Fix WhatsApp template creation errors (sanitized names and required media samples) (dfd92cc)
- Fix static file path and improve WA media upload logging (c7989e7)
- Ensure migration script loads .env variables (ebc6b1d)
- Fix template_type truncation by expanding DB column to VARCHAR(50) (5236631)
- Add deploy_server.sh automation script (3bb7673)
- Fix Pinbot media upload field name (sheet instead of file) (126aedb)

---

## [2026-03-11]
- Resolve merge conflict in queueService.js and CHANGELOG.md (7aa992f)
- sandy updated (5aa0074)
- updated code by vikas (81a4c80)
- updated code (5c927ae)
- Esc :wq Enterupdated code (dbd02fb)
- sandeep updated code (b1c6050)
- updated code (7ec30b4)
- updated code (c69424f)
- sandeep updated code (42486e0)
- updated code (a6443d4)
- updated code (ca5abda)
- sandy updsted (1423ea5)
- updated code (3cc98d2)
- updated code (bf5d2b0)
- sandy updsted (2891ec9)

---

## [2026-03-10]
- sandy updsted (79a5ee3)
- sandeep updated code (e873f7e)
- sandeep updated code (9320b84)

---

## [2026-03-09]
- sadeep updated (da40765)
- updated code (e19d16c)
- updated code (4d4f2e9)
- Merge branch 'main' of https://github.com/Cell24x7/notifynownew17feb (04755a7)
- Sandeep update whatsapp (843bbb7)

---

## [2026-03-07]
- updated code (4884145)
- updated code (45f1ee9)
- updated code (01e5ece)
- updated code (af51853)

---

## [2026-03-06]
- updated code by vikas (51f10f4)
- updated code by vikas (d642efe)
- updated code by vikas (472ed05)
- updated code by vikas (5df63bc)
- updated code by vikas (3a31f07)
- updated code by vikas (759c814)
- updated code by vikas (8a56aab)

---

## [2026-03-05]
- updated code (14e00fd)
- updated code (30da4c0)

---

## [2026-03-04]
- updated code (ed0ca00)
- updated code (f1f6db8)
- sandeep update (abef612)
- Merge branch 'main' of https://github.com/Cell24x7/notifynownew17feb (b6eccf0)
- Resolve merge conflict in Reports.tsx (be9fff2)
- updated code (2930f5c)
- Updated Dotgo RCS template integration and frontend template UI (8f75979)

---

## [2026-03-02]
- updated code (4ef6b56)

---

## [2026-02-28]
- updated code (790569a)
- updated code (2ea5c27)

---

## [2026-02-27]
- updated code (c18f9e5)
- sandeep update (8da9392)
- updated code by vikas (43da1aa)

---

## [2026-02-26]
- RCS configs and campaign updates (6feb924)
- updated code by vikas (14bac8e)

---

## [2026-02-25]
- updated code rs (2dc7841)
- Resolve merge conflicts (a1dd726)
- updated code rs (8ee51e2)
- updated code rs (a5efb4b)
- updated code rs (3498d9e)
- updated code rs (46f670a)

---

## [2026-02-24]
- updated code rs (0f5268a)
- updated code rs (67fabf9)
- updated code rs (a060899)

---

## [2026-02-21]
- updated code (5a0930a)
- updated code (dec6a5e)

---

## [2026-02-20]
- code (6f650c1)
- code (f0a0b4e)
- code (ccd9b05)
- code (49bf72e)

---

## [2026-02-19]
- code (8428e45)
- code (409f55d)
- remove node_modules and add to gitignore (7b369ee)

---

## [2026-02-18]
- updated campaign (be5fbac)

---

## [2026-02-17]
- userlogin (01dfce9)
- latest code (397597a)

---

## [2026-02-16]
- updated (a4fb5d6)
- updated home page (b32502c)
- updated auth file (1678f23)

---

## [2026-02-14]
- update (a43d027)

---


> [!NOTE]
> This log is auto-generated from git commits. To add manual notes, use git commit messages.
