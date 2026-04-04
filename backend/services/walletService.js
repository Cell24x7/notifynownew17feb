const { query } = require('../config/db');

/**
 * Deducts credits for a campaign upfront.
 * @param {string} campaignId 
 * @param {string} campaignTable Defaults to 'campaigns'
 * @returns {Promise<{success: boolean, message: string}>}
 */
const deductCampaignCredits = async (campaignId, campaignTable = 'campaigns') => {
    try {
        // 1. Fetch campaign and user details
        const [campaigns] = await query(
            `SELECT c.*, u.credits_available, u.wallet_balance, u.role, 
                    u.rcs_text_price, u.rcs_rich_card_price, u.rcs_carousel_price,
                    u.wa_marketing_price, u.wa_utility_price, u.wa_authentication_price,
                    u.sms_promotional_price, u.sms_transactional_price, u.sms_service_price
             FROM ${campaignTable} c 
             JOIN users u ON c.user_id = u.id 
             WHERE c.id = ?`,
            [campaignId]
        );

        if (campaigns.length === 0) {
            return { success: false, message: 'Campaign or user not found' };
        }

        const campaign = campaigns[0];

        // 2. Admin Check: Unlimited Credits
        if (campaign.role === 'admin' || campaign.role === 'superadmin') {
            return { success: true, message: 'Admin: Unlimited credits' };
        }

        // 2. ATOMIC LOCK CHECK: Use a single update to claim deduction rights
        // This prevents race conditions where two processes see credits_deducted as 0
        const [lockResult] = await query(
            `UPDATE ${campaignTable} SET credits_deducted = 2 WHERE id = ? AND (credits_deducted = 0 OR credits_deducted IS NULL)`,
            [campaignId]
        );

        if (lockResult.affectedRows === 0) {
            // Either already deducted (1) or being processed (2)
            return { success: true, message: 'Deduction already handled' };
        }

        // 3. Calculate total cost based on channel and template type
        const recipientCount = campaign.recipient_count || campaign.audience_count || 0;
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
                if (tmpl && tmpl.length > 0) templateType = (tmpl[0].template_type || 'standard').toLowerCase();
            }
            if (templateType === 'standard' || templateType === 'text' || templateType === 'text_message') costPerMsg = parseFloat(campaign.rcs_text_price || 1.00);
            else if (templateType === 'rich_card' || templateType === 'rich-card') costPerMsg = parseFloat(campaign.rcs_rich_card_price || 1.00);
            else if (templateType === 'carousel') costPerMsg = parseFloat(campaign.rcs_carousel_price || 1.00);
        } else if (channel === 'sms') {
            let cat = 'promotional';
            const name = (campaign.template_name || '').toLowerCase();
            const [tmpl] = await query('SELECT category FROM message_templates WHERE id = ? OR name = ? LIMIT 1', [campaign.template_id || campaign.template_name, campaign.template_name || campaign.template_id]);
            if (tmpl && tmpl.length > 0) cat = (tmpl[0].category || 'promotional').toLowerCase();
            
            // Smart Match: Check category OR template name keywords
            if (cat === 'transactional' || cat === 'otp' || cat === 'auth' || name.includes('otp') || name.includes('auth') || name.includes('verify')) {
                costPerMsg = parseFloat(campaign.sms_transactional_price || 1.00);
            } else if (cat === 'service' || cat === 'utility' || cat === 'alert' || name.includes('alert') || name.includes('notice')) {
                costPerMsg = parseFloat(campaign.sms_service_price || 1.00);
            } else {
                costPerMsg = parseFloat(campaign.sms_promotional_price || 1.00);
            }
        } else if (channel === 'whatsapp') {
            let cat = 'marketing';
            const name = (campaign.template_name || '').toLowerCase();
            const [tmpl] = await query('SELECT category FROM message_templates WHERE id = ? OR name = ? LIMIT 1', [campaign.template_id || campaign.template_name, campaign.template_name || campaign.template_id]);
            if (tmpl && tmpl.length > 0) cat = (tmpl[0].category || 'marketing').toLowerCase();
            
            if (cat === 'authentication' || name.includes('otp') || name.includes('auth')) costPerMsg = parseFloat(campaign.wa_authentication_price || 1.00);
            else if (cat === 'utility' || name.includes('service') || name.includes('alert')) costPerMsg = parseFloat(campaign.wa_utility_price || 1.00);
            else costPerMsg = parseFloat(campaign.wa_marketing_price || 1.00);
        }

        const totalCost = recipientCount * costPerMsg;
        let finalCost = isNaN(totalCost) || totalCost < 0 ? (recipientCount * 1.0) : totalCost;
        if (finalCost === 0 && recipientCount > 0) finalCost = recipientCount * 0.01;

        console.log(`[WalletService] Campaign ${campaignId} Analysis:`, { recipientCount, costPerMsg, totalCost: finalCost, userBalance: campaign.wallet_balance });

        if (campaign.wallet_balance < finalCost || campaign.wallet_balance <= 0) {
            // Rollback lock if insufficient funds
            await query(`UPDATE ${campaignTable} SET credits_deducted = 0 WHERE id = ?`, [campaignId]);
            return { success: false, message: 'Insufficient wallet balance' };
        }

        // 4. Execute final deduction
        await query(
            `UPDATE users 
             SET credits_available = COALESCE(credits_available, 0) - ?,
                 wallet_balance = COALESCE(wallet_balance, 0) - ?,
                 credits_used = COALESCE(credits_used, 0) + ?
             WHERE id = ?`,
            [finalCost, finalCost, finalCost, campaign.user_id]
        );

        await query(
            `INSERT INTO transactions (user_id, type, amount, credits, description, status, created_at)
             VALUES (?, 'debit', ?, ?, ?, 'completed', NOW())`,
            [campaign.user_id, finalCost, finalCost, `Campaign Deduction: ${campaign.name || campaignId} (${recipientCount} messages)`]
        );

        // Permanently mark as successfully deducted (1)
        await query(`UPDATE ${campaignTable} SET credits_deducted = 1 WHERE id = ?`, [campaignId]);

        console.log(`[WalletService] Deducted ${totalCost} credits for campaign ${campaignId} (User: ${campaign.user_id})`);
        return { success: true, message: `Successfully deducted ${totalCost} credits` };

    } catch (error) {
        console.error(`[WalletService] Error deducting credits for campaign ${campaignId}:`, error);
        return { success: false, message: error.message };
    }
};

