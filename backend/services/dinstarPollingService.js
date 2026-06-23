const { query } = require('../config/db');
const axios = require('axios');

let isPolling = false;

const pollDinstarDLRs = async () => {
    if (isPolling) return;
    isPolling = true;

    try {
        // Find distinct gateways that are Dinstar
        const [gateways] = await query(`SELECT * FROM sms_gateways WHERE status = 'active' AND (name LIKE '%Dinstar%' OR primary_url LIKE '%dinstar/api/sms%')`);
        if (gateways.length === 0) {
            isPolling = false;
            return;
        }

        // Find sent messages that haven't been delivered or failed yet (limit to prevent memory issues)
        const [pendingLogs] = await query(`
            SELECT id, recipient AS mobile, message_id 
            FROM message_logs 
            WHERE LOWER(status) = 'sent' AND (LOWER(channel) = 'sms' OR channel IS NULL OR LOWER(channel) = 'gsm')
            ORDER BY id DESC LIMIT 500
        `);

        if (pendingLogs.length === 0) {
            isPolling = false;
            return;
        }

        const gateway = gateways[0];
        // Ensure we hit the query endpoint
        const baseUrl = gateway.primary_url.split('?')[0].replace('/send', '/query');

        // Extract unique numbers to query
        const numbersToQuery = [...new Set(pendingLogs.map(log => log.mobile))];
        
        const chunkSize = 30; // Dinstar max limit is 32 items per query
        for (let i = 0; i < numbersToQuery.length; i += chunkSize) {
            const chunk = numbersToQuery.slice(i, i + chunkSize);
            
            // Dinstar uses local format (strip 91 if length is 12)
            const formattedChunk = chunk.map(num => (num.length === 12 && num.startsWith('91')) ? num.substring(2) : num);

            try {
                const response = await axios.post(baseUrl, {
                    number: formattedChunk,
                    port: [0]
                }, { timeout: 10000 });

                const resultData = response.data;
                if (resultData && resultData.success && resultData.data && resultData.data.result) {
                    const results = resultData.data.result;

                    // Dinstar returns history chronologically. Group by number to get all statuses.
                    const numberHistory = {};
                    for (const res of results) {
                        const localNum = res.number.startsWith('91') ? res.number.substring(2) : res.number;
                        if (!numberHistory[localNum]) numberHistory[localNum] = [];
                        numberHistory[localNum].push(res.status);
                    }
                    console.log('[Dinstar Polling] Fetched history counts:', Object.keys(numberHistory).reduce((acc, num) => { acc[num] = numberHistory[num].length; return acc; }, {}));

                    for (const localNum in numberHistory) {
                        const history = numberHistory[localNum]; // Array of chronological statuses
                        const possibleNum1 = localNum;
                        const possibleNum2 = `91${localNum}`;

                        // Find the specific pending logs for this number to update them accurately (OLDEST first)
                        try {
                            const [logRows] = await query(`SELECT id, campaign_id FROM message_logs WHERE (recipient = ? OR recipient = ?) AND LOWER(status) = 'sent' ORDER BY id ASC`, [possibleNum1, possibleNum2]);
                            
                            if (logRows.length > 0) {
                                console.log(`[Dinstar Polling] Found ${logRows.length} pending logs for ${localNum}. Dinstar has ${history.length} total history records.`);
                                
                                // Map the pending logs to the LAST N history records
                                // Dinstar returns recent history, so it should map to the NEWEST pending logs.
                                let logIndex = Math.max(0, logRows.length - history.length);
                                let historyIndex = Math.max(0, history.length - logRows.length);
                                
                                for (; logIndex < logRows.length; logIndex++, historyIndex++) {
                                    const log = logRows[logIndex];
                                    if (historyIndex < history.length) {
                                        const finalStatus = history[historyIndex];

                                        let newStatus = 'sent';
                                        // GSM Gateways often use SENT_OK as the final success state if handset DLR is unavailable
                                        if (finalStatus === 'DELIVERED' || finalStatus === 'SENT_OK') newStatus = 'delivered';
                                        else if (finalStatus === 'FAILED' || finalStatus === 'UNDELIVERED') newStatus = 'failed';
                                        // If 'SENDING', newStatus remains 'sent'
                                        
                                        if (newStatus !== 'sent') {
                                            console.log(`[Dinstar Polling] Updating message_logs ID ${log.id} to ${newStatus} (Dinstar status: ${finalStatus})`);
                                            await query(`UPDATE message_logs SET status = ? WHERE id = ?`, [newStatus, log.id]);

                                            // Update campaign_queue accurately by finding the oldest pending for this number
                                            const [cqRows] = await query(`SELECT id FROM campaign_queue WHERE (mobile = ? OR mobile = ?) AND LOWER(status) = 'sent' ORDER BY id ASC LIMIT 1`, [possibleNum1, possibleNum2]);
                                            if (cqRows.length > 0) {
                                                await query(`UPDATE campaign_queue SET status = ? WHERE id = ?`, [newStatus, cqRows[0].id]);
                                            }
                                            
                                            const campaignId = log.campaign_id;
                                            if (campaignId) {
                                                if (newStatus === 'delivered') {
                                                    await query(`UPDATE campaigns SET delivered_count = delivered_count + 1 WHERE id = ?`, [campaignId]);
                                                } else if (newStatus === 'failed') {
                                                    await query(`UPDATE campaigns SET failed_count = failed_count + 1 WHERE id = ?`, [campaignId]);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (dbErr) {
                            console.error(`[Dinstar Polling] Database Update Error for ${localNum}:`, dbErr.message);
                        }
                    }
                } else {
                    console.log('[Dinstar Polling] Invalid result format from Dinstar:', JSON.stringify(resultData));
                }
            } catch (err) {
                if (err.response && err.response.data) {
                    console.error('[Dinstar Polling] Error Response:', JSON.stringify(err.response.data));
                } else {
                    console.error('[Dinstar Polling] Error:', err.message);
                }
            }
        }

    } catch (err) {
        console.error('[Dinstar Polling] Error:', err.message);
    } finally {
        isPolling = false;
    }
};

const startPolling = () => {
    // Poll every 30 seconds
    setInterval(pollDinstarDLRs, 30000);
    console.log('🔄 Dinstar DLR Polling Service Started');
};

module.exports = { startPolling, pollDinstarDLRs };
