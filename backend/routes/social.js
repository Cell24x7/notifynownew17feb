const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const { query } = require('../config/db');

// GET /api/social/stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    // Mock stats for demo
    const stats = {
      facebook: { followers: '12.4K', growth: '+12.5%', status: 'connected' },
      instagram: { followers: '45.2K', growth: '+8.2%', status: 'connected' },
      linkedin: { followers: '3.1K', growth: '+5.0%', status: 'disconnected' },
      twitter: { followers: '8.9K', growth: '+2.1%', status: 'disconnected' }
    };
    res.json({ success: true, stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/social/posts
router.get('/posts', authenticate, async (req, res) => {
  try {
    const posts = [
      { id: 1, content: 'Summer collection post', platform: 'instagram', status: 'published', date: '2026-05-13T10:00:00Z' },
      { id: 2, content: 'API Hub launch post', platform: 'facebook', status: 'scheduled', date: '2026-05-14T10:00:00Z' }
    ];
    res.json({ success: true, posts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
