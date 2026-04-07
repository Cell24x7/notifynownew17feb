const { query, pool } = require('../config/db');

/**
 * Deducts credits for a campaign upfront with atomic transaction.
 * @param {string} campaignId 
 * @param {string} campaignTable Defaults to 'campaigns'
 * @returns {Promise<{success: boolean, message: string}>}
 */
const deductCampaignCredits = async (campaignId, campaignTable = 'campaigns') => {
    let connection;
    try {
        // 1. Fetch campaign and user details (Pre-check)
        const [campaigns] = await query(
            `SELECT c.*, u.id as u_id, u.credits_available, u.wallet_balance, u.role, 
                    u.rcs_text_price, u.rcs_rich_card_price, u.rcs_carousel_price,
                    u.wa_marketing_price, u.wa_utility_price, u.wa_authentication_price,
                    u.sms_promotional_price, u.sms_transactional_price, u.sms_service_price
             FROM ${campaignTable} c 
             JOIN users u ON c.user_id = u.id 
             WHERE c.id = ?`,
            [campaignId]
        );

        if (campaigns.length === 0) return { success: false, message: 'Campaign or user not found' };
        const campaign = campaigns[0];

        // 2. Admin Check: Unlimited Credits
        if (campaign.role === 'admin' || campaign.role === 'superadmin') {
            return { success: true, message: 'Admin: Unlimited credits' };
        }

        // 3. ATOMIC LOCK CHECK: Use a single update to claim deduction rights (credits_deducted = 2 means in-progress)
        const [lockResult] = await query(
            `UPDATE ${campaignTable} SET credits_deducted = 2 WHERE id = ? AND (credits_deducted = 0 OR credits_deducted IS NULL)`,
            [campaignId]
        );

        if (lockResult.affectedRows === 0) {
            return { success: true, message: 'Deduction already handled or in progress' };
        }

        // 4. Calculate total cost based on channel and template type
        const recipientCount = Number(campaign.recipient_count || campaign.audience_count || 0);
        if (recipientCount === 0) {
            await query(`UPDATE ${campaignTable} SET credits_deducted = 1 WHERE id = ?`, [campaignId]);
            return { success: true, message: 'No recipients to deduct' };
        }

        let costPerMsg = 1.0; 
        const channel = (campaign.channel || '').toLowerCase();

        if (channel === 'rcs') {
            let templateType = (campaign.template_type || 'standard').toLowerCase();
            if (!campaign.template_type && (campaign.template_id || campaign.template_name)) {
                const [tmpl] = await query('SELECT template_type FROM message_templates WHERE id = ? OR name = ? LIMIT 1', [campaign.template_id, campaign.template_name]);
                if (tmpl?.[0]) templateType = (tmpl[0].template_type || 'standard').toLowerCase();
            }
            if (templateType === 'standard' || templateType === 'text' || templateType === 'text_message') costPerMsg = parseFloat(campaign.rcs_text_price || 1.00);
            else if (templateType === 'rich_card' || templateType === 'rich-card') costPerMsg = parseFloat(campaign.rcs_rich_card_price || 1.00);
            else if (templateType === 'carousel') costPerMsg = parseFloat(campaign.rcs_carousel_price || 1.00);
        } else if (channel === 'sms') {
            let cat = 'promotional';
            const [tmpl] = await query('SELECT category FROM message_templates WHERE name = ? OR id = ? LIMIT 1', [campaign.template_name || campaign.template_id, campaign.template_id || campaign.template_name]);
            if (tmpl?.[0]) cat = (tmpl[0].category || 'promotional').toLowerCase();
            
            const name = (campaign.template_name || '').toLowerCase();
            if (cat === 'transactional' || cat === 'otp' || cat === 'auth' || name.includes('otp') || name.includes('auth')) {
                costPerMsg = parseFloat(campaign.sms_transactional_price || 1.00);
            } else if (cat === 'service' || cat === 'utility' || name.includes('alert')) {
                costPerMsg = parseFloat(campaign.sms_service_price || 1.00);
            } else {
                costPerMsg = parseFloat(campaign.sms_promotional_price || 1.00);
            }
        } else if (channel === 'whatsapp') {
            let cat = 'marketing';
            const [tmpl] = await query('SELECT category FROM message_templates WHERE name = ? OR id = ? LIMIT 1', [campaign.template_name || campaign.template_id, campaign.template_id || campaign.template_name]);
            if (tmpl?.[0]) cat = (tmpl[0].category || 'marketing').toLowerCase();
            
            const name = (campaign.template_name || '').toLowerCase();
            if (cat === 'authentication' || name.includes('otp')) costPerMsg = parseFloat(campaign.wa_authentication_price || 1.00);
            else if (cat === 'utility' || name.includes('alert')) costPerMsg = parseFloat(campaign.wa_utility_price || 1.00);
            else costPerMsg = parseFloat(campaign.wa_marketing_price || 1.00);
        }

        let smsParts = 1;
        if (channel === 'sms') {
            try {
                const meta = typeof campaign.template_metadata === 'string' ? JSON.parse(campaign.template_metadata) : (campaign.template_metadata || {});
                smsParts = parseInt(meta.sms_parts) || 1;
            } catch (e) { console.error('[Wallet] SMS parts parse error:', e); }
        }

        const rawCost = recipientCount * costPerMsg * smsParts;
        const totalCost = (isNaN(rawCost) || rawCost < 0) ? (recipientCount * 1.0 * smsParts) : rawCost;

        if (campaign.wallet_balance < totalCost) {
            // Unlock so user can retry after recharge
            await query(`UPDATE ${campaignTable} SET credits_deducted = 0 WHERE id = ?`, [campaignId]);
            return { 
                success: false, 
                message: `Insufficient balance. Required ₹${totalCost.toFixed(4)}, available ₹${(campaign.wallet_balance || 0).toFixed(4)}` 
            };
        }

        // 5. START TRANSACTION FOR ATOMIC DEDUCTION
        connection = await pool.promise().getConnection();
        await connection.beginTransaction();

        try {
            // A. Update User Balance
            await connection.query(
                `UPDATE users 
                 SET credits_available = COALESCE(credits_available, 0) - ?,
                     wallet_balance = COALESCE(wallet_balance, 0) - ?,
                     credits_used = COALESCE(credits_used, 0) + ?
                 WHERE id = ?`,
                [totalCost, totalCost, totalCost, campaign.u_id]
            );

            // B. Log Transaction
            await connection.query(
                `INSERT INTO transactions (user_id, type, amount, credits, description, status, created_at)
                 VALUES (?, 'debit', ?, ?, ?, 'completed', NOW())`,
                [campaign.u_id, totalCost, totalCost, `Campaign: ${campaign.name || campaignId} (${recipientCount} recipients)`]
            );

            // C. Finalize Campaign Marker (credits_deducted = 1 means success)
            await connection.query(`UPDATE ${campaignTable} SET credits_deducted = 1 WHERE id = ?`, [campaignId]);

            await connection.commit();
            console.log(`✅ [WalletService] Atomic deduction successful for campaign ${campaignId}. Deducted: ${totalCost}`);
            return { success: true, message: `Successfully deducted ₹${totalCost.toFixed(4)}` };

        } catch (innerErr) {
            await connection.rollback();
            throw innerErr;
        }

    } catch (error) {
        console.error(`❌ [WalletService] FATAL ERROR during deduction for campaign ${campaignId}:`, error);
        // Attempt to reset lock if we haven't committed
        try { await query(`UPDATE ${campaignTable} SET credits_deducted = 0 WHERE id = ?`, [campaignId]); } catch (e) {}
        return { success: false, message: `Billing error: ${error.message}` };
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Deducts credit for a single message with atomic transaction.
 * @param {string} userId
 * @param {string} channel
 * @param {string} templateName
 * @param {string} templateType
 * @returns {Promise<{success: boolean, message: string, cost: number}>}
 */
const deductSingleMessageCredit = async (userId, channel, templateName, templateType = 'standard') => {
    let connection;
    try {
        const [users] = await query(
            `SELECT id, wallet_balance, role, 
                    rcs_text_price, rcs_rich_card_price, rcs_carousel_price,
                    wa_marketing_price, wa_utility_price, wa_authentication_price,
                    sms_promotional_price, sms_transactional_price, sms_service_price
             FROM users WHERE id = ?`, 
            [userId]
        );

        if (users.length === 0) return { success: false, message: 'User not found' };
        const user = users[0];

        if (user.role === 'admin' || user.role === 'superadmin') {
            return { success: true, message: 'Admin: Unlimited credits', cost: 0 };
        }

        let cost = 1.0;
        const chan = (channel || '').toLowerCase();

        if (chan === 'rcs') {
            const type = (templateType || 'standard').toLowerCase();
            if (type === 'standard' || type === 'text' || type === 'text_message') cost = parseFloat(user.rcs_text_price || 1.0);
            else if (type === 'rich_card' || type === 'rich-card') cost = parseFloat(user.rcs_rich_card_price || 1.0);
            else if (type === 'carousel') cost = parseFloat(user.rcs_carousel_price || 1.0);
        } else if (chan === 'whatsapp') {
            let cat = 'marketing';
            const name = (templateName || '').toLowerCase();
            const [tmpl] = await query('SELECT category FROM message_templates WHERE name = ? AND user_id = ? LIMIT 1', [templateName, userId]);
            if (tmpl?.[0]) cat = (tmpl[0].category || 'marketing').toLowerCase();

            if (cat === 'authentication' || name.includes('otp') || name.includes('auth')) cost = parseFloat(user.wa_authentication_price || 1.0);
            else if (cat === 'utility' || name.includes('service') || name.includes('alert')) cost = parseFloat(user.wa_utility_price || 1.0);
            else cost = parseFloat(user.wa_marketing_price || 1.0);
        } else if (chan === 'sms') {
            let cat = 'promotional';
            const name = (templateName || '').toLowerCase();
            const [tmpl] = await query('SELECT category FROM message_templates WHERE name = ? AND user_id = ? LIMIT 1', [templateName, userId]);
            if (tmpl?.[0]) cat = (tmpl[0].category || 'promotional').toLowerCase();

            if (cat === 'transactional' || cat === 'otp' || cat === 'auth' || name.includes('otp') || name.includes('verify')) {
                cost = parseFloat(user.sms_transactional_price || 1.00);
            } else if (cat === 'service' || cat === 'utility' || name.includes('alert')) {
                cost = parseFloat(user.sms_service_price || 1.00);
            } else {
                cost = parseFloat(user.sms_promotional_price || 1.00);
            }
        }
        
        if (isNaN(cost) || cost < 0) cost = 1.0;
        if (cost === 0) cost = 0.01;

        if (user.wallet_balance < cost) {
            return { success: false, message: 'Insufficient wallet balance' };
        }

        // START TRANSACTION
        connection = await pool.promise().getConnection();
        await connection.beginTransaction();

        try {
            await connection.query(
                `UPDATE users 
                 SET credits_available = COALESCE(credits_available, 0) - ?,
                     wallet_balance = COALESCE(wallet_balance, 0) - ?,
                     credits_used = COALESCE(credits_used, 0) + ?
                 WHERE id = ?`,
                [cost, cost, cost, userId]
            );

            await connection.query(
                `INSERT INTO transactions (user_id, type, amount, credits, description, status, created_at)
                 VALUES (?, 'debit', ?, ?, ?, 'completed', NOW())`,
                [userId, cost, cost, `Single Send (${chan}): ${templateName}`]
            );

            await connection.commit();
            return { success: true, message: 'Credit deducted', cost };
        } catch (innerErr) {
            await connection.rollback();
            throw innerErr;
        }
    } catch (error) {
        console.error('❌ [WalletService] Single deduction error:', error);
        return { success: false, message: error.message };
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    deductCampaignCredits,
    deductSingleMessageCredit
};
