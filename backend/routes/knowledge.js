const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const authenticate = require('../middleware/authMiddleware');
const { getGeminiResponse } = require('../utils/geminiHelper');

// New AI Chat Endpoint (Safe Integration)
router.post('/ai/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ success: false, message: 'Message required' });

        // 1. Search Local DB for context
        let context = "";
        try {
            const [articles] = await query(
                'SELECT title, content FROM knowledge_articles WHERE is_published = TRUE AND (title LIKE ? OR content LIKE ?)', 
                [`%${message}%`, `%${message}%`]
            );
            if (articles && articles.length > 0) {
                context = `Relevant Docs: ${articles.map(a => `${a.title}: ${a.content}`).join(' | ')}`;
            }
        } catch (dbErr) {
            console.error('Local Search Error:', dbErr.message);
        }

        // 2. Try Gemini AI
        const aiAnswer = await getGeminiResponse(`${context}\n\nUser Question: ${message}`);

        if (aiAnswer) {
            return res.json({ success: true, reply: aiAnswer });
        }

        // 3. Final Fallback if AI fails
        res.json({ success: true, reply: "I'm processing your request in standard mode. How can I assist you?" });

    } catch (err) {
        console.error('Global AI Route Error:', err.message);
        res.status(500).json({ success: false, message: 'Assistant is taking a quick break. Try again!' });
    }
});

/**
 * Utility to generate slug from title
 */
const generateSlug = (title) => {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};

/* ==================================
   PUBLIC ROUTES (FOR USERS)
   ================================== */

// 1. Search Articles or List All
router.get('/articles', async (req, res) => {
    const { search, category_id } = req.query;
    let sql = 'SELECT a.id, a.title, a.slug, a.summary, a.category_id, c.name as category_name, a.view_count, a.created_at FROM knowledge_articles a JOIN knowledge_categories c ON a.category_id = c.id WHERE a.is_published = TRUE';
    const params = [];

    if (search) {
        sql += ' AND (a.title LIKE ? OR a.content LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }
    if (category_id) {
        sql += ' AND a.category_id = ?';
        params.push(category_id);
    }

    sql += ' ORDER BY a.created_at DESC';

    try {
        const [rows] = await query(sql, params);
        res.json({ success: true, articles: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch articles' });
    }
});

// 2. Get Categories
router.get('/categories', async (req, res) => {
    try {
        const [rows] = await query('SELECT * FROM knowledge_categories ORDER BY display_order ASC');
        res.json({ success: true, categories: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch categories' });
    }
});

// 3. Get Single Article by Slug
router.get('/articles/:slug', async (req, res) => {
    try {
        const [rows] = await query(
            'SELECT a.*, c.name as category_name FROM knowledge_articles a JOIN knowledge_categories c ON a.category_id = c.id WHERE a.slug = ? AND a.is_published = TRUE',
            [req.params.slug]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Article not found' });
        
        // Background update view count
        query('UPDATE knowledge_articles SET view_count = view_count + 1 WHERE id = ?', [rows[0].id]).catch(() => {});

        res.json({ success: true, article: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch article' });
    }
});

/* ==================================
   ADMIN ROUTES (PROTECTED)
   ================================== */

// check admin middleware
const checkAdmin = (req, res, next) => {
    const role = (req.user.role || '').toLowerCase();
    if (!['admin', 'superadmin'].includes(role)) {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
};

// 4. Create Article
router.post('/admin/articles', authenticate, checkAdmin, async (req, res) => {
    const { title, content, category_id, is_published = true, summary } = req.body;
    if (!title || !content || !category_id) return res.status(400).json({ success: false, message: 'Missing fields' });

    const slug = `${generateSlug(title)}-${Date.now()}`;

    try {
        await query(
            'INSERT INTO knowledge_articles (title, slug, content, category_id, is_published, summary) VALUES (?, ?, ?, ?, ?, ?)',
            [title, slug, content, category_id, is_published, summary]
        );
        res.json({ success: true, message: 'Article created' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to create article' });
    }
});

// 5. Update Article
router.put('/admin/articles/:id', authenticate, checkAdmin, async (req, res) => {
    const { title, content, category_id, is_published, summary } = req.body;
    const articleId = req.params.id;

    try {
        const updates = [];
        const params = [];
        if (title) { 
            updates.push('title = ?', 'slug = ?'); 
            params.push(title, `${generateSlug(title)}-${articleId}`); 
        }
        if (content) { updates.push('content = ?'); params.push(content); }
        if (category_id) { updates.push('category_id = ?'); params.push(category_id); }
        if (is_published !== undefined) { updates.push('is_published = ?'); params.push(is_published); }
        if (summary) { updates.push('summary = ?'); params.push(summary); }

        if (updates.length > 0) {
            params.push(articleId);
            await query(`UPDATE knowledge_articles SET ${updates.join(', ')} WHERE id = ?`, params);
        }
        res.json({ success: true, message: 'Article updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update article' });
    }
});

// 6. Delete Article
router.delete('/admin/articles/:id', authenticate, checkAdmin, async (req, res) => {
    try {
        await query('DELETE FROM knowledge_articles WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Article deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Delete failed' });
    }
});

module.exports = router;
