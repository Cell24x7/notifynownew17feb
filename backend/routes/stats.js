const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const authenticate = require('../middleware/authMiddleware');

// --- Super Admin Stats ---
router.get('/super-admin', authenticate, async (req, res) => {
    try {
        const isReseller = req.user.role === 'reseller';
        const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

        if (!isAdmin && !isReseller) {
            return res.status(403).json({ success: false, message: 'Unauthorized access' });
        }

        const resellerId = isReseller ? (req.user.actual_reseller_id || req.user.id) : null;

        // 1. Basic Counters
        let userSql = "SELECT COUNT(*) as total FROM users WHERE role IN ('client', 'user')";
        let activeSql = "SELECT COUNT(*) as total FROM users WHERE role IN ('client', 'user') AND status = 'active'";
        let params = [];

        if (isReseller) {
            userSql += " AND reseller_id = ?";
            activeSql += " AND reseller_id = ?";
            params.push(resellerId);
        }

        const [userCounts] = await query(userSql, params);
        const [activeClientCounts] = await query(activeSql, params);
        const [planCounts] = await query("SELECT COUNT(*) as total FROM plans WHERE status = 'active'");

        // 2. Message Stats
        let msgSql = `
            SELECT 
                COALESCE(SUM(GREATEST(COALESCE(audience_count, 0), COALESCE(recipient_count, 0))), 0) as total,
                COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN GREATEST(COALESCE(audience_count, 0), COALESCE(recipient_count, 0)) ELSE 0 END), 0) as today,
                COUNT(id) as campaigns_count
            FROM campaigns 
            WHERE status IN ('completed', 'running', 'sent', 'processing', 'paused', 'scheduled')
        `;
        if (isReseller) {
            msgSql += " AND user_id IN (SELECT id FROM users WHERE reseller_id = ?)";
        }
        const [msgStats] = await query(msgSql, isReseller ? [resellerId] : []);

        // 3. Financial Stats
        let finSql = `
            SELECT 
                COALESCE(SUM(amount), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN amount ELSE 0 END), 0) as revenue_today,
                COALESCE(SUM(CASE WHEN MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE()) THEN amount ELSE 0 END), 0) as revenue_month
            FROM transactions 
            WHERE type = 'credit'
        `;
        if (isReseller) {
            finSql += " AND user_id IN (SELECT id FROM users WHERE reseller_id = ?)";
        }
        const [finStats] = await query(finSql, isReseller ? [resellerId] : []);

        // 4. Credit Consumption
        let creditSql = `
            SELECT 
                COALESCE(SUM(amount), 0) as total_consumed,
                COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN amount ELSE 0 END), 0) as consumed_today,
                COALESCE(SUM(CASE WHEN MONTH(created_at) = MONTH(CURDATE()) THEN amount ELSE 0 END), 0) as consumed_month
            FROM transactions 
            WHERE type = 'debit'
        `;
        if (isReseller) {
            creditSql += " AND user_id IN (SELECT id FROM users WHERE reseller_id = ?)";
        }
        const [creditStats] = await query(creditSql, isReseller ? [resellerId] : []);

        // 5. Weekly Messages Trend
        let weeklySql = `
            SELECT DATE(created_at) as date, SUM(COALESCE(audience_count, recipient_count, 0)) as count
            FROM campaigns
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        `;
        if (isReseller) {
            weeklySql += " AND user_id IN (SELECT id FROM users WHERE reseller_id = ?)";
        }
        weeklySql += " GROUP BY DATE(created_at) ORDER BY DATE(created_at)";
        const [weeklyStats] = await query(weeklySql, isReseller ? [resellerId] : []);

        // Fill in missing days for the chart
        const weeklyMessages = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const found = weeklyStats.find(r => {
                const rDate = new Date(r.date).toISOString().split('T')[0];
                return rDate === dateStr;
            });
            weeklyMessages.push({
                day: d.toLocaleDateString('en-US', { weekday: 'short' }),
                messages: found ? Number(found.count) : 0
            });
        }

        // 6. Channel Usage
        let channelSql = `
            SELECT channel, SUM(GREATEST(COALESCE(audience_count, 0), COALESCE(recipient_count, 0))) as volume
            FROM campaigns 
            WHERE status IN ('completed', 'running', 'sent', 'processing', 'paused', 'scheduled')
        `;
        if (isReseller) {
            channelSql += " AND user_id IN (SELECT id FROM users WHERE reseller_id = ?)";
        }
        channelSql += " GROUP BY channel";
        const [channelStats] = await query(channelSql, isReseller ? [resellerId] : []);

        const allChannels = ['whatsapp', 'sms', 'rcs'];
        const totalVolume = channelStats.reduce((acc, curr) => acc + Number(curr.volume || 0), 0) || 1;
        const channelUsage = allChannels.map(channelName => {
            const found = channelStats.find(c => c.channel.toLowerCase() === channelName.toLowerCase());
            const volume = found ? Number(found.volume || 0) : 0;
            return {
                channel: channelName,
                messages: volume,
                percentage: Math.round((volume / totalVolume) * 100)
            };
        });

        // 7. Plan Distribution
        let planSql = `
            SELECT 
                p.name as plan_name, 
                COUNT(u.id) as count
            FROM users u
            LEFT JOIN plans p ON u.plan_id = p.id
            WHERE u.role IN ('client', 'user')
        `;
        if (isReseller) {
            planSql += " AND u.reseller_id = ?";
        }
        planSql += " GROUP BY p.name";
        const [planStats] = await query(planSql, isReseller ? [resellerId] : []);

        const planDistribution = planStats.map(p => ({
            name: p.plan_name || 'Free / Unassigned',
            value: Number(p.count)
        }));

        // 8. Top Clients
        let topSql = `
            SELECT name, company, wallet_balance as credits_available
            FROM users 
            WHERE role IN ('client', 'user')
        `;
        if (isReseller) {
            topSql += " AND reseller_id = ?";
        }
        topSql += " ORDER BY wallet_balance DESC LIMIT 5";
        const [topUsers] = await query(topSql, isReseller ? [resellerId] : []);

        const topClients = topUsers.map(u => ({
            name: u.company || u.name || 'Unknown',
            balance: Number(u.credits_available)
        }));
        
        // 9. Active Chats & Automations (Robust counting)
        let activeChats = 0;
        let automationsTriggered = 0;

        try {
            const [activeChatCounts] = await query("SELECT COUNT(*) as total FROM chats WHERE status = 'open'");
            activeChats = activeChatCounts[0]?.total || 0;
        } catch (e) {
            // Fallback: If no chats table, count unique contacts from webhook_logs in last 24h
            try {
                const [logActive] = await query(`
                    SELECT COUNT(DISTINCT CASE WHEN sender = 'System' THEN recipient ELSE sender END) as total 
                    FROM webhook_logs 
                    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                `);
                activeChats = logActive[0]?.total || 0;
            } catch (le) { activeChats = 0; }
        }

        try {
            const [automationStats] = await query("SELECT COUNT(*) as total FROM automations WHERE status = 'active'");
            automationsTriggered = automationStats[0]?.total || 0;
        } catch (e) { automationsTriggered = 0; }

        // 9. Detailed Channel Stats for Admin (Aggregated)
        const [aggChannelData] = await query(`
            SELECT 
                channel, 
                SUM(GREATEST(COALESCE(audience_count, 0), COALESCE(recipient_count, 0))) as volume,
                SUM(delivered_count) as delivered,
                SUM(read_count) as read_count,
                SUM(failed_count) as failed
            FROM campaigns 
            WHERE status IN ('completed', 'running', 'sent', 'processing', 'paused', 'scheduled')
            ${isReseller ? 'AND user_id IN (SELECT id FROM users WHERE reseller_id = ?)' : ''}
            GROUP BY channel
        `, isReseller ? [resellerId] : []);

        // 10. Recent Campaigns (Aggregate for Admin)
        const [recentCampaigns] = await query(`
            SELECT id, name, channel, recipient_count, GREATEST(COALESCE(audience_count, 0), COALESCE(recipient_count, 0)) as audience_count, 
                   sent_count, delivered_count, read_count, failed_count, status, created_at, template_id
            FROM campaigns 
            ${isReseller ? 'WHERE user_id IN (SELECT id FROM users WHERE reseller_id = ?)' : ''}
            ORDER BY created_at DESC 
            LIMIT 10
        `, isReseller ? [resellerId] : []);

        const channelStatsMap = {};
        const channelDist = {};
        aggChannelData.forEach(row => {
            const key = row.channel.toLowerCase();
            const volume = Number(row.volume || 0);
            const delivered = Number(row.delivered || 0);
            const read = Number(row.read_count || 0);
            const failed = Number(row.failed || 0);

            channelDist[key] = volume;
            channelStatsMap[key] = {
                totalMessages: volume,
                delivered: delivered,
                read: read,
                failed: failed,
                deliveryRate: volume > 0 ? ((delivered / volume) * 100).toFixed(1) : "0",
                readRate: delivered > 0 ? ((read / delivered) * 100).toFixed(1) : "0"
            };
        });

        res.json({
            success: true,
            stats: {
                totalClients: userCounts[0]?.total || 0,
                activeClients: activeClientCounts[0]?.total || 0,
                activePlans: planCounts[0]?.total || 0,
                totalConversations: Number(msgStats[0]?.total || 0), // Match frontend key
                totalMessagesProcessed: Number(msgStats[0]?.total || 0),
                messagesToday: Number(msgStats[0]?.today || 0),
                revenueTotal: Number(finStats[0]?.total_revenue || 0),
                revenueToday: Number(finStats[0]?.revenue_today || 0),
                revenueMonth: Number(finStats[0]?.revenue_month || 0),
                creditsConsumedToday: Number(creditStats[0]?.consumed_today || 0),
                creditsConsumedMonth: Number(creditStats[0]?.consumed_month || 0),
                weeklyChats: weeklyMessages.map(m => ({ day: m.day, count: m.messages })), // Match frontend key
                weeklyMessages,
                channelUsage,
                channelStats: channelStatsMap,
                channelDistribution: channelDist,
                channelPercentages: Object.entries(channelDist).map(([key, value]) => ({
                    name: key.charAt(0).toUpperCase() + key.slice(1),
                    value: Number(value)
                })),
                planDistribution,
                topClients,
                recentCampaigns,
                activeChats: activeChats, 
                automationsTriggered: automationsTriggered,
                campaignsSent: Number(msgStats[0]?.campaigns_count || 0),
                openChats: activeChats,
                closedChats: Number(msgStats[0]?.total || 0),
                today: {
                    messages: Number(msgStats[0]?.today || 0),
                    revenue: Number(finStats[0]?.revenue_today || 0),
                    clientsAdded: 0 
                }
            }
        });

    } catch (err) {
        console.error('Dash Stats Error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.get('/stats', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Get user's enabled channels (Keep existing logic as fallback/metadata)
        const [userRows] = await query('SELECT channels_enabled FROM users WHERE id = ?', [userId]);
        let enabledChannels = [];
        try {
            if (userRows[0]?.channels_enabled) {
                enabledChannels = JSON.parse(userRows[0].channels_enabled);
            }
        } catch (e) {
            enabledChannels = [];
        }

        // 2. Total Conversations (Audience Count from completed/running campaigns)
        const [totalStats] = await query(`
            SELECT 
                COALESCE(SUM(GREATEST(COALESCE(audience_count, 0), COALESCE(recipient_count, 0))), 0) as total_conversations,
                COUNT(*) as campaigns_sent
            FROM campaigns 
            WHERE user_id = ? AND status IN ('completed', 'running', 'sent', 'processing', 'paused', 'scheduled')
        `, [userId]);

        // 3. Channel Distribution & Analytics (Volume, delivered, read, failed by channel)
        const [channelData] = await query(`
            SELECT 
                channel, 
                SUM(GREATEST(COALESCE(audience_count, 0), COALESCE(recipient_count, 0))) as volume,
                SUM(delivered_count) as delivered,
                SUM(read_count) as read_count,
                SUM(failed_count) as failed
            FROM campaigns 
            WHERE user_id = ? AND status IN ('completed', 'running', 'sent', 'processing', 'paused', 'scheduled')
            GROUP BY channel
        `, [userId]);

        const channelStatsMap = {};
        const channelDist = {};

        channelData.forEach(row => {
            const key = row.channel.toLowerCase();
            const volume = Number(row.volume || 0);
            const delivered = Number(row.delivered || 0);
            const read = Number(row.read_count || 0);
            const failed = Number(row.failed || 0);

            channelDist[key] = volume;
            channelStatsMap[key] = {
                totalMessages: volume,
                delivered: delivered,
                read: read,
                failed: failed,
                deliveryRate: volume > 0 ? ((delivered / volume) * 100).toFixed(1) : "0",
                readRate: delivered > 0 ? ((read / delivered) * 100).toFixed(1) : "0"
            };
        });

        // 4. Weekly Chats (Last 7 days trend)
        const [weeklyRows] = await query(`
            SELECT DATE(created_at) as date, SUM(GREATEST(COALESCE(audience_count, 0), COALESCE(recipient_count, 0))) as count
            FROM campaigns
            WHERE user_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at)
        `, [userId]);

        // Fill missing days
        const weeklyChats = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const found = weeklyRows.find(r => {
                const rDate = new Date(r.date).toISOString().split('T')[0];
                return rDate === dateStr;
            });
            weeklyChats.push({
                day: d.toLocaleDateString('en-US', { weekday: 'short' }),
                count: found ? Number(found.count) : 0
            });
        }

        // 5. Today's Specific Stats
        const [todayStats] = await query(`
            SELECT 
                COALESCE(SUM(GREATEST(COALESCE(audience_count, 0), COALESCE(recipient_count, 0))), 0) as messages,
                COALESCE(SUM(delivered_count), 0) as delivered,
                COALESCE(SUM(failed_count), 0) as failed,
                COUNT(*) as campaigns
            FROM campaigns 
            WHERE user_id = ? AND DATE(created_at) = CURDATE()
        `, [userId]);

        // 6. Recent Campaigns
        const [recentCampaigns] = await query(`
            SELECT id, name, channel, recipient_count, GREATEST(COALESCE(audience_count, 0), COALESCE(recipient_count, 0)) as audience_count, 
                   sent_count, delivered_count, read_count, failed_count, status, created_at, template_id
            FROM campaigns 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 10
        `, [userId]);

        // 7. Active Chats for User (Robust)
        let userActiveChatsCount = 0;
        let userAutomationsCount = 0;

        try {
            const [userActiveChats] = await query("SELECT COUNT(*) as total FROM chats WHERE user_id = ? AND status = 'open'", [userId]);
            userActiveChatsCount = userActiveChats[0]?.total || 0;
        } catch (e) {
            try {
                const [logActive] = await query(`
                    SELECT COUNT(DISTINCT CASE WHEN sender = 'System' THEN recipient ELSE sender END) as total 
                    FROM webhook_logs 
                    WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                `, [userId]);
                userActiveChatsCount = logActive[0]?.total || 0;
            } catch (le) { userActiveChatsCount = 0; }
        }

        try {
            const [userAutomations] = await query("SELECT COUNT(*) as total FROM automations WHERE user_id = ? AND status = 'active'", [userId]);
            userAutomationsCount = userAutomations[0]?.total || 0;
        } catch (e) { userAutomationsCount = 0; }

        // 8. Construct Final Stats Object
        const stats = {
            totalConversations: Number(totalStats[0]?.total_conversations || 0),
            activeChats: userActiveChatsCount,
            automationsTriggered: userAutomationsCount,
            campaignsSent: Number(totalStats[0]?.campaigns_sent || 0),
            openChats: userActiveChatsCount,
            closedChats: Number(totalStats[0]?.total_conversations || 0),
            weeklyChats,
            channelDistribution: channelDist,
            channelStats: channelStatsMap,
            today: {
                messages: Number(todayStats[0]?.messages || 0),
                delivered: Number(todayStats[0]?.delivered || 0),
                failed: Number(todayStats[0]?.failed || 0),
                campaigns: Number(todayStats[0]?.campaigns || 0)
            },
            recentCampaigns: recentCampaigns.map(c => ({
                ...c,
                deliveryRate: c.audience_count > 0 ? ((c.delivered_count / c.audience_count) * 100).toFixed(1) : "0"
            })),
            channelPercentages: Object.entries(channelDist).map(([key, value]) => ({
                name: key.charAt(0).toUpperCase() + key.slice(1),
                value: Number(value)
            }))
        };

        res.json({ success: true, stats });
    } catch (err) {
        console.error('User Dashboard Stats Error:', err);
        res.status(500).json({ success: false, message: 'Server error fetching user stats' });
    }
});

