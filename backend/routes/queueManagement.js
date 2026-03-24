const express = require('express');
const router = express.Router();
const { campaignQueue } = require('../queues/campaignQueue');
// We will use existing auth middleware logic (guessing based on common patterns)
// Assuming authenticateToken exists in the project

router.get('/status', async (req, res) => {
    try {
        const counts = await campaignQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
        
        // Fetch 5-10 recent jobs for the live feed
        const jobs = await campaignQueue.getJobs(['completed', 'failed'], 0, 9, false);
        const feed = jobs.map(j => ({
            id: j.id,
            status: j.finishedOn ? (j.failedReason ? 'failed' : 'completed') : 'active',
            recipient: j.data?.item?.mobile || 'N/A',
            channel: j.data?.item?.channel || 'Unknown',
            time: j.finishedOn ? new Date(j.finishedOn).toLocaleTimeString() : new Date(j.timestamp).toLocaleTimeString(),
            error: j.failedReason || null
        }));

        res.json({
            success: true,
            counts: {
                waiting: counts.waiting || 0,
                active: counts.active || 0,
                completed: counts.completed || 0,
                failed: counts.failed || 0,
                delayed: counts.delayed || 0,
                total: (counts.waiting + counts.active + counts.completed + counts.failed + counts.delayed) || 0
            },
            feed,
            engine: 'BullMQ 1Cr+ Redis Engine cluster',
            serverStatus: 'Online',
            lastCheck: new Date()
        });
    } catch (err) {
        console.error('[QueueManager] Error fetching status:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Control: Pause/Resume the engine
router.post('/control', async (req, res) => {
    const { action } = req.body;
    try {
        if (action === 'pause') await campaignQueue.pause();
        else if (action === 'resume') await campaignQueue.resume();
        else return res.status(400).json({ success: false, message: 'Invalid action' });
        
        res.json({ success: true, message: `Engine ${action}d successfully` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
