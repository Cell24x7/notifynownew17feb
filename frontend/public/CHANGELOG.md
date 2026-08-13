# Daily Updates & Changelog

This document is automatically updated based on development activity.

## [2026-08-11]
- fix(whatsapp): map authentication category to auth for WA20 template creation (5156555)
- fix(reports): enable real-time status & timestamp updates for API delivery logs in api_message_logs (927fe69)

---

## [2026-08-10]
- fix(whatsapp): send application/json body to WA20 createTemplates API for smooth template registration (c88cb82)
- feat(webhooks): log clear WA20 / NUKE WHATSAPP WEBHOOK label in terminal for WhatsApp callbacks (dfd5120)
- fix(webhooks): handle Nuke GSM webhook callbacks and extract receiver, whts_ref_id, and error fields for WA20 DLR (8761f72)
- fix(webhooks): enhance WA20 webhook callback endpoint with dynamic user resolution, DLR processing and JSON response (cfe95c5)

---

## [2026-08-07]
- feat: enhance WhatsApp API authentication to support apiKey and apiSecret in headers and body (49ae7df)

---

## [2026-08-06]
- Fix message_content showing campaign name in reports (a7c96c4)
- Update wa20 webhook callback to log payload (b78dfa6)

---

## [2026-08-05]
- feat(sidebar): add API Summary Report link to Reports Hub dropdown for Super Admin (c4014d8)
- feat(reports): add API Summary tab for Super Admins to track API usage by gateway and channel (751df96)
- chore: ignore scratch files and pdfs (2d0c2b8)
- feat(webhook): add GET /vi route for browser testing (62f89ea)
- feat(webhook): add /vi alias for dotgo rcs webhook (14021a3)
- feat: complete overhaul of API Docs to Readme.io style with sidebar (be8bd32)
- fix: fetch template metadata in whatsapp single send api to correctly map variables (f120aab)
- fix: made WhatsApp dynamic URL link tracking conditional on short_link_enabled (1ca75be)

---