/**
 * Deducts credit for a single message.
 * @param {string} userId
 * @param {string} channel
 * @param {string} templateName
 * @param {string} templateType
 * @returns {Promise<{success: boolean, message: string, cost: number}>}
 */
const deductSingleMessageCredit = async (userId, channel, templateName, templateType = 'standard') => {
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

        // Admin Check: Unlimited Credits
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
            if (tmpl && tmpl.length > 0) cat = (tmpl[0].category || 'marketing').toLowerCase();

            if (cat === 'authentication' || name.includes('otp') || name.includes('auth')) cost = parseFloat(user.wa_authentication_price || 1.0);
            else if (cat === 'utility' || name.includes('service') || name.includes('alert')) cost = parseFloat(user.wa_utility_price || 1.0);
            else cost = parseFloat(user.wa_marketing_price || 1.0);
        } else if (chan === 'sms') {
            let cat = 'promotional';
            const name = (templateName || '').toLowerCase();
            const [tmpl] = await query('SELECT category FROM message_templates WHERE name = ? AND user_id = ? LIMIT 1', [templateName, userId]);
            if (tmpl && tmpl.length > 0) cat = (tmpl[0].category || 'promotional').toLowerCase();

            if (cat === 'transactional' || cat === 'otp' || cat === 'auth' || name.includes('otp') || name.includes('auth') || name.includes('verify')) {
                cost = parseFloat(user.sms_transactional_price || 1.00);
            } else if (cat === 'service' || cat === 'utility' || cat === 'alert' || name.includes('alert') || name.includes('notice')) {
                cost = parseFloat(user.sms_service_price || 1.00);
            } else {
                cost = parseFloat(user.sms_promotional_price || 1.00);
            }
        }
        if (isNaN(cost) || cost < 0) cost = 1.0;
        if (cost === 0) cost = 0.01;

        if (user.wallet_balance < cost || user.wallet_balance <= 0) {
            console.warn(`[WalletService] Single API: Insufficient balance for user ${userId}. Balance: ${user.wallet_balance}, Cost: ${cost}`);
            return { success: false, message: 'Insufficient wallet balance' };
        }

        await query(
            `UPDATE users 
             SET credits_available = COALESCE(credits_available, 0) - ?,
                 wallet_balance = COALESCE(wallet_balance, 0) - ?,
                 credits_used = COALESCE(credits_used, 0) + ?
             WHERE id = ?`,
            [cost, cost, cost, userId]
        );

        await query(
            `INSERT INTO transactions (user_id, type, amount, credits, description, status, created_at)
             VALUES (?, 'debit', ?, ?, ?, 'completed', NOW())`,
            [userId, cost, cost, `Single API Send (${chan}): ${templateName}`]
        );

        return { success: true, message: 'Credit deducted', cost };
    } catch (error) {
        console.error('[WalletService] Single deduction error:', error);
        return { success: false, message: error.message };
    }
};

module.exports = {
    deductCampaignCredits,
    deductSingleMessageCredit
};
