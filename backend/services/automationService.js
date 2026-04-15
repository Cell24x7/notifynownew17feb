const { query } = require('../config/db');
const { sendRcsMessage } = require('./rcsService');
const { deductSingleMessageCredit } = require('./walletService');
const { sendSMS } = require('../utils/smsService');
const axios = require('axios');

const PINBOT_BASE = 'https://partnersv1.pinbot.ai/v3';
const GRAPH_BASE = 'https://graph.facebook.com/v19.0';

/**
 * Automations Service
 * Handles graph-based workflow execution and table initialization.
 */

async function ensureAutomationsTable() {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS automations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                trigger_type VARCHAR(100) DEFAULT 'new_message',
                channel VARCHAR(50) DEFAULT 'whatsapp',
                status ENUM('active', 'paused', 'draft') DEFAULT 'draft',
                nodes JSON NOT NULL,
                edges JSON NOT NULL,
                trigger_count INT DEFAULT 0,
                last_triggered TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        // console.log('✅ [AutomationService] automations table ready');
    } catch (err) {
        console.error('❌ [AutomationService] Failed to ensure table:', err.message);
    }
}

/**
 * processAutomation
 * Traverses the graph starting from the appropriate entry point (trigger or button branch).
 */
async function processAutomation(userId, triggerType, channel, payload, io) {
    try {
        // console.log(`🤖 [AutomationService] Processing for User ${userId}, Type: ${triggerType}, Channel: ${channel}`);
        
        // 🤖 DIRECT FAILOVER HANDLING (Bypasses active automation check)
        if (triggerType === 'message_failed' && payload.failover_template_id) {
            console.log(`🚀 [AutomationService] Direct RCS Failover Triggered for ${payload.sender}. Sending SMS Fallback...`);
            await handleSmsAction(userId, (payload.sender || '').replace(/\D/g, ''), { templateId: payload.failover_template_id }, payload, io);
            return;
        }

        const [automations] = await query(
            "SELECT * FROM automations WHERE user_id = ? AND status = 'active' AND channel = ?",
            [userId, channel]
        );

        if (!automations || automations.length === 0) {
            // console.log(`🤖 [AutomationService] No active ${channel} automations found for user ${userId}`);
            return;
        }

        for (const automation of automations) {
            const nodes = typeof automation.nodes === 'string' ? JSON.parse(automation.nodes) : automation.nodes;
            const edges = typeof automation.edges === 'string' ? JSON.parse(automation.edges) : automation.edges;

            let entryNode = null;

            // 1. Detect if this is a button/list click (Continuation)
            const buttonId = payload.buttonId || payload.listId;
            if (buttonId) {
                // console.log(`🤖 [AutomationService] Button click detected: ${buttonId}. Finding branch...`);
                const followEdge = edges.find(e => e.sourceHandle === buttonId);
                if (followEdge) {
                    entryNode = nodes.find(n => n.id === followEdge.target);
                    // console.log(`🤖 [AutomationService] Continuing flow from branch target: ${entryNode?.id}`);
                }
            }

            // 2. Fallback to Trigger Node if no branch matched and trigger matches
            if (!entryNode && triggerType === automation.trigger_type) {
                const triggerNode = nodes.find(n => n.type === 'trigger');
                if (triggerNode) {
                    console.log(`🤖 [AutomationService] Checking trigger conditions for automation: ${automation.name}`);
                    const matched = checkTriggerConditions(triggerNode, payload.message_content);
                    if (matched) {
                        // console.log(`🤖 [AutomationService] Trigger matched! Starting flow.`);
                        entryNode = triggerNode;
                    } else {
                        // console.log(`🤖 [AutomationService] Conditions NOT matched for trigger.`);
                    }
                }
            }

            if (entryNode) {
                // console.log(`🚀 [AutomationService] Executing entryNode: ${entryNode.id} for ${payload.sender}`);
                await executeNode(userId, entryNode, nodes, edges, channel, payload, io);
                await query("UPDATE automations SET trigger_count = trigger_count + 1, last_triggered = CURRENT_TIMESTAMP WHERE id = ?", [automation.id]);
            }
        }
    } catch (err) {
        console.error('❌ [AutomationService] processAutomation error:', err.message);
    }
}