## [2026-08-04]
- Fix SQL syntax error and restore missing columns in INSERT users (69425aa)
- Fix column count mismatch in INSERT users for client creation (a605f53)
- Implement DB backed deleted_whatsapp_templates filter to permanently hide deleted and test templates from UI (10c03f5)
- Fix delete script loop and delete all 38 test/unapproved templates automatically (3f12726)
- Add delete endpoint diagnostic test to identify working Nuke delete API format (1723375)
- Add DELETE WhatsApp template endpoint and create automated cleanup script for unapproved/test templates (976e0d9)
- Fix list results output in test script (6c4e6e5)
- Batch test Nuke button parameter names (quick_reply_btn_text1 vs visit_website_btn_text vs url_button_text) (8ce28db)
- Print newly created template object directly from Nuke list (44765e6)
- Test URL button payload in quick_replies JSON string column (ecd89d2)
- Print all button templates found in userindp account (67692fa)
- Inspect all Nuke templates to discover existing button template structure (058b647)
- Test 6 Nuke button parameter variations in batch to pinpoint exact DB column values (818e0fc)
- Fix listHeaders variable in test script (b158d4b)
- Convert Nuke template creation request to x-www-form-urlencoded format for PHP  compatibility (84f14ad)
- CRITICAL DISCOVERY: Map Nuke specific DB columns (visit_website_btn_text, visit_website_url_text, visit_website_url_set) in template creation and reading (9e51e3f)
- Target userindp / Indian Princess account specifically in Nuke template create script (deb0bb3)
- Auto-load .env.production and use exact Raghu Sir button details (📸 Follow Us + instagram link with igsh) (241edcb)
- Add Nuke template creation test script for live server verification (ce13440)
- Comprehensive WA20 createTemplates payload formatting (array + JSON string + button aliases) and logging (14ac73f)
- Fix WhatsAppPreview to handle direct buttons array and ensure CTAs/QuickReplies render properly in preview (92abd69)
- Fix WA20 template GET mapping: parse call_to_action and all button fields so buttons render in preview and campaign creation (3ba83cf)
- Enhance WA20 createTemplates payload with username, customer_id and buttons array fallback (2e310af)
- Fix WA20/Nuke template creation: add URL and PHONE_NUMBER button (call_to_action) support alongside QUICK_REPLY (c813189)
- Fix Vi RCS named customParams: extract variable key names from template body and send as named JSON object instead of positional array (0b7ae68)
- Fix ViRBM customParams format to stringified JSON and extract detailed error response text for 400 bad request (6d4c5e2)
- Hardcode official ViRBM endpoint (https://api.virbm.in/rcs) for message and template sending to prevent SSL cert errors from legacy api.vodafone.com URLs (f8a2441)
- Fix Vi authentication token URL override and fix authHeaderToken reference error in template submission (3686b82)
- Add create_rcs_configs_table to deploy_production.sh migration sequence (9c6929d)
- Fix Vi RCS provider UI base URL defaults (8657195)
- Fix Vi RCS provider token generation and template fetching endpoints, add TodayReport UI updates for RCS/WA/SMS summaries (a674170)
- Fix Vi provider template fetch logic, delete format, submit auth, and Super Admin list fetch (d18ca57)
- Fix Vi RCS template sync and status check parsing issue (840da4b)

---

## [2026-08-03]
- Add RCS Summary Report and user/channel info in Today Report (190270e)

---

## [2026-08-02]
- fix(billing): deduct credits from reseller when creating new sub-user with initial balance (d0ef1e1)
- style(reports): fix filter squishing when side-by-side with billing card using flex-wrap and min-widths (c6c481c)
- style(reports): make filter section fully responsive using css grid (443fa42)
- fix(reports): map actual_reseller_id from resellers table to fix missing reseller clients in superadmin dropdown (ca57619)

---

## [2026-08-01]
- feat(reports): revert user category names and add main reseller account selection option (a4d303f)
- feat(reports): redesign user selection flow to strictly separate direct and reseller clients (e142c4c)
- feat(reports): add reseller filter dropdown to easily filter clients by reseller (26fe2f0)
- feat(reports): add reseller indicator to clients list in dropdown (243071a)
- feat(reports): cascading dropdown for user type and user name in filter card (be0b192)
- fix(reports): resolve selectedUser reference error (6b5be30)
- fix(reports): add searchable user dropdown and reorder sidebar items (b40cb21)
- fix(reports): remove duplicate sidebar and use url tabs for cleaner UI (bc8ef31)
- feat(reports): completely overhaul super admin reports with sidebar, pricing details, and correct reseller aggregation (b04d894)

---

## [2026-07-31]
- Fix UI bug: Add missing fetchVoiceLogs function to Reports.tsx (fb2ddf3)
- Add debug-edpl route (fe835fb)
- Add debug endpoint and leads array size log (468b07a)
- Refactor edplPollingService voice logs insertion to catch individual errors and fallback on null fields (27f561a)
- Call ensureVoiceLogsTable on startup to actually apply schema fixes (80fde9f)
- Fix database schema: campaign_id should be VARCHAR instead of INT (d35f67b)
- Fix bug where config IDs were lost on campaign resend (361947f)
- Auto-create voice_logs table on startup (f456bc2)
- Fix Voice Logs tab trigger visibility (78ad8d1)
- Add Voice Logs tab to user reports page (844b731)
- Implement Dedicated Voice Logs Tab (8296854)
- Implement EDPL Voice Sync Polling (a0ad8f8)
- Fix syntax error in campaigns.js (2080558)
- Fix 500 error in EDPL campaigns caused by async csv processing (4fca7b9)
- Fix race condition bypassing EDPL interceptor on campaign creation (24af13c)
- Add delete option for voice configs (bbd2fab)
- Fix EDPL missing allowedPorts payload (0b1624c)
- Fix EDPL interceptor voiceConfig id fetch from user table (8a16fe6)
- Fix voiceConfig fallback bug causing 400 on upload (e39d40a)
- Fix UI tags (57cd2a1)
- Add AI Voice Config UI to Clients modal (139c8a2)
- Fix voice config null columns and relax validation (358b9a5)
- Fix import error in SuperAdminSidebar (21ea7e3)
- Add Voice Gateways UI in Admin Panel (50f0b6b)
- Add EDPL assignment script (a118da6)
- Implement EDPL Bulk processing interceptor (221009c)
- Support .env.production in migration script (a852e67)
- Fix migration script dotenv loading (f2272a1)
- Add EDPL Voice Provider Architecture (03b155f)
- Update template detail and deletion functions to support Vi provider (adf366c)
- Fix single send API not logging to api_message_logs (6d01e3e)

---

## [2026-07-30]
- Fix missing Edit2 import in Contacts page (6e5012e)
- Add edit and delete functionality for labels and lists (d1cc6cf)
- Add bulk assign and individual contact assignment features (a9d0965)
- Add contact lists migration to deploy script (6cbf85d)
- Fix dotenv path in migration script (f867290)
- Add migration script for contact lists (3fac0be)
- Fix UI for Campaign Stepper Labels (76d5f46)
- Add label filtering to Contacts and Campaign UI (d77af01)
- Add missing backend routes for contact lists (4520f74)

---

## [2026-07-29]
- Implement Contact Lists feature across Contacts and Campaign pages (d6ac611)
- Fix UI filter reset bug when clicking All Contacts (43fc5f6)
- Add Edit Contact functionality and fix Bulk Insert duplicate issue (c550787)
- Fix Contacts page toLowerCase crash for null values (558db5a)

---

## [2026-07-27]
- Fix hardcoded UTILITY category for WA20 templates (0687829)

---

## [2026-07-20]
- perf(whatsapp): Optimize smart matching query to use DB indexes (7416ab7)
- fix(whatsapp): Add smart matching fallback for WA20 temporary message IDs in DLR webhooks (fdaf821)

---

## [2026-07-18]
- feat: handle GSM webhook DLR status updates (da75d1a)
- feat: handle WA20 Template status webhook and update message_templates table (797963a)
- feat: Add GSM webhook endpoint for DLR testing (cdbe6a1)
- fix: pass customer_id from DB to sendingService for WA20 (45e14db)
- fix: route WA20 campaign messages to WA20 api endpoint instead of Meta Graph (a5ba6e2)
- fix: map WA20 templates to Meta format and bypass waba check (7e3bf07)
- fix: resolve ReferenceError in WhatsappConfigs.tsx handleSaveConfig (085b1a9)
- feat: Add complete WA20 integration with dynamic config and webhooks (ebcd4a8)

---


> [!NOTE]
> This log is auto-generated from git commits. To add manual notes, use git commit messages.
