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
            `SELECT c.*, u.credits_available, u.wallet_balance, 
                    u.rcs_text_price, u.rcs_rich_card_price, u.rcs_carousel_price,
                    u.wa_marketing_price, u.wa_utility_price, u.wa_authentication_price
             FROM ${campaignTable} c 
             JOIN users u ON c.user_id = u.id 
             WHERE c.id = ?`,
            [campaignId]
        );

        if (campaigns.length === 0) {
            return { success: false, message: 'Campaign or user not found' };
        }

        const campaign = campaigns[0];

        // 2. Check if already deducted
        if (campaign.credits_deducted) {
            return { success: true, message: 'Credits already deducted for this campaign' };
        }

        // 3. Calculate total cost based on channel and template type
        const recipientCount = campaign.recipient_count || campaign.audience_count || 0;

        if (recipientCount === 0) {
            return { success: true, message: 'No recipients to deduct credits for' };
        }

        let costPerMsg = 1.0; // Default
        const channel = (campaign.channel || '').toLowerCase();

        if (channel === 'rcs') {
            let templateType = (campaign.template_type || 'standard').toLowerCase();

            // If template_type is missing in campaign, fetch it from message_templates
            if (!campaign.template_type && (campaign.template_id || campaign.template_name)) {
                const [tmpl] = await query(
                    'SELECT template_type FROM message_templates WHERE id = ? OR name = ? LIMIT 1',
                    [campaign.template_id, campaign.template_name]
                );
                if (tmpl && tmpl.length > 0) {
                    templateType = (tmpl[0].template_type || 'standard').toLowerCase();
                    console.log(`[WalletService] Found template type: ${templateType} for campaign ${campaignId}`);
                }
            }

            if (templateType === 'standard' || templateType === 'text' || templateType === 'text_message') {
                costPerMsg = parseFloat(campaign.rcs_text_price || 1.00);
            } else if (templateType === 'rich_card' || templateType === 'rich-card') {
                costPerMsg = parseFloat(campaign.rcs_rich_card_price || 1.00);
            } else if (templateType === 'carousel') {
                costPerMsg = parseFloat(campaign.rcs_carousel_price || 1.00);
            }
        } else if (channel === 'sms') {
            costPerMsg = 0.25; // Example fixed price for SMS
        } else if (channel === 'whatsapp') {
            // WhatsApp per-category pricing
            let category = 'marketing';
            const [tmpl] = await query(
                'SELECT category FROM message_templates WHERE id = ? OR name = ? LIMIT 1',
                [campaign.template_id || campaign.template_name, campaign.template_name || campaign.template_id]
            );
            
            if (tmpl && tmpl.length > 0) {
                category = (tmpl[0].category || 'marketing').toLowerCase();
                console.log(`[WalletService] Found WhatsApp category: ${category} for campaign ${campaignId}`);
            }

            if (category === 'marketing') {
                costPerMsg = parseFloat(campaign.wa_marketing_price || 1.00);
            } else if (category === 'utility') {
                costPerMsg = parseFloat(campaign.wa_utility_price || 1.00);
            } else if (category === 'authentication') {
                costPerMsg = parseFloat(campaign.wa_authentication_price || 1.00);
            } else {
                costPerMsg = parseFloat(campaign.wa_marketing_price || 1.00);
            }
        }

        const totalCost = recipientCount * costPerMsg;

        console.log(`[WalletService] Campaign ${campaignId} Analysis:`, {
            recipientCount,
            costPerMsg,
            totalCost,
            userBalance: campaign.wallet_balance,
            userId: campaign.user_id
        });

        // 4. Check balance with robust validation
        let finalCost = totalCost;
        if (isNaN(finalCost) || finalCost < 0) {
            console.warn(`[WalletService] Invalid cost calculated for campaign ${campaignId}. Defaulting to 1.0 per msg.`);
            finalCost = recipientCount * 1.0;
        }

        // If cost is 0 but there are recipients, we still enforce a minimum to prevent free leaks 
        // unless explicitly intended (not likely here).
        if (finalCost === 0 && recipientCount > 0) {
            finalCost = recipientCount * 0.01; 
        }

        if (campaign.wallet_balance < finalCost || campaign.wallet_balance <= 0) {
            console.warn(`[WalletService] User ${campaign.user_id} has insufficient balance (${campaign.wallet_balance}) for campaign ${campaignId} (cost: ${finalCost})`);
            return { success: false, message: 'Insufficient wallet balance' };
        }

        // 5. Perform deduction in a transaction (conceptually, or serial queries)
        // UPDATE user balance
        await query(
            `UPDATE users 
             SET credits_available = COALESCE(credits_available, 0) - ?,
                 wallet_balance = COALESCE(wallet_balance, 0) - ?,
                 credits_used = COALESCE(credits_used, 0) + ?
             WHERE id = ?`,
            [finalCost, finalCost, finalCost, campaign.user_id]
        );

        // CREATE single transaction record
        await query(
            `INSERT INTO transactions (user_id, type, amount, credits, description, status, created_at)
             VALUES (?, 'debit', ?, ?, ?, 'completed', NOW())`,
            [
                campaign.user_id,
                totalCost,
                totalCost,
                `Campaign Deduction: ${campaign.name || campaignId} (${recipientCount} messages)`,
            ]
        );

        // MARK campaign as deducted
        await query(
            `UPDATE ${campaignTable} SET credits_deducted = 1 WHERE id = ?`,
            [campaignId]
        );

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
            `SELECT id, wallet_balance, 
                    rcs_text_price, rcs_rich_card_price, rcs_carousel_price,
                    wa_marketing_price, wa_utility_price, wa_authentication_price
             FROM users WHERE id = ?`, 
            [userId]
        );

        if (users.length === 0) return { success: false, message: 'User not found' };
        const user = users[0];

        let cost = 1.0;
        const chan = (channel || '').toLowerCase();

        if (chan === 'rcs') {
            const type = (templateType || 'standard').toLowerCase();
            if (type === 'standard' || type === 'text' || type === 'text_message') cost = parseFloat(user.rcs_text_price || 1.0);
            else if (type === 'rich_card' || type === 'rich-card') cost = parseFloat(user.rcs_rich_card_price || 1.0);
            else if (type === 'carousel') cost = parseFloat(user.rcs_carousel_price || 1.0);
        } else if (chan === 'whatsapp') {
            let category = 'marketing';
            const [tmpl] = await query('SELECT category FROM message_templates WHERE name = ? AND user_id = ? LIMIT 1', [templateName, userId]);
            if (tmpl && tmpl.length > 0) category = (tmpl[0].category || 'marketing').toLowerCase();

            if (category === 'utility') cost = parseFloat(user.wa_utility_price || 1.0);
            else if (category === 'authentication') cost = parseFloat(user.wa_authentication_price || 1.0);
            else cost = parseFloat(user.wa_marketing_price || 1.0);
        } else if (chan === 'sms') {
            cost = 0.25;
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
