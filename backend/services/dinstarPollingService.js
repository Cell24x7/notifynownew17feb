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
            SELECT id, mobile, message_id 
            FROM message_logs 
            WHERE status = 'sent' AND channel = 'sms'
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
        
        const chunkSize = 50;
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
                    for (const res of results) {
                        let newStatus = 'sent';
                        if (res.status === 'DELIVERED') newStatus = 'delivered';
                        else if (res.status === 'FAILED' || res.status === 'UNDELIVERED') newStatus = 'failed';
                        
                        if (newStatus !== 'sent') {
                            const possibleNum1 = res.number;
                            const possibleNum2 = `91${res.number}`;

                            // Need to get the campaign_id for this log to update campaigns table
                            const [logRows] = await query(`SELECT campaign_id FROM message_logs WHERE (mobile = ? OR mobile = ?) AND status = 'sent'`, [possibleNum1, possibleNum2]);
                            
                            if (logRows.length > 0) {
                                // Update message_logs
                                await query(`
                                    UPDATE message_logs 
                                    SET status = ?, delivered_at = NOW() 
                                    WHERE (mobile = ? OR mobile = ?) AND status = 'sent'
                                `, [newStatus, possibleNum1, possibleNum2]);

                                // Update campaign_queue
                                await query(`
                                    UPDATE campaign_queue 
                                    SET status = ? 
                                    WHERE (mobile = ? OR mobile = ?) AND status = 'sent'
                                `, [newStatus, possibleNum1, possibleNum2]);
                                
                                // Update campaigns table counters
                                const campaignId = logRows[0].campaign_id;
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
            } catch (err) {
                console.error('[Dinstar Polling] Error querying chunk:', err.message);
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