// --- Usage Ledger for Finance/Billing with Pagination ---
router.get('/usage-ledger', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const month = req.query.month || (new Date().getMonth() + 1);
        const year = req.query.year || new Date().getFullYear();
        const entityId = req.query.entityId; // Combined ID from frontend
        const entityType = req.query.entityType; // 'reseller' or 'user'
        const search = req.query.search;
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        let conditions = ["u.role IN ('client', 'user')"];
        let params = [month, year];

        if (entityType === 'reseller' && entityId && entityId !== 'all') {
            conditions.push("u.reseller_id = ?");
            params.push(entityId);
        } else if (entityType === 'user' && entityId && entityId !== 'all') {
            conditions.push("u.id = ?");
            params.push(entityId);
        }

        if (search) {
            conditions.push("(u.name LIKE ? OR u.email LIKE ? OR u.company LIKE ?)");
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam);
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        // 1. Get Total Count for Pagination
        const countParams = params.slice(2); 
        const countSql = `SELECT COUNT(DISTINCT u.id) as total FROM users u ${whereClause}`;
        
        // console.log('[UsageLedger] Count SQL:', countSql, 'Params:', countParams);
        const [countResult] = await query(countSql, countParams);
        const totalRecords = countResult[0]?.total || 0;

        const sql = `
            SELECT 
                u.id, 
                u.name, 
                u.email, 
                u.company,
                u.wallet_balance,
                r.name as reseller_name,
                SUM(CASE WHEN t.type = 'debit' THEN t.amount ELSE 0 END) as total_spent,
                SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0 END) as total_added,
                MAX(t.created_at) as last_activity
            FROM users u
            LEFT JOIN resellers r ON u.reseller_id = r.id
            LEFT JOIN transactions t ON u.id = t.user_id 
                AND MONTH(t.created_at) = ? 
                AND YEAR(t.created_at) = ?
            ${whereClause}
            GROUP BY u.id
            ORDER BY total_spent DESC
            LIMIT ? OFFSET ?
        `;

        const finalParams = [...params, limit, offset];
        // console.log('[UsageLedger] Rows SQL Params:', finalParams);
        
        const [rows] = await query(sql, finalParams);

        res.json({
            success: true,
            ledger: rows.map(r => ({
                ...r,
                total_spent: Number(r.total_spent || 0),
                total_added: Number(r.total_added || 0),
                wallet_balance: Number(r.wallet_balance || 0)
            })),
            pagination: {
                total: totalRecords,
                page,
                limit,
                totalPages: Math.max(1, Math.ceil(totalRecords / limit))
            }
        });

    } catch (err) {
        console.error('Usage Ledger Error:', err);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});

module.exports = router;
