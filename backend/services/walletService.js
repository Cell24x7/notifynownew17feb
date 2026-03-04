const { query } = require('../config/db');

/**
 * Deducts credits for a campaign upfront.
 * This prevents multiple transaction entries for the same campaign.
 * @param {string} campaignId 
 * @returns {Promise<{success: boolean, message: string}>}
 */
const deductCampaignCredits = async (campaignId) => {
    try {
        // 1. Fetch campaign and user details
        const [campaigns] = await query(
            `SELECT c.*, u.credits_available, u.wallet_balance, u.rcs_text_price, u.rcs_rich_card_price, u.rcs_carousel_price
             FROM campaigns c 
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

        if (campaign.channel === 'RCS') {
            const templateType = campaign.template_type || 'standard';
            if (templateType === 'standard') {
                costPerMsg = parseFloat(campaign.rcs_text_price || 0.10);
            } else if (templateType === 'rich_card') {
                costPerMsg = parseFloat(campaign.rcs_rich_card_price || 0.15);
            } else if (templateType === 'carousel') {
                costPerMsg = parseFloat(campaign.rcs_carousel_price || 0.20);
            }
        } else if (campaign.channel === 'SMS') {
            costPerMsg = 0.25; // Example fixed price for SMS
        } else if (campaign.channel === 'whatsapp') {
            costPerMsg = 0.35; // Example fixed price for WhatsApp
        }

        const totalCost = recipientCount * costPerMsg;

        // 4. Check balance
        if (campaign.wallet_balance < totalCost) {
            console.warn(`[WalletService] User ${campaign.user_id} has insufficient balance (${campaign.wallet_balance}) for campaign ${campaignId} (cost: ${totalCost})`);
        }

        // 5. Perform deduction in a transaction (conceptually, or serial queries)
        // UPDATE user balance
        await query(
            `UPDATE users 
             SET credits_available = credits_available - ?,
                 wallet_balance = wallet_balance - ?,
                 credits_used = credits_used + ?
             WHERE id = ?`,
            [totalCost, totalCost, totalCost, campaign.user_id]
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
            `UPDATE campaigns SET credits_deducted = 1 WHERE id = ?`,
            [campaignId]
        );

        console.log(`[WalletService] Deducted ${totalCost} credits for campaign ${campaignId} (User: ${campaign.user_id})`);
        return { success: true, message: `Successfully deducted ${totalCost} credits` };

    } catch (error) {
        console.error(`[WalletService] Error deducting credits for campaign ${campaignId}:`, error);
        return { success: false, message: error.message };
    }
};

module.exports = {
    deductCampaignCredits
};
