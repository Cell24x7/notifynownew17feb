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
        const [pendingLogs1] = await query(`
            SELECT id, recipient AS mobile, message_id 
            FROM message_logs 
            WHERE status = 'sent' AND (channel = 'sms' OR channel = 'SMS' OR channel IS NULL OR channel = 'gsm' OR channel = 'GSM')
            ORDER BY id DESC LIMIT 250
        `);

        const [pendingLogs2] = await query(`
            SELECT id, recipient AS mobile, message_id 
            FROM api_message_logs 
            WHERE status = 'sent' AND (channel = 'sms' OR channel = 'SMS' OR channel IS NULL OR channel = 'gsm' OR channel = 'GSM')
            ORDER BY id DESC LIMIT 250
        `);

        const pendingLogs = [...pendingLogs1, ...pendingLogs2];

        if (pendingLogs.length === 0) {
            isPolling = false;
            return;
        }

        const gateway = gateways[0];
        // Ensure we hit the query endpoint
        const baseUrl = gateway.primary_url.split('?')[0].replace('/send', '/query');

        // Extract unique numbers to query
        const numbersToQuery = [...new Set(pendingLogs.map(log => log.mobile))];
        
        const chunkSize = 15; // Dinstar max limit is 32 items per query. Reduced to 15 since we double the numbers.
        for (let i = 0; i < numbersToQuery.length; i += chunkSize) {
            const chunk = numbersToQuery.slice(i, i + chunkSize);
            
            // Dinstar gateway might apply translation rules and save history with '91'.
            // Query both 10-digit and 12-digit formats just to be safe.
            const formattedChunk = [];
            chunk.forEach(rawNum => {
                if (!rawNum) return;
                // Clean the number to remove spaces, +, -, x, etc.
                const cleanNum = String(rawNum).replace(/[^0-9]/g, '');
                if (!cleanNum) return; // Skip if no digits left
                
                const localNum = (cleanNum.length === 12 && cleanNum.startsWith('91')) ? cleanNum.substring(2) : cleanNum;
                if (!formattedChunk.includes(localNum)) formattedChunk.push(localNum);
                if (!formattedChunk.includes(`91${localNum}`)) formattedChunk.push(`91${localNum}`);
            });

            if (formattedChunk.length === 0) continue;

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
                            const [logRows] = await query(`SELECT id, campaign_id, created_at, 'message_logs' as table_name FROM message_logs WHERE (recipient = ? OR recipient = ?) AND status = 'sent'`, [possibleNum1, possibleNum2]);
                            const [apiLogRows] = await query(`SELECT id, campaign_id, COALESCE(created_at, send_time) as created_at, 'api_message_logs' as table_name FROM api_message_logs WHERE (recipient = ? OR recipient = ?) AND status = 'sent'`, [possibleNum1, possibleNum2]);
                            
                            const combinedRows = [...logRows, ...apiLogRows].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

                            if (combinedRows.length > 0) {
                                console.log(`[Dinstar Polling] Found ${combinedRows.length} pending logs for ${localNum}. Dinstar has ${history.length} total history records.`);
                                
                                // Map the pending logs to the LAST N history records
                                // Dinstar returns recent history, so it should map to the NEWEST pending logs.
                                let logIndex = Math.max(0, combinedRows.length - history.length);
                                let historyIndex = Math.max(0, history.length - combinedRows.length);
                                
                                for (; logIndex < combinedRows.length; logIndex++, historyIndex++) {
                                    const log = combinedRows[logIndex];
                                    if (historyIndex < history.length) {
                                        const finalStatus = history[historyIndex];

                                        let newStatus = 'sent';
                                        // GSM Gateways often use SENT_OK as the final success state if handset DLR is unavailable
                                        if (finalStatus === 'DELIVERED' || finalStatus === 'SENT_OK') newStatus = 'delivered';
                                        else if (finalStatus === 'FAILED' || finalStatus === 'UNDELIVERED') newStatus = 'failed';
                                        // If 'SENDING', newStatus remains 'sent'
                                        
                                        if (newStatus !== 'sent') {
                                            console.log(`[Dinstar Polling] Updating ${log.table_name} ID ${log.id} to ${newStatus} (Dinstar status: ${finalStatus})`);
                                            await query(`UPDATE ${log.table_name} SET status = ? WHERE id = ?`, [newStatus, log.id]);

                                            if (log.table_name === 'message_logs') {
                                                // Update campaign_queue accurately by finding the oldest pending for this number
                                                const [cqRows] = await query(`SELECT id FROM campaign_queue WHERE (mobile = ? OR mobile = ?) AND status = 'sent' ORDER BY id ASC LIMIT 1`, [possibleNum1, possibleNum2]);
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
