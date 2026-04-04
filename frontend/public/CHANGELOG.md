# Daily Updates & Changelog

This document is automatically updated based on development activity.

## [2026-04-04]
- fix: auto-install pm2 in local_setup.ps1 if missing (821ba25)
- fix: provide native local_setup.ps1 for windows powershell users (7c6a73d)
- fix: ensure windows local environments never load production settings even if the environment name matches (1806989)
- fix: force VITE_API_URL during frontend build to prevent .env.production conflicts (b52ca09)
- fix: strictly depend on NODE_ENV for environment configuration to prevent path-based ambiguity (76526d5)
- fix: ensure backend index.js correctly distinguishes between production and developer environments even with shared domain names (7ed482b)
- fix: ensure developer deployment uses development environment flag in PM2 (c16a273)
- Merge branch 'main' of https://github.com/Cell24x7/notifynownew17feb (a7fc4cd)
- fix: strictly separate developer and production deployment environments to prevent port and setting conflicts (bf33ee2)
- Implement SMS custom pricing with Promotional, Transactional, and Service categories (6e2ede7)
- fix: final final robust placeholder replacement for SMS gateway URLs (bbe2438)
- fix: definitively eliminate hanging percents in SMS gateway URLs (bacc25a)
- fix: definitively resolve placeholder vs URL encoding conflict and enforce http for kannel callbacks (9fd42ba)
- fix: support both %VAR and %VAR% placeholder formats in SMS service (0db3461)
- fix: restore cleanMobile variable in smsService (6dda5c8)
- fix: restore https callbacks and remove protocol forcing in sms service (b64c12e)
- fix: implement single-pass placeholder replacement to prevent URL corruption (dfe2054)
- fix: final hardening for SMS gateway URL and callback encoding (8028b33)
- chore: final production polish for SMS API and schema migrations (4372377)
- fix: definitively resolve trailing percent placeholder conflict with URL encoding (8950e76)
- fix: protect URL-encoded characters in gateway placeholders (30c18cc)
- feat: enhance SMS V1 API with auto-DLT detection and improve production deployment script (342492f)

---

## [2026-04-03]
- API Fix: Flexible Key Support for Legacy URL Calls (88713d4)
- Safer Placeholder Replacement to protect URL encodings (5d3fb56)
- Final Placeholder Support and Robust Webhook Handling (3dda9c9)
- Robust SMS Webhook: Handle encoded path params and DLR protocol fix (e208ed6)
- Fix colon in DLR callback URL protocol (35abc24)
- Final SMS DLR Fix: Force HTTP, Robust Status Mapping and Unified MSGID (ff2f124)
- Fix SMS Webhook DLR ID Mismatch and update Log Schema (37a1609)

---

## [2026-04-01]
- Dark Mode UI: Standardized all modules and fixed Templates.tsx syntax errors (e52518d)
- Ultra-clean Dark Mode aesthetics for Dashboard (5b6c4c0)
- Final: Dashboard Dark mode and OTP Signup fixes (0be139f)
- Auto-detect environment port for Signup OTP (958ffaf)
- Force Auth OTP to use dedicated Internal SMS API (30214b4)
- Official SMS OTP Template Integration (af7df58)
- Add GET support for RCS API (508f832)
- Force Developer Frontend to use Developer API URL (aa7e54a)

---

## [2026-03-31]
- Final AUTO-PERMISSION and LOCKED DATABASE fix (f30bd65)
- Hardcode both environments to prevent database crossing (30bf612)
- Set Production DB to notifynow_db and Port to 5050 (085efd9)
- Cleanup and proper fix for ports, blank page, and registration (a026935)
- Final Polish: Fixed Summary Totals and Optimized Detailed Layout (e5a5d12)
- Fixed DB Connection error for Optimization script (ee935e1)
- Final Polish: Simplified Summary Report table and headers (bcb7d1d)
- UI Cleanup: Simplified fonts and added 30s live refresh (4f3cfea)
- Added Smart Deploy script with 1Cr optimization (0478255)
- 1Cr Speed Boost: Added Database Optimizer and Auto-Pruning (5020e67)
- Final Fix: Restored Message Log execution and visibility (2bbd205)
- Critical Fix: Resolved ReferenceErrors in backend and frontend (adb3eb4)
- Fix Admin Reports and stabilize Dotgo Webhook (c48cd62)

