const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const authenticate = require('../middleware/authMiddleware');

// --- Super Admin Stats ---
router.get('/super-admin', authenticate, async (req, res) => {
    try {
        // 1. Basic Counters
        // Count both 'client' and 'user' roles as clients for the dashboard
        const [userCounts] = await query("SELECT COUNT(*) as total FROM users WHERE role IN ('client', 'user')");
        const [activeClientCounts] = await query("SELECT COUNT(*) as total FROM users WHERE role IN ('client', 'user') AND status = 'active'");
        const [planCounts] = await query("SELECT COUNT(*) as total FROM plans WHERE status = 'active'");

        // 2. Message Stats (from campaigns)
        const [msgStats] = await query(`
            SELECT 
                COALESCE(SUM(audience_count), 0) as total,
                COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN audience_count ELSE 0 END), 0) as today
            FROM campaigns 
            WHERE status IN ('completed', 'running')
        `);

        // 3. Financial Stats (from transactions)
        const [finStats] = await query(`
            SELECT 
                COALESCE(SUM(amount), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN amount ELSE 0 END), 0) as revenue_today,
                COALESCE(SUM(CASE WHEN MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE()) THEN amount ELSE 0 END), 0) as revenue_month
            FROM transactions 
            WHERE type = 'credit'
        `);

        // 4. Credit Consumption (Approximation from debits)
        const [creditStats] = await query(`
            SELECT 
                COALESCE(SUM(amount), 0) as total_consumed,
                COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN amount ELSE 0 END), 0) as consumed_today,
                COALESCE(SUM(CASE WHEN MONTH(created_at) = MONTH(CURDATE()) THEN amount ELSE 0 END), 0) as consumed_month
            FROM transactions 
            WHERE type = 'debit'
        `);

        // 5. Weekly Messages Trend (Last 7 days)
        const [weeklyStats] = await query(`
            SELECT DATE(created_at) as date, SUM(audience_count) as count
            FROM campaigns
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at)
        `);

        // Fill in missing days for the chart
        const weeklyMessages = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const found = weeklyStats.find(r => {
                // Handle various date formats returned by driver
                const rDate = new Date(r.date).toISOString().split('T')[0];
                return rDate === dateStr;
            });
            weeklyMessages.push({
                day: d.toLocaleDateString('en-US', { weekday: 'short' }),
                messages: found ? Number(found.count) : 0
            });
        }

        // 6. Channel Usage
        // 6. Channel Usage (By Volume)
        const [channelStats] = await query(`
            SELECT channel, SUM(audience_count) as volume
            FROM campaigns 
            WHERE status IN ('completed', 'running')
            GROUP BY channel
        `);

        const allChannels = ['whatsapp', 'sms', 'rcs'];

        // Calculate total volume across ALL channels found in DB (even if not in our list)
        // This ensures the percentage is accurate relative to total traffic
        const totalVolume = channelStats.reduce((acc, curr) => acc + Number(curr.volume || 0), 0) || 1;

        const channelUsage = allChannels.map(channelName => {
            // Case-insensitive match
            const found = channelStats.find(c => c.channel.toLowerCase() === channelName.toLowerCase());
            const volume = found ? Number(found.volume || 0) : 0;

            return {
                channel: channelName,
                messages: volume,
                percentage: Math.round((volume / totalVolume) * 100)
            };
        });

        // 7. Plan Distribution (Snapshot - Always shows data if users exist)
        const [planStats] = await query(`
            SELECT 
                p.name as plan_name, 
                COUNT(u.id) as count
            FROM users u
            LEFT JOIN plans p ON u.plan_id = p.id
            WHERE u.role IN ('client', 'user')
            GROUP BY p.name
        `);

        // Format for Pie Chart
        const planDistribution = planStats.map(p => ({
            name: p.plan_name || 'Free / Unassigned',
            value: Number(p.count)
        }));

        // 8. Top Clients by Wallet Balance (Snapshot)
        const [topUsers] = await query(`
            SELECT name, company, credits_available
            FROM users 
            WHERE role IN ('client', 'user')
            ORDER BY credits_available DESC
            LIMIT 5
        `);

        const topClients = topUsers.map(u => ({
            name: u.company || u.name || 'Unknown',
            balance: Number(u.credits_available)
        }));


        res.json({
            success: true,
            stats: {
                totalClients: userCounts[0]?.total || 0,
                activeClients: activeClientCounts[0]?.total || 0, // Fallback if query fails/returns empty
                activePlans: planCounts[0]?.total || 0,
                totalMessagesProcessed: Number(msgStats[0]?.total || 0),
                messagesToday: Number(msgStats[0]?.today || 0),
                revenueTotal: Number(finStats[0]?.total_revenue || 0),
                revenueToday: Number(finStats[0]?.revenue_today || 0),
                revenueMonth: Number(finStats[0]?.revenue_month || 0),
                creditsConsumedToday: Number(creditStats[0]?.consumed_today || 0),
                creditsConsumedMonth: Number(creditStats[0]?.consumed_month || 0),
                weeklyMessages,
                channelUsage,
                planDistribution,
                topClients
            }
        });

    } catch (err) {
        console.error('Super Admin Stats Error:', err);
        // Fallback for missing columns (e.g., status column in users)
        if (err.code === 'ER_BAD_FIELD_ERROR') {
            return res.status(500).json({ success: false, message: 'Database schema mismatch. Please run migration scripts.' });
        }
        res.status(500).json({ success: false, message: 'Server error fetching stats' });
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

        // 3. Channel Distribution (Volume by channel)
        const [channelStats] = await query(`
            SELECT channel, SUM(audience_count) as volume
            FROM campaigns 
            WHERE user_id = ? AND status IN ('completed', 'running')
            GROUP BY channel
        `, [userId]);

        // Map database results to simple object { whatsapp: 100, sms: 50, ... }
        const channelDist = {
            whatsapp: 0,
            sms: 0,
            rcs: 0,
            voice: 0,
            email: 0
        };

        channelStats.forEach(row => {
            const key = row.channel.toLowerCase();
            if (channelDist.hasOwnProperty(key)) {
                channelDist[key] = Number(row.volume);
            } else {
                channelDist[key] = Number(row.volume);
            }
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

        // 5. Construct Final Stats Object
        // For activeChats and automations, we still lack real data sources, so we keep them 0 or mock appropriately 
        // until those features are built.
        const stats = {
            totalConversations: Number(totalStats[0]?.total_conversations || 0),
            activeChats: 0, // Placeholder
            automationsTriggered: 0, // Placeholder
            campaignsSent: Number(totalStats[0]?.campaigns_sent || 0),
            openChats: 0, // Placeholder
            closedChats: Number(totalStats[0]?.total_conversations || 0), // Assuming all simplified campaigns are "closed" for now
            weeklyChats,
            channelDistribution: channelDist,
            // Include breakdown percentages for potential frontend usage
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
