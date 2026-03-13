const { query } = require('../config/db');

/**
 * Automations Service
 * Handles graph-based workflow execution and table initialization.
 */

/**
 * Ensure the automations table exists
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

const { sendRcsMessage } = require('./rcsService');
const axios = require('axios');
const PINBOT_BASE = 'https://partnersv1.pinbot.ai/v3';
const GRAPH_BASE = 'https://graph.facebook.com/v19.0';

/**
 * processAutomation
 * Traverses the graph starting from the trigger node.
 */
async function processAutomation(userId, triggerType, channel, payload, io) {
    try {
        const [automations] = await query(
            "SELECT * FROM automations WHERE user_id = ? AND trigger_type = ? AND channel = ? AND status = 'active'",
            [userId, triggerType, channel]
        );

        if (!automations || automations.length === 0) return;

        for (const automation of automations) {
            console.log(`🤖 [AutomationService] Running flow: ${automation.name} for ${payload.sender}`);
            const nodes = typeof automation.nodes === 'string' ? JSON.parse(automation.nodes) : automation.nodes;
            const edges = typeof automation.edges === 'string' ? JSON.parse(automation.edges) : automation.edges;

            // 1. Find trigger node
            const triggerNode = nodes.find(n => n.type === 'trigger');
            if (!triggerNode) continue;

            // 2. Start traversal
            await executeNode(userId, triggerNode, nodes, edges, channel, payload, io);
            
            // 3. Update stats
            await query("UPDATE automations SET trigger_count = trigger_count + 1, last_triggered = CURRENT_TIMESTAMP WHERE id = ?", [automation.id]);
        }
    } catch (err) {
        console.error('❌ [AutomationService] processAutomation error:', err.message);
    }
}

async function executeNode(userId, currentNode, allNodes, allEdges, channel, payload, io) {
    const nextEdges = allEdges.filter(e => e.source === currentNode.id);
    if (!nextEdges.length && currentNode.type !== 'action') return;

    if (currentNode.type === 'trigger') {
        // Trigger just passes through to next
        for (const edge of nextEdges) {
            const nextNode = allNodes.find(n => n.id === edge.target);
            if (nextNode) await executeNode(userId, nextNode, allNodes, allEdges, channel, payload, io);
        }
    } else if (currentNode.type === 'condition') {
        const messageText = (payload.message_content || '').trim();
        const keywords = currentNode.data.keywords || [];
        const conditionType = currentNode.data.conditionType;
        const isCaseSensitive = currentNode.data.isCaseSensitive;

        let matched = false;
        const compare = (val, kw) => isCaseSensitive ? val.includes(kw) : val.toLowerCase().includes(kw.toLowerCase());
        const exactCompare = (val, kw) => isCaseSensitive ? val === kw : val.toLowerCase() === kw.toLowerCase();

        if (conditionType === 'any_message') {
            matched = true;
        } else if (conditionType === 'contains_keyword' || conditionType === 'keyword_match' || (!conditionType && keywords.length > 0)) {
            matched = keywords.some(kw => compare(messageText, kw));
        } else if (conditionType === 'exact_match') {
            matched = keywords.some(kw => exactCompare(messageText, kw));
        } else if (conditionType === 'starts_with') {
            matched = keywords.some(kw => isCaseSensitive ? messageText.startsWith(kw) : messageText.toLowerCase().startsWith(kw.toLowerCase()));
        } else if (conditionType === 'ends_with') {
            matched = keywords.some(kw => isCaseSensitive ? messageText.endsWith(kw) : messageText.toLowerCase().endsWith(kw.toLowerCase()));
        } else if (conditionType === 'regex_match' && keywords[0]) {
            try {
                const regex = new RegExp(keywords[0], isCaseSensitive ? '' : 'i');
                matched = regex.test(messageText);
            } catch (e) { console.error('[AutomationService] Invalid regex:', e.message); }
        }

        if (matched) {
            for (const edge of nextEdges) {
                const nextNode = allNodes.find(n => n.id === edge.target);
                if (nextNode) await executeNode(userId, nextNode, allNodes, allEdges, channel, payload, io);
            }
        }
    } else if (currentNode.type === 'action') {
        const actionType = currentNode.data.actionType;
        const config = currentNode.data.config || {};
        let text = config.message || config.body || currentNode.data.label;

        if (actionType === 'auto_reply' || actionType === 'auto_reply_buttons' || actionType === 'send_message' || actionType === 'auto_reply_template') {
            // Handle template specifically if needed
            if (actionType === 'auto_reply_template' && config.templateId) {
                // In a real system, we'd fetch the template body here. 
                // For now, we'll use the template name as the message or a placeholder.
                text = `[Template: ${config.templateId}]`; 
            }

            if (channel === 'whatsapp') {
                await sendWhatsAppReply(userId, payload.sender, text, config);
            } else if (channel === 'rcs') {
                await sendRcsReply(userId, payload.sender, text);
            }

            // Log the reply
            await query(
                'INSERT INTO webhook_logs (user_id, sender, recipient, message_content, status, type) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, 'System', payload.sender, text, 'sent', channel]
            );

            // Notify UI
            if (io) {
                io.to(`user_${userId}`).emit('new_message', {
                    sender: 'System',
                    recipient: payload.sender,
                    message_content: text,
                    created_at: new Date(),
                    status: 'sent',
                    type: channel
                });
            }
        }

        // Action can also have next nodes
        for (const edge of nextEdges) {
            const nextNode = allNodes.find(n => n.id === edge.target);
            if (nextNode) await executeNode(userId, nextNode, allNodes, allEdges, channel, payload, io);
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

        const payload = {
            messaging_product: 'whatsapp',
            to: mobile,
            type: 'text',
            text: { body: text }
        };

        await axios.post(msgUrl, payload, { headers: { ...headers, 'Content-Type': 'application/json' } });
        return true;
    } catch (err) {
        console.error('[AutomationService] WA send error:', err.message);
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

module.exports = { ensureAutomationsTable, processAutomation };