---

## [2026-03-30]
- Performance: 10x faster campaign ingestion (5k batch inserts) (d1833d9)
- Critical Fix: Sub-second report loading for 1Cr+ scale (Keyset Pagination) (4fd4e6f)
- Performance: Massive optimization for 1Cr+ scale (10k batches & 500 concurrency) (1102f72)
- Performance: Massive optimization for 1Cr+ scale (10k batches & 500 concurrency) (9212bf9)
- updated code (11bf9d7)
- Merge branch 'main' of https://github.com/Cell24x7/notifynownew17feb # Please enter a commit message to explain why this merge is necessary, # especially if it merges an updated upstream into a topic branch. # # Lines starting with '#' will be ignored, and an empty message aborts # the commit. (b59e16e)
- updated code (c4952c9)
- Fix: Add missing updated_at columns to queue tables to prevent duplicate sends (100975e)
- updated code (099e141)
- Fix: campaign-status API now queries live counts from logs for 100% accuracy (86e31a1)
- Add: campaign-status API endpoint for checking delivery reports (b185d56)
- updated code (5cffb35)
- Fix: API campaign delete + PUT/PATCH status endpoints both work (33a4faf)
- Fix: Add missing DELETE and PATCH status endpoints for campaigns (404 fix) (b6ac077)
- updated code (7d492ad)
- Fix: WhatsApp header component (IMAGE/VIDEO/TEXT) in payload builder (e926d2f)
- Fix: Hardcode APP_NAME in each deploy script - no cross-instance reload (0973488)
- Fix: worker_id column missing, schema fix in both deploy scripts (22f561f)
- Fix: Keep notifynow-developer, only remove stale production instance (69fb712)
- Add: fix_and_deploy.sh - remove stale PM2 instance (c28e01b)
- Fix: Missing logs, schema fix, atomic webhooks (d05b1c0)
- Final: Fix rapid DLR race conditions and mandatory failure logging (9fd5e81)
- Fix: Resolve reporting discrepancies and webhook atomicity (04f8e80)

---

## [2026-03-29]
- Fix Reporting Discrepancy and Dotgo Webhook Extraction (68114a4)
- Optimize Speed and Fix Detailed Reporting Discrepancy (0946273)
- Fix WhatsApp ReferenceError and Webhook lookup retries (bfefdb0)
- Fix RCS and WhatsApp campaign real-time reporting logic (c2d85ee)

---

## [2026-03-28]
- FIX: Full Engine Relay and Reporting Sync (b76efc3)
- COMPLETE ENGINE FIX: Manual Sync and Reporting Reliability (992569f)

---

## [2026-03-27]
- UI: Added Enable/Disable All buttons and synced entity toggle logic for strict RBAC enforcement (04da51c)
- Frontend: Sync all role flags (Admin/Manager/Agent) when toggling permissions for a specific entity (93a182f)
- Hardened permission compression with strict type checking (boolean, number, string) (980ce42)
- Fixed critical bug where users with no custom permissions were receiving empty sets instead of defaults (bfb47c5)
- Improved PM2 restart logic to prevent stopping other instances (04da05c)
- Fixed frontend Roles.tsx fallback bug (48c1945)
- Comprehensive fix for user permission system: synchronized backend resolution and fixed frontend fallback bug (ecaefb8)
- Corrected permission fallback logic for all auth routes (5f7ca96)
- Fix sidebar permissions, toast UI positioning, and session expiry automatic redirect (959b4db)
- Fix duplicate delivery counts and improve small campaign stats sync (e80edf9)
- Fix: Reseller sidebar, Branding crash and Implement Optimized Send Again feature (16c84d3)
- Add detailed RCS payload logging in rcsService (36f9672)
- Fix RCS customParams gaps and numbered ordering (2453c76)