/**
 * checkTriggerConditions
 * Extract keywords from data.keywords OR data.conditions[0].keywords
 */
function checkTriggerConditions(node, messageText) {
    let keywords = [];
    if (node.data.keywords && Array.isArray(node.data.keywords)) {
        keywords = node.data.keywords;
    } else if (node.data.conditions && Array.isArray(node.data.conditions) && node.data.conditions[0]?.keywords) {
        keywords = node.data.conditions[0].keywords;
    }

    if (keywords.length === 0) return true; // Empty means catch-all

    const text = (messageText || '').toLowerCase().trim();
    const cleanKeywords = keywords.map(kw => String(kw).toLowerCase().trim());
    // console.log(`🛠️ [AutomationService] Matching "${text}" against: [${cleanKeywords.join(', ')}]`);
    return cleanKeywords.some(kw => text === kw || (text.includes(kw) && kw.length > 2));
}

async function executeNode(userId, currentNode, allNodes, allEdges, channel, payload, io) {
    // console.log(`🔍 [AutomationService] Executing Node: ${currentNode.id} (Type: ${currentNode.type})`);
    const nextEdges = allEdges.filter(e => e.source === currentNode.id);
    
    if (currentNode.type === 'trigger') {
        for (const edge of nextEdges) {
            const nextNode = allNodes.find(n => n.id === edge.target);
            if (nextNode) await executeNode(userId, nextNode, allNodes, allEdges, channel, payload, io);
        }
    } else if (currentNode.type === 'condition') {
        const matched = checkTriggerConditions(currentNode, payload.message_content); 
        if (matched) {
            for (const edge of nextEdges) {
                const nextNode = allNodes.find(n => n.id === edge.target);
                if (nextNode) {
                    await new Promise(r => setTimeout(r, 800));
                    await executeNode(userId, nextNode, allNodes, allEdges, channel, payload, io);
                }
            }
        }
    } else if (currentNode.type === 'action') {
        const actionType = currentNode.data.subType || currentNode.data.actionType;
        const config = currentNode.data.config || {};
        const mobile = (payload.sender || '').replace(/\D/g, '');
        let text = config.message || config.body || currentNode.data.label;

        console.log(`⚙️ [AutomationService] Action: ${actionType}`);

        if (actionType === 'auto_reply' || actionType === 'auto_reply_buttons' || actionType === 'send_message' || actionType === 'auto_reply_template') {
            
            if (actionType === 'auto_reply_template' && config.templateId) {
                text = `[Template: ${config.templateId}]`; 
            }

            text = await replaceVariables(userId, mobile, text);

            const templateName = config.templateId || 'automation_reply';
            const deduction = await deductSingleMessageCredit(userId, channel, templateName);
            if (!deduction.success) {
                return;
            }

            let sent = false;
            if (channel === 'whatsapp') {
                sent = await sendWhatsAppReply(userId, payload.sender, text, config);
            } else if (channel === 'rcs') {
                sent = await sendRcsReply(userId, payload.sender, text);
            }

            if (sent) {
                await logWebhook(userId, payload.sender, text, channel, io);
            }

            const hasButtons = config.messageType === 'button_flow' && config.buttons && config.buttons.length > 0;
            if (hasButtons) {
                return; 
            }
            
            await new Promise(r => setTimeout(r, 1200));
        } else if (actionType === 'send_sms') {
            await handleSmsAction(userId, mobile, config, payload, io);
        } else if (actionType === 'add_to_campaign') {
            if (config.campaignId) await addToCampaign(userId, mobile, config.campaignId);
        } else if (actionType === 'remove_from_campaign') {
            if (config.campaignId) await removeFromCampaign(mobile, config.campaignId);
        } else if (actionType === 'add_tags' || actionType === 'remove_tags') {
            await handleTags(userId, mobile, payload.sender, actionType, config.tagName);
        } else if (actionType === 'set_conversation_status') {
            await logWebhook(userId, payload.sender, `Status: ${config.status || 'Open'}`, channel, io, 'notified');
        } else if (actionType === 'add_contact_to_list') {
            if (config.listId) await query('UPDATE contacts SET category = ? WHERE user_id = ? AND (phone = ? OR phone = ?)', [config.listId, userId, mobile, payload.sender]);
        }

        for (const edge of nextEdges) {
            if (edge.sourceHandle) continue; 
            const nextNode = allNodes.find(n => n.id === edge.target);
            if (nextNode) await executeNode(userId, nextNode, allNodes, allEdges, channel, payload, io);
        }
    }
}

