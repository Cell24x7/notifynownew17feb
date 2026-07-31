const { query } = require('../config/db');
const fs = require('fs');
const path = require('path');
const { createBroadcastCampaign } = require('./voiceService');

async function interceptEDPLCampaign(campaignId, campaign, vcConfig) {
    console.log(`[EDPL] Intercepting bulk campaign ${campaignId} for EDPL gateway...`);
    
    try {
        const [contacts] = await query('SELECT mobile, name FROM campaign_contacts WHERE campaign_id = ?', [campaignId]);
        if (contacts.length === 0) {
            throw new Error('No contacts found for EDPL campaign');
        }
        
        let csvContent = 'phone,name\n';
        contacts.forEach(c => {
            csvContent += `${c.mobile},${c.name || ''}\n`;
        });
        const csvBuffer = Buffer.from(csvContent, 'utf-8');
        
        const metadata = typeof campaign.template_metadata === 'string' ? JSON.parse(campaign.template_metadata || '{}') : (campaign.template_metadata || {});
        const audioId = metadata.audioId;
        
        if (!audioId || !audioId.startsWith('local:')) {
            throw new Error('EDPL requires a locally saved audio file. Please re-upload audio.');
        }
        
        const fileName = audioId.replace('local:', '');
        const filePath = path.join(__dirname, '../../uploads/voice', fileName);
        
        if (!fs.existsSync(filePath)) {
            throw new Error('Audio file not found on server.');
        }
        const audioBuffer = fs.readFileSync(filePath);
        
        const edplResult = await createBroadcastCampaign(campaign.name, audioBuffer, fileName, csvBuffer, 'leads.csv', null, vcConfig);
        
        if (edplResult.success) {
            console.log(`[EDPL] Successfully created external campaign: ${edplResult.campaignId}`);
            await query(`UPDATE campaigns SET template_id = ?, status = 'running_external', last_run_at = NOW() WHERE id = ?`, [edplResult.campaignId, campaignId]);
            return { success: true };
        } else {
            throw new Error(edplResult.error || 'Failed to create bulk campaign on EDPL');
        }
    } catch (err) {
        console.error(`[EDPL] Intercept failed for campaign ${campaignId}:`, err.message);
        await query('UPDATE campaigns SET status = "failed" WHERE id = ?', [campaignId]);
        if (campaign.recipient_count > 0 && campaign.user_id) {
            await query('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?', [campaign.recipient_count, campaign.user_id]);
        }
        return { success: false, error: err.message };
    }
}

module.exports = { interceptEDPLCampaign };