---

## [2026-03-26]
- Implement dynamic variable mapping and template sample download (fec402e)
- Fix duplicate contact upload and improve report summary accuracy (05f2533)
- Fix ReferenceError: payloadComponents is not defined in sendingService (8a2ccc5)
- Auto-convert queue status ENUM to VARCHAR in schema updates to support atomic batching (45a29bc)
- Fix ambiguous column id and query parameters in queueService (e2037ee)
- Fix duplicate message sending, campaign summary counts, and WhatsApp language mapping (6e87fb3)
- Fix: permissions structure across all auth routes and fixed ReferenceError in signup (cb5967b)
- Fix: Unified default permissions for all user roles and login methods (c5ef3b6)
- Fix: Resolved Dashboard Fetch Error (CORS preflight failure) and standardized route auth (d311d3f)
- Fix: Resolved ReferenceErrors in route modules by aligning auth middleware name (798781e)
- Merge branch 'main' of https://github.com/Cell24x7/notifynownew17feb (cedce60)
- Fix: Final security stabilization with central authMiddleware, missing table auto-creation, and syntax fixes to resolve dashboard Fetch Error (587cf98)
- Fix: Stability and permission format alignment (0f248e9)
- Fix: Critical backend crash in middlewares (Phase 8.2) (924b011)
- Debug: Add incoming request logging to troubleshoot Network Errors (126eaf7)
- Fix: Campaign and Template fetch 500 errors by correcting database result destructuring (560f624)
- Fix: Bulletproof logger to prevent 500 errors if system_logs table has missing columns (04caacf)
- Fix: Add system_logs migration for device_info and location columns (a28af6a)
- Fix: Final object-based permission alignment (Phase 8.1) (1d8dcf5)
- Fix: Logs.tsx syntax error and missing icon (3bbc853)
- Fix: Reseller Impersonation Permissions, Config Access, and Enhanced Logging (31448a0)
- Enhance: Absolute path isolation for PM2 to prevent Developer deployments from stopping Production (fdf3831)
- Fix: Final verbose auto-detection with explicit dlt_templates fallback and extensive logging (ce72152)
- Fix: set executable permissions for all .sh scripts (2bf4e04)
- Merge branch 'main' of https://github.com/Cell24x7/notifynownew17feb (12426b9)
- Fix: Final robust template detection with punctuation-insensitive matching and DLT table cross-reference (4427596)
- System Logs Optimization: Date filtering, CSV Export, Device & Location Tracking, and Security overhaul (2dc34ee)
- Fix: Add debug-templates endpoint for troubleshooting auto-detection (eafe689)
- Fix: expand template auto-detection for all variable formats including {dynamic} (6f78d22)
- Fix: add template auto-detection for SMS API and fix broken heredoc in deploy script (e997d40)

---