async function logWebhook(userId, recipient, text, channel, io, status = 'sent') {
    try {
        await query(
            'INSERT INTO webhook_logs (user_id, sender, recipient, message_content, status, type) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, 'System', recipient, text, status, channel]
        );
        if (io) {
            io.to(`user_${userId}`).emit('new_message', {
                sender: 'System',
                recipient: recipient,
                message_content: text,
                created_at: new Date(),
                status: status,
                type: channel
            });
        }
    } catch (e) { console.error('Log error:', e); }
}

async function addToCampaign(userId, mobile, campaignId) {
    const [existing] = await query('SELECT id FROM campaign_queue WHERE campaign_id = ? AND mobile = ?', [campaignId, mobile]);
    if (existing.length === 0) {
        await query(
            'INSERT INTO campaign_queue (campaign_id, user_id, mobile, variables, status) VALUES (?, ?, ?, ?, ?)',
            [campaignId, userId, mobile, JSON.stringify({ source: 'automation' }), 'pending']
        );
    }
}

async function removeFromCampaign(mobile, campaignId) {
    await query('DELETE FROM campaign_queue WHERE campaign_id = ? AND mobile = ?', [campaignId, mobile]);
}

async function handleTags(userId, mobile, sender, action, tagName) {
    if (!tagName) return;
    const [contacts] = await query('SELECT id, labels FROM contacts WHERE user_id = ? AND (phone = ? OR phone = ?)', [userId, mobile, sender]);
    if (contacts.length > 0) {
        let labels = [];
        try {
            const rawLabels = contacts[0].labels;
            labels = typeof rawLabels === 'string' ? JSON.parse(rawLabels || '[]') : (rawLabels || []);
        } catch (e) { labels = []; }
        
        if (action === 'add_tags') {
            if (!labels.includes(tagName)) {
                labels.push(tagName);
                await query('UPDATE contacts SET labels = ? WHERE id = ?', [JSON.stringify(labels), contacts[0].id]);
            }
        } else {
            const newLabels = labels.filter(l => l !== tagName);
            if (newLabels.length !== labels.length) {
                await query('UPDATE contacts SET labels = ? WHERE id = ?', [JSON.stringify(newLabels), contacts[0].id]);
            }
        }
    }
}

