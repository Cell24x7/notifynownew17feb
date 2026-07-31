const { query } = require('../config/db');
const edpl = require('./voice/providers/edpl');

let isPolling = false;

async function pollEDPLCampaigns() {
    if (isPolling) return;
    isPolling = true;

    try {
        // Find campaigns that are running on EDPL
        const [campaigns] = await query(`
            SELECT id, user_id, ai_voice_config_id, template_id, channel, name
            FROM campaigns 
            WHERE status = 'running_external' 
              AND (channel = 'voice' OR channel = 'voicebot') 
              AND ai_voice_config_id IS NOT NULL 
              AND template_id IS NOT NULL
        `);

        if (campaigns.length === 0) {
            isPolling = false;
            return;
        }

        for (const campaign of campaigns) {
            try {
                // Get Voice Config for this campaign
                const [vc] = await query('SELECT provider, base_url, api_user, api_key FROM voice_configs WHERE id = ?', [campaign.ai_voice_config_id]);
                if (!vc || vc.length === 0 || vc[0].provider !== 'edpl') continue;
                
                // Fetch live status from EDPL
                const result = await edpl.getCampaignStatus(campaign.template_id, vc[0]);
                
                if (!result.success || !result.data) {
                    console.error(`[EDPL-POLL] Failed to fetch status for campaign ${campaign.id}:`, result.error || 'No data');
                    continue;
                }
                
                const edplData = result.data;
                const metrics = edplData.metrics || {};
                
                const answered = metrics.answered || 0;
                const failed = (metrics.failed || 0) + (metrics.busy || 0) + (metrics.noAnswer || 0);
                const total = metrics.total || 0;
                const pending = (metrics.pending || 0) + (metrics.processing || 0);
                const sent = total - pending;
                
                let newStatus = 'running_external';
                if (pending === 0 && total > 0) {
                    newStatus = 'completed';
                }
                
                // Update local campaign metrics
                await query(`
                    UPDATE campaigns 
                    SET sent_count = ?, delivered_count = ?, failed_count = ?, status = ?
                    WHERE id = ?
                `, [sent, answered, failed, newStatus, campaign.id]);
                
                // Process detailed call logs
                if (edplData.leads && edplData.leads.length > 0) {
                    for (const lead of edplData.leads) {
                        let logStatus = 'failed';
                        if (lead.dial_status === 'answered') {
                            logStatus = 'delivered';
                        }
                        
                        const reason = typeof lead.call_duration !== 'undefined' 
                            ? `Duration: ${lead.call_duration}s (${lead.dial_status})` 
                            : `Status: ${lead.dial_status}`;
                        
                        const updatedAt = lead.updated_at ? new Date(lead.updated_at) : new Date();
                        
                        // Check if it already exists in voice_logs
                        const [existing] = await query('SELECT id FROM voice_logs WHERE message_id = ? LIMIT 1', [lead.id]);
                        
                        if (existing.length > 0) {
                            // Update existing log
                            await query(`
                                UPDATE voice_logs 
                                SET status = ?, duration = ?, attempts = ? 
                                WHERE message_id = ?
                            `, [lead.dial_status, lead.call_duration || 0, lead.attempts || 1, lead.id]);
                        } else {
                            // Insert new log
                            await query(`
                                INSERT INTO voice_logs 
                                (user_id, campaign_id, campaign_name, mobile, status, duration, attempts, message_id, created_at) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            `, [
                                campaign.user_id, 
                                campaign.id, 
                                edplData.campaign?.name || campaign.name || 'Voice Campaign',
                                lead.phone_number,
                                lead.dial_status,
                                lead.call_duration || 0,
                                lead.attempts || 1,
                                lead.id,
                                updatedAt
                            ]);
                        }
                    }
                }
                
                console.log(`[EDPL-POLL] Campaign ${campaign.id} Synced. Status: ${newStatus}, Sent: ${sent}, Delivered: ${answered}`);

            } catch (campaignErr) {
                console.error(`[EDPL-POLL] Error processing campaign ${campaign.id}:`, campaignErr.message);
            }
        }
    } catch (err) {
        console.error('[EDPL-POLL] Global Polling loop error:', err.message);
    } finally {
        isPolling = false;
    }
}

function startPolling() {
    console.log('[EDPL-POLL] EDPL Voice Gateway polling started (every 30s)');
    // Run every 30 seconds
    setInterval(pollEDPLCampaigns, 30000);
    // Initial run after 10 seconds
    setTimeout(pollEDPLCampaigns, 10000);
}

module.exports = { startPolling, pollEDPLCampaigns };