## [2026-03-25]
- Fix Chat List: Removed MySQL ANY_VALUE function for better compatibility with older server versions (6b69056)
- Fix Chat Visibility: Updated optimized query to correctly identify contacts from both sender and recipient columns while maintaining sub-millisecond performance (84e2773)
- Performance Fix: Throttled socket.io status updates during campaigns to prevent browser freezing and optimized chat conversations list (0a339cb)
- CRITICAL SYNTAX FIX: Removed duplicated catch/brace block in campaigns.js that caused server crash (4eef541)
- Stability Fix: Reduced DB pool to 600 and added Redis connection timeout to resolve high CPU and hang issues (ab405f5)
- Environment Isolation Fix: Added APP_NAME prefix to all Redis keys to prevent conflict between Production and Developer environments (39e2e03)
- Automation Fix: Correctly sync backend .env during deploy to prevent Access Denied errors in migrations (1a7ce8e)
- Scalability Fix: Increased DB pool to 1200 and max_connections to 2000 to support 500-concurrency workers (580eb93)
- Performance Fix: Optimized contact upload for 1 Lakh+ records using sequential batching (dd65ab0)
- Updated developer deploy script to align with 20m timeout and DB optimization (7f20aa8)
- Critical Fix: Removed manual updated_at from worker to prevent crash on tables with different schema (61de520)
- Cleanup: Removed temporary debugging scripts (e222bf2)
- Updated deploy script to enforce 20m timeout and run DB optimization migrations (9e427b3)
- Fix API Logging: Added CAMP_API prefix detection and full metadata logging to webhook_logs (5ccb0dd)
- Performance stabilization: Added DB indexes, chat limits, and set 20min session timeout (bc30b83)

---

## [2026-03-24]
- Optimized messaging engine for high-volume 1Cr+ records and fixed chat/webhook visibility for RCS and WhatsApp (dc97bc3)
- Optimize High-Volume Engine: Batch DB Counter updates and persistent Redis connections (ae3b1b0)
- feat(engine): FINAL Buffered Batching Strategy for maximum 1Cr+ throughput (Drains non-stop) (db2da50)
- feat(engine): FINAL Rocket Optimization for 1Cr+ traffic (Concurrency 500, Redis Counters, Batch size 10000) (da0becb)
- fix(dashboard): activate real-time BullMQ monitoring in System Engine dashboard (b8687bf)
- feat(engine): unified sending service with auto-config fallback and high-speed concurrency (100) (aa1542d)
- fix(engine): absolute and final correction for detailed reporting schema and auto-completion logic (994fee6)
- fix: absolute fix for detailed log columns and campaign auto-completion logic (15f5137)
- fix: resolve SQL column name mismatch and add auto-completion logic for 1Cr engine reports (b13273f)
- fix: restore Detailed Report logging in BullMQ v2.5 worker (f151577)
- fix(frontend): corrected build error in SystemEngine by fixing API import path and pattern (ee809c4)
- feat: full restoration of 1Cr+ BullMQ engine and production-grade queueing (fixing inadvertent pull-related wipe) (e0ae3e8)
- feat: re-enable BullMQ 1Cr+ engine (restoring from pull-related bypass) (037f0de)
- chore: bypass redis for stable startup and sync with latest codes (0628ced)
- fix: automation keyword matching and structural hotfixes (dce046e)
- feat: implement high-performance System Engine Monitoring Dashboard for 1Cr+ traffic visibility (e6974a7)
- fix: isolate BullMQ queues by environment to prevent cross-server job processing and fix report sync issues (6bc6a68)
- fix: add missing scheduling columns to campaign tables in migration script (004b5a1)
- Fix automation flow delays, add interactive wait logic, credit deduction and variables support (846fd76)
- chore: reset instances to 1 for cleaner pm2 status view (b5c7c5f)
- feat: implement high-volume BullMQ 1Cr+ messaging engine and enable PM2 clustering for developer (d43e528)
- chore: add explicit app name to production deploy script for safety (d252df4)
- feat: implement Financial Usage Ledger v2.0 and restore stable Auth UI layout with responsive fixes (ea0102b)
- Merge branch 'main' of https://github.com/Cell24x7/notifynownew17feb (be7d9b8)
- feat: finalize automation builder with real testing, database fixes, and dynamic data integration (01f7a85)
- Remove video demo feature and cleanup Auth page structure (a913177)
- Fix syntax error on Auth page and restore JSX hierarchy (204c6f3)
- Update migration script to include api_campaigns table (b49347a)
- Add automated product demo video to Auth page (c3f7da1)

---