async function sendWhatsAppReply(userId, to, text, config = {}) {
    try {
        const [configs] = await query(
            'SELECT wc.* FROM users u JOIN whatsapp_configs wc ON u.whatsapp_config_id = wc.id WHERE u.id = ?',
            [userId]
        );
        if (!configs || configs.length === 0) {
            console.error('❌ [AutomationService] No WhatsApp config found for user', userId);
            return false;
        }
        const cfg = configs[0];
        const isPinbot = cfg.provider === 'vendor2';
        const mobile = to.replace(/\D/g, '');

        const msgUrl = isPinbot ? `${PINBOT_BASE}/${cfg.ph_no_id}/messages` : `${GRAPH_BASE}/${cfg.ph_no_id}/messages`;
        const headers = isPinbot ? { apikey: cfg.api_key } : { Authorization: `Bearer ${cfg.wa_token}` };

        let payload = {
            messaging_product: 'whatsapp',
            to: mobile
        };

        if (config.messageType === 'button_flow' && config.buttons && config.buttons.length > 0) {
            payload.type = 'interactive';
            payload.interactive = {
                type: 'button',
                body: { text: text || 'Please choose an option' },
                action: {
                    buttons: config.buttons.slice(0, 3).map(btn => ({
                        type: 'reply',
                        reply: { id: btn.id, title: btn.label.slice(0, 20) }
                    }))
                }
            };
        } else {
            payload.type = 'text';
            payload.text = { body: text };
        }

        const res = await axios.post(msgUrl, payload, { headers: { ...headers, 'Content-Type': 'application/json' } });
        return true;
    } catch (err) {
        console.error('❌ [AutomationService] WA send error:', err.response?.data || err.message);
        return false;
    }
}

async function sendRcsReply(userId, to, text) {
    try {
        const [configs] = await query(
            'SELECT rc.* FROM users u JOIN rcs_configs rc ON u.rcs_config_id = rc.id WHERE u.id = ?',
            [userId]
        );
        if (!configs || configs.length === 0) return false;
        const rcsConfig = configs[0];
        await sendRcsMessage(to, text, rcsConfig);
        return true;
    } catch (err) {
        console.error('❌ [AutomationService] RCS send error:', err.message);
        return false;
    }
}

