const express = require('express');
const router = express.Router();
const { campaignQueue } = require('../queues/campaignQueue');
// We will use existing auth middleware logic (guessing based on common patterns)
// Assuming authenticateToken exists in the project

router.get('/status', async (req, res) => {
    try {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            campaignQueue.getJobCountByTypes('waiting'),
            campaignQueue.getJobCountByTypes('active'),
            campaignQueue.getJobCountByTypes('completed'),
            campaignQueue.getJobCountByTypes('failed'),
            campaignQueue.getJobCountByTypes('delayed')
        ]);
        
        // Get last 5 completed jobs for live feed
        const recentJobs = await campaignQueue.getJobs(['completed', 'failed'], 0, 4, false);
        const feed = recentJobs.map(job => ({
            id: job.id,
            mobile: job.data?.item?.mobile,
            status: job.finishedOn ? 'success' : 'failed',
            time: job.finishedOn ? new Date(job.finishedOn).toLocaleTimeString() : 'N/A'
        }));

        res.json({
            success: true,
            counts: {
                waiting,
                active,
                completed,
                failed,
                delayed,
                total: waiting + active + completed + failed + delayed
            },
            feed,
            engine: 'BullMQ 1Cr+ Redis Engine',
            serverStatus: 'Online',
            lastCheck: new Date()
        });
    } catch (err) {
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