## [2026-03-23]
- Complete overhaul of Documentation Portal - Light Theme & Full API References for SMS, WhatsApp, RCS (f1eb2a3)
- Refactor CHANGELOG for 2026-03-23 with module-specific details (b58288c)
- Update CHANGELOG for 2026-03-23 (c0f4d6f)
- Finalizing WhatsApp variable mapping fix and new branding deployment (6be61f9)
- Fix database migration script to use correct environment config on server (fdf47b3)
- Cleanup temporary scripts (0cd0dd9)
- Implement Recurring Campaign Scheduling and Unified Creation Stepper (6e44f17)
- Fix variable mapping for WhatsApp manual/upload campaigns (2dca5a3)
- Add WhatsApp send logging to debug missing parameters (5a0726a)
- Fix API logs report and status updates in webhooks (de8c27b)
- Fix production WhatsApp DLR tracking, Developer Webhook logging, and Queue Worker 404 logging (e86bb16)
- Fix toLocaleString crash and missing metrics in campaigns API (90347e0)
- Fix require path and credit deduction parameters (b8b09e4)
- Separate API and manual campaign tables and update workers (1cb29da)

---

## [2026-03-21]
- fix: corrected Sidebar permission names for Templates and Plans to match database strings (541b6a1)
- hotfix: resolved React Hooks error on Auth page and removed non-existent require causing 502 Bad Gateway (76d7d38)
- fix: compressed JWT permissions payload to prevent header limits crash and enforced sidebar permission visibility (f40bf37)
- Create Sandy super admin user and update deployment scripts (cae2d51)
- Final sync: Include all helper scripts and latest updates for deployment (37c8562)
- feat: updated auth ui and added missing pages to roles (24850ab)
- Force JWT expiry to 30d and ensure JWT_SECRET is present in deployment (886e0b0)
- UI: Make privacy checkbox optional and change input text font to normal (9b86bbf)
- Improve script to automatically pick correct .env file (.env or .env.production) (8d10e22)
- Include API Key migration in deployment scripts (d0c1acc)
- Add SMS API v1 with auto-resolution and credit check (62673c3)

---