async function replaceVariables(userId, mobile, text, customVars = {}) {
    if (!text) return text;
    // Check if there are any variable patterns in the text
    if (!/\{|\[/.test(text)) return text;
    
    try {
        let newText = text;
        
        // 1. First, replace custom map variables (from payload.variables)
        if (customVars && typeof customVars === 'object') {
            for (const [key, val] of Object.entries(customVars)) {
                // Matches {{key}}, {key}, [key], {#key#}
                const regexes = [
                    new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi'),
                    new RegExp(`\\{\\s*${key}\\s*\\}`, 'gi'),
                    new RegExp(`\\[\\s*${key}\\s*\\]`, 'gi'),
                    new RegExp(`\\{#\\s*${key}\\s*#\\}`, 'gi')
                ];
                regexes.forEach(regex => {
                    newText = newText.replace(regex, val != null ? String(val) : '');
                });
            }
        }

        // 2. Then fallback to contact table data
        const [contacts] = await query('SELECT * FROM contacts WHERE user_id = ? AND (phone = ? OR phone = ?)', [userId, mobile, mobile]);
        let contactVars = {
            name: 'User',
            first_name: 'User',
            phone: mobile,
            email: ''
        };

        if (contacts.length > 0) {
            const contact = contacts[0];
            contactVars = {
                name: contact.name || 'User',
                first_name: (contact.name || 'User').split(' ')[0],
                phone: contact.phone,
                email: contact.email || ''
            };
        }

        for (const [key, val] of Object.entries(contactVars)) {
            const regexes = [
                new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi'),
                new RegExp(`\\{\\s*${key}\\s*\\}`, 'gi'),
                new RegExp(`\\[\\s*${key}\\s*\\]`, 'gi'),
                new RegExp(`\\{#\\s*${key}\\s*#\\}`, 'gi')
            ];
            regexes.forEach(regex => {
                newText = newText.replace(regex, val || '');
            });
        }
        return newText;
    } catch (e) {
        return text;
    }
}


async function handleSmsAction(userId, mobile, config, payload, io) {
    try {
        const templateId = payload.failover_template_id || config.templateId || config.template_id;
        console.log(`🤖 Automation: Triggering SMS Send for ${mobile}. Template ID: ${templateId}`);
        let smsContent = config.message || config.body;

        if (templateId) {
            // 1. Try matching against platform-created templates
            const [temps] = await query(
                'SELECT id, body, metadata FROM message_templates WHERE (id = ? OR name = ?) AND channel = "sms" AND user_id = ?', 
                [templateId, templateId, userId]
            );

            if (temps.length > 0) {
                const tpl = temps[0];
                console.log(`🔍 [AutomationService] Platform template match found: ID=${tpl.id}`);
                smsContent = tpl.body;
                try {
                    const meta = typeof tpl.metadata === 'string' ? JSON.parse(tpl.metadata) : (tpl.metadata || {});
                    config.peId = meta.peId || meta.pe_id;
                    config.hashId = meta.hashId || meta.hash_id;
                    config.sender = meta.sender || meta.senderId || config.sender;
                } catch(e) {}
            } else {
                // 2. Try matching against DLT templates (using temp_id)
                console.log(`🔍 [AutomationService] No platform template match. Checking DLT templates for temp_id: ${templateId}...`);
                const [dltTemps] = await query(
                    'SELECT template_text as body, sender, pe_id, hash_id FROM dlt_templates WHERE temp_id = ? AND user_id = ?',
                    [templateId, userId]
                );

                if (dltTemps.length > 0) {
                    const dlt = dltTemps[0];
                    console.log(`🔍 [AutomationService] DLT template match found for temp_id: ${templateId}`);
                    smsContent = dlt.body;
                    config.peId = dlt.pe_id;
                    config.hashId = dlt.hash_id;
                    config.sender = dlt.sender;
                } else {
                    console.error(`❌ [AutomationService] No SMS Template found (Platform or DLT) matching ID: ${templateId}`);
                }
            }
        }

        if (smsContent) {
            smsContent = await replaceVariables(userId, mobile, smsContent, payload.variables || {});
            

            const deduction = await deductSingleMessageCredit(userId, 'sms', templateId || 'failover_sms');
            if (deduction.success) {
                const smsResult = await sendSMS(mobile, smsContent, {
                    userId,
                    templateId,
                    peId: config.peId,
                    hashId: config.hashId,
                    sender: config.sender
                });
                
                if (smsResult.success) {
                    // 1. Log to webhook_logs (For Live Chat)
                    await logWebhook(userId, mobile, smsContent, 'sms', io);
                    console.log(`✅ [AutomationService] SMS Fallback Sent to ${mobile}. MsgID: ${smsResult.messageId}`);

                    // 2. Log to message_logs (For Detailed Reports)
                    const campaignId = payload.campaign_id || null;
                    const campaignName = payload.campaign_name || 'Failover Campaign';
                    const originalMsgId = payload.messageId || 'N/A';
                    const isApiLog = payload.is_api === true;
                    const logsTable = isApiLog ? 'api_message_logs' : 'message_logs';
                    const campaignsTable = isApiLog ? 'api_campaigns' : 'campaigns';

                    try {
                        await query(
                            `INSERT INTO ${logsTable} (user_id, campaign_id, campaign_name, recipient, status, channel, message_id, message_content, failure_reason, send_time, template_name) 
                             VALUES (?, ?, ?, ?, 'sent', 'sms', ?, ?, ?, NOW(), ?)`,
                            [userId, campaignId, campaignName, mobile, smsResult.messageId, smsContent, `Failover from RCS: ${originalMsgId}`, templateId]
                        );

                        // 3. Update Campaign Sent Count
                        if (campaignId) {
                            await query(`UPDATE ${campaignsTable} SET sent_count = sent_count + 1 WHERE id = ?`, [campaignId]);
                        }
                    } catch (logErr) {
                        console.error('❌ [AutomationService] Failed to log failover SMS to message_logs:', logErr.message);
                    }
                } else {
                    console.error(`❌ [AutomationService] SMS Fallback Failed for ${mobile}:`, smsResult.error || 'Unknown Error');
                }
            } else {
                console.warn(`⚠️ [AutomationService] SMS Failover failed: ${deduction.message}`);
            }
        }
    } catch (err) {
        console.error('❌ [AutomationService] handleSmsAction error:', err.message);
    }
}

module.exports = { ensureAutomationsTable, processAutomation, executeNode };
