const { query } = require('../config/db');
const { sendRcsMessage } = require('./rcsService');
const { deductSingleMessageCredit } = require('./walletService');
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
        console.log('✅ [AutomationService] automations table ready');
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
        const [automations] = await query(
            "SELECT * FROM automations WHERE user_id = ? AND status = 'active' AND channel = ?",
            [userId, channel]
        );

        if (!automations || automations.length === 0) return;

        for (const automation of automations) {
            const nodes = typeof automation.nodes === 'string' ? JSON.parse(automation.nodes) : automation.nodes;
            const edges = typeof automation.edges === 'string' ? JSON.parse(automation.edges) : automation.edges;

            let entryNode = null;

            // 1. Detect if this is a button/list click (Continuation)
            const buttonId = payload.buttonId || payload.listId;
            if (buttonId) {
                console.log(`🤖 [AutomationService] Button click detected: ${buttonId}. Finding branch...`);
                const followEdge = edges.find(e => e.sourceHandle === buttonId);
                if (followEdge) {
                    entryNode = nodes.find(n => n.id === followEdge.target);
                    console.log(`🤖 [AutomationService] Continuing flow from branch target: ${entryNode?.id}`);
                }
            }

            // 2. Fallback to Trigger Node if no branch matched and trigger matches
            if (!entryNode && triggerType === automation.trigger_type) {
                const triggerNode = nodes.find(n => n.type === 'trigger');
                if (triggerNode) {
                    // Check conditions if it's a message trigger
                    if (triggerType === 'new_message') {
                        const matched = checkTriggerConditions(triggerNode, payload.message_content);
                        if (matched) entryNode = triggerNode;
                    } else {
                        entryNode = triggerNode;
                    }
                }
            }

            if (entryNode) {
                console.log(`🤖 [AutomationService] Running flow: ${automation.name} for ${payload.sender}`);
                await executeNode(userId, entryNode, nodes, edges, channel, payload, io);
                await query("UPDATE automations SET trigger_count = trigger_count + 1, last_triggered = CURRENT_TIMESTAMP WHERE id = ?", [automation.id]);
            }
        }
    } catch (err) {
        console.error('❌ [AutomationService] processAutomation error:', err.message);
    }
}

function checkTriggerConditions(node, messageText) {
    if (!node.data || !node.data.keywords || node.data.keywords.length === 0) return true;
    
    const text = (messageText || '').toLowerCase().trim();
    const keywords = node.data.keywords.map(kw => kw.toLowerCase().trim());
    return keywords.some(kw => text === kw || text.includes(kw));
}

async function executeNode(userId, currentNode, allNodes, allEdges, channel, payload, io) {
    const nextEdges = allEdges.filter(e => e.source === currentNode.id);
    
    if (currentNode.type === 'trigger') {
        // Trigger just passes through to next
        for (const edge of nextEdges) {
            const nextNode = allNodes.find(n => n.id === edge.target);
            if (nextNode) await executeNode(userId, nextNode, allNodes, allEdges, channel, payload, io);
        }
    } else if (currentNode.type === 'condition') {
        // ... (Condition logic stays same as before, but ensure it uses the central logic)
        const matched = checkTriggerConditions(currentNode, payload.message_content); 
        if (matched) {
            for (const edge of nextEdges) {
                const nextNode = allNodes.find(n => n.id === edge.target);
                if (nextNode) {
                    // Small delay for natural flow
                    await new Promise(r => setTimeout(r, 800));
                    await executeNode(userId, nextNode, allNodes, allEdges, channel, payload, io);
                }
            }
        }
        if (actionType === 'auto_reply' || actionType === 'auto_reply_buttons' || actionType === 'send_message' || actionType === 'auto_reply_template') {
            
            if (actionType === 'auto_reply_template' && config.templateId) {
                text = `[Template: ${config.templateId}]`; 
            }

            // 1. Variable Replacement (e.g. {{name}})
            text = await replaceVariables(userId, mobile, text);

            // 2. Credit Deduction
            const templateName = config.templateId || 'automation_reply';
            const deduction = await deductSingleMessageCredit(userId, channel, templateName);
            if (!deduction.success) {
                console.warn(`🛑 [AutomationService] Insufficient credits for user ${userId}. Skipping message.`);
                return;
            }

            // 3. Send Message
            if (channel === 'whatsapp') {
                await sendWhatsAppReply(userId, payload.sender, text, config);
            } else if (channel === 'rcs') {
                await sendRcsReply(userId, payload.sender, text);
            }

            // Log & Notify
            await logWebhook(userId, payload.sender, text, channel, io);

            // 🛑 STOP RECURSION if this node has buttons (Wait for next click)
            const hasButtons = config.messageType === 'button_flow' && config.buttons && config.buttons.length > 0;
            if (hasButtons) {
                console.log(`🛑 [AutomationService] Flow paused at Interactive Node ${currentNode.id}. Waiting for button click.`);
                return; 
            }
            
            // Wait slightly before next message if sequential
            await new Promise(r => setTimeout(r, 1200));
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

        // Standard recursion for non-interactive action nodes
        for (const edge of nextEdges) {
            // Important: Don't execute branch edges here, they should only be triggered by button clicks
            if (edge.sourceHandle) continue; 
            const nextNode = allNodes.find(n => n.id === edge.target);
            if (nextNode) await executeNode(userId, nextNode, allNodes, allEdges, channel, payload, io);
        }
    }
}

async function logWebhook(userId, recipient, text, channel, io, status = 'sent') {
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
        if (!configs || configs.length === 0) return false;
        const cfg = configs[0];
        const isPinbot = cfg.provider === 'vendor2';
        const mobile = to.replace(/\D/g, '');

        const msgUrl = isPinbot ? `${PINBOT_BASE}/${cfg.ph_no_id}/messages` : `${GRAPH_BASE}/${cfg.ph_no_id}/messages`;
        const headers = isPinbot ? { apikey: cfg.api_key } : { Authorization: `Bearer ${cfg.wa_token}` };

        let payload = {
            messaging_product: 'whatsapp',
            to: mobile
        };

        // Determine message type (interactive vs text)
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

        await axios.post(msgUrl, payload, { headers: { ...headers, 'Content-Type': 'application/json' } });
        return true;
    } catch (err) {
        console.error('[AutomationService] WA send error:', err.response?.data || err.message);
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
        console.error('[AutomationService] RCS send error:', err.message);
        return false;
    }
}

async function replaceVariables(userId, mobile, text) {
    if (!text || !text.includes('{{')) return text;
    try {
        const [contacts] = await query('SELECT * FROM contacts WHERE user_id = ? AND (phone = ? OR phone = ?)', [userId, mobile, mobile]);
        if (contacts.length === 0) return text;
        
        const contact = contacts[0];
        let newText = text;
        const vars = {
            name: contact.name || 'User',
            first_name: (contact.name || 'User').split(' ')[0],
            phone: contact.phone,
            email: contact.email || ''
        };

        for (const [key, val] of Object.entries(vars)) {
            const regex = new RegExp(`{{${key}}}`, 'gi');
            newText = newText.replace(regex, val || '');
        }
        return newText;
    } catch (e) {
        return text;
    }
}

module.exports = { ensureAutomationsTable, processAutomation, executeNode };