## [2026-03-20]
- Enhance SMS webhooks handling and fix queue processor channel logging (4241aad)
- ui: compact modern Campaign Preview dialog - smaller height, proper width, light colors, clean layout (8294f42)
- feat: live SMS preview with mapped Excel values - shows final personalized message per contact (4a727b8)
- fix: support {dynamic} and all DLT variable formats in SMS campaign variable mapping (4887951)
- Implement pagination for campaigns and templates, integrate real API for super admin campaigns, and restore admin approval tab (c51cbf9)
- feat: SMS campaign variable mapping - map Excel columns to DLT {#var#} placeholders for customized bulk SMS (9ba2848)
- polished auth page layout and spacing (514b78c)
- completed enquiry flow and notification badge (955b5d5)
- updated code (a656bc5)

---

## [2026-03-19]
- fix: added PE_ID and HASH_ID for DLT templates & fixed kannel DLR parsing (08fb3dc)
- fix sms campaign creation not sending template_body text (25582ea)
- fix sms template id param extraction (73a531d)
- update webhook param mapping for great escape (3327555)
- fix mediaId extraction response.id (3593bd8)
- Log media response structure (2816400)
- Upload Media using direct FormData to media endpoint (4ff0ed5)
- Fix WhatsApp PDF parameter key: file_name to filename (83b853c)
- Unify Google ID logic in developer deploy script and fix PDF raw upload (b23c923)
- Switch to RAW binary upload for PDF at developer webhook Step 2 (ca42fbf)
- Force overwrite Google Client ID in production deploy script to prevent empty values (b547ee0)
- Fix Google Client ID in production deploy script (a1b305e)
- Force npm install in production deploy script to avoid missing dependencies (5f2cc65)
- Fix PDF upload session and handle-id for developer webhook (4ee94f2)
- Make developer webhook dynamic and robust for WhatsApp templates (fceeca0)
- Fix WhatsApp template parameter mismatch and add button/header-text support (c8a5da5)
- Fix: Excel upload and Webhook integration enhancements (31b9574)
- fix: smart excel mapping and whatsapp template final fixes (34fe0e5)
- fix: restore JWT env in deploy script (6aaf69f)
- fix: update deploy script to preserve frontend env and ensure npm install (0a828da)
- fix: restore developerWebhooks.js and finalize template name and filename truncation (a7b759d)
- Merge branch 'main' of https://github.com/Cell24x7/notifynownew17feb (8c691e3)
-  Merge remote-tracking branch origin/main and removed tmp/ files (69d07f1)
- fix: change WhatsApp template language to en_US and finalize webhook (76c22b6)
- updated code by vikas (9b98280)
- feat: updated developer webhook to use waterpark_booking_confirmation template (92ca7c5)
- fix: auto-generate examples for WhatsApp body variables to prevent OAuthException (049ebb4)
- feat: updated developer webhook to use template messages and added webhook_logs migration (d9dbf3d)

---

## [2026-03-18]
- updated code by vikas (76a504d)
- Fix userId scope - move declaration outside try block for message_logs access (41d258b)
- Fix webhook DLR matching - contactPhone was null for FAILED events (5bc6409)
- Fix message_id parsing from DotGo response name field (bd75bb3)
- Fix incorrect integer value error for message_logs insertion (87263a0)
- Fix campaign bulk insert to populate channel in message_logs (a47a015)
- Fix database schema for message_logs error (7a55f49)
- Fix RCS Send API and Webhook Logging (102dec6)
- UI: Fixed Chat sidebar scrollbar visibility and added custom scrollbar styling (72b5aec)
- UI: Fixed Chat layout scrolling by constraining height and adding min-h-0 to columns (0dfc297)
- UI: Fixed JSX syntax error and restored Pro Tip content in Chats.tsx (8182b19)
- UI: Fixed Chat scrolling, added channel filtering by configuration, and polished chat window aesthetics (36c466c)
- Fix: Dashboard Stats Error - Added robust handling for missing chats and automations tables (b637a05)
- Fix: RCS Chat grouping & Comprehensive Data Repair - Improved conversation SQL, added manual chat reporting, and enhanced repair script to backfill message_logs (82fcb96)
- Fix: RCS Repair Script - Added prod env detection (85f3590)
- Fix: RCS Participant Normalization & Repair Logic - Fixed ReferenceError and added history repair script (def2b12)
- Fix: RCS Chat Integration (Dotgo Webhook) - robust userId resolution and channel typing (3fe03d8)
- Final Fix: Dashboard calculation logic, missing statuses, and deployment script patching (0d77d66)

---

## [2026-03-17]
- Fix dashboard live update and missing campaign fields (93bae2c)
- Proper Fix: Unique PM2 names and credential preservation on rollback basis (8c0039f)
- Fix: Surgical PM2 restarts to prevent cross-app interference (f5dfd42)
- Update: fix_campaign_enum script now supports .env.production (c806735)
- Fix: Replaced 'failed' with 'paused' to avoid DB truncation error and added enum fix script (7bb3999)
- Fix: Strict credit validation for WhatsApp/RCS and individual APIs (a7c6100)
- Fix: WhatsApp/RCS API credit check race condition. Use 'checking_credits' status. (100272c)
- Merge branch 'main' of https://github.com/Cell24x7/notifynownew17feb (61eca45)
- Fix: WhatsApp/RCS API login 404, credit validation, and dashboard stats (b06294e)
- Fix: RCS incoming message extraction and real-time chat notification (966feab)
- Fix double /api in frontend requests (1a90f09)
- Resolve merge conflicts and fix sidebar permissions (258648c)
- Add system check route and strictly separate frontend API URLs (f1d9e52)
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

---


> [!NOTE]
> This log is auto-generated from git commits. To add manual notes, use git commit messages.
