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

        const resellerId = isReseller ? req.user.actual_reseller_id : null;

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
                COALESCE(SUM(audience_count), 0) as total,
                COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN audience_count ELSE 0 END), 0) as today
            FROM campaigns 
            WHERE status IN ('completed', 'running')
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
            SELECT DATE(created_at) as date, SUM(audience_count) as count
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
            SELECT channel, SUM(audience_count) as volume
            FROM campaigns 
            WHERE status IN ('completed', 'running')
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

        // 9. Detailed Channel Stats for Admin (Aggregated)
        const [aggChannelData] = await query(`
            SELECT 
                channel, 
                SUM(audience_count) as volume,
                SUM(delivered_count) as delivered,
                SUM(read_count) as read_count,
                SUM(failed_count) as failed
            FROM campaigns 
            WHERE status IN ('completed', 'running')
            ${isReseller ? 'AND user_id IN (SELECT id FROM users WHERE reseller_id = ?)' : ''}
            GROUP BY channel
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
                activeChats: 0, 
                automationsTriggered: 0,
                campaignsSent: Number(msgStats[0]?.total > 0 ? 1 : 0), // Placeholder or add count(*) from campaigns
                openChats: 0,
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
                COALESCE(SUM(audience_count), 0) as total_conversations,
                COUNT(*) as campaigns_sent
            FROM campaigns 
            WHERE user_id = ? AND status IN ('completed', 'running')
        `, [userId]);

        // 3. Channel Distribution & Analytics (Volume, delivered, read, failed by channel)
        const [channelData] = await query(`
            SELECT 
                channel, 
                SUM(audience_count) as volume,
                SUM(delivered_count) as delivered,
                SUM(read_count) as read_count,
                SUM(failed_count) as failed
            FROM campaigns 
            WHERE user_id = ? AND status IN ('completed', 'running')
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
            SELECT DATE(created_at) as date, SUM(audience_count) as count
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
                COALESCE(SUM(audience_count), 0) as messages,
                COALESCE(SUM(delivered_count), 0) as delivered,
                COALESCE(SUM(failed_count), 0) as failed,
                COUNT(*) as campaigns
            FROM campaigns 
            WHERE user_id = ? AND DATE(created_at) = CURDATE()
        `, [userId]);

        // 6. Recent Campaigns
        const [recentCampaigns] = await query(`
            SELECT id, name, channel, audience_count, status, created_at, delivered_count, failed_count
            FROM campaigns 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 5
        `, [userId]);

        // 7. Construct Final Stats Object
        const stats = {
            totalConversations: Number(totalStats[0]?.total_conversations || 0),
            activeChats: 0,
            automationsTriggered: 0,
            campaignsSent: Number(totalStats[0]?.campaigns_sent || 0),
            openChats: 0,
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

module.exports = router;
