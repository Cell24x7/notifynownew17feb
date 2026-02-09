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
        // Get user's enabled channels
        const [userRows] = await query('SELECT channels_enabled FROM users WHERE id = ?', [req.user.id]);
        let channels = [];
        try {
            if (userRows[0]?.channels_enabled) {
                channels = JSON.parse(userRows[0].channels_enabled);
            }
        } catch (e) {
            channels = [];
        }
        if (!Array.isArray(channels)) channels = [];

        // Mock stats for CLIENT dashboard (keep existing logic or improve later)
        const stats = {
            totalConversations: 0,
            activeChats: 0,
            automationsTriggered: 0,
            campaignsSent: 0,
            openChats: 0,
            closedChats: 0,
            weeklyChats: [
                { day: 'Mon', count: 0 },
                { day: 'Tue', count: 0 },
                { day: 'Wed', count: 0 },
                { day: 'Thu', count: 0 },
                { day: 'Fri', count: 0 },
                { day: 'Sat', count: 0 },
                { day: 'Sun', count: 0 },
            ],
            channelDistribution: {
                whatsapp: channels.includes('whatsapp') ? 1 : 0,
                sms: channels.includes('sms') ? 1 : 0,
                rcs: channels.includes('rcs') ? 1 : 0
            }
        };

        res.json({ success: true, stats });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
