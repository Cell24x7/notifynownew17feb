const express = require('express');
const { query } = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware'); // Ensure auth middleware is used
const ccav = require('../utils/ccavutil');
const qs = require('querystring');

const router = express.Router();

// Get Wallet Balance
// Get Wallet Balance
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const [rows] = await query('SELECT wallet_balance FROM users WHERE id = ?', [req.user.id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, balance: parseFloat(rows[0].wallet_balance) || 0 });
  } catch (err) {
    console.error('BALANCE ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * DEBUG: Verify CCAvenue Config (Securely)
 */
router.get('/debug-config', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const mid = process.env.CCAVENUE_MERCHANT_ID || 'MISSING';
    const acc = process.env.CCAVENUE_ACCESS_CODE || 'MISSING';
    const key = process.env.CCAVENUE_WORKING_KEY || 'MISSING';

    res.json({
        success: true,
        merchant_id: mid.length > 4 ? `${mid.substring(0, 3)}***` : mid,
        access_code: acc.length > 6 ? `${acc.substring(0, 4)}***${acc.substring(acc.length-2)}` : acc,
        working_key_length: key.length,
        working_key_preview: key.length > 5 ? `${key.substring(0, 3)}***` : 'Too Short',
        backend_url: process.env.BACKEND_URL,
        frontend_url: process.env.FRONTEND_URL
    });
});

// GET wallet transactions (Admin sees all, User sees theirs)
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let baseSql = `
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
    `;

    const params = [];

    // If not admin, filter by user_id
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      baseSql += ' WHERE t.user_id = ?';
      params.push(req.user.id);
    }

    // Get total count
    const [countResult] = await query(`SELECT COUNT(*) as total ${baseSql}`, params);
    const total = countResult[0].total;

    // Get paginated data
    const selectSql = `
      SELECT 
        t.id, t.type, t.amount, t.description, t.status, t.created_at,
        u.name as client_name, u.email as client_email
      ${baseSql}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await query(selectSql, [...params, limit, offset]);

    res.json({
      success: true,
      transactions: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('TRANSACTIONS ERROR:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Recharge Wallet (Simulated)
router.post('/recharge', authenticateToken, async (req, res) => {
  const { amount } = req.body;
  const user_id = req.user.id; // Use authenticated user ID

  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid amount' });
  }

  try {
    // 1. Update user balance
    await query(`
      UPDATE users 
      SET wallet_balance = wallet_balance + ?,
          credits_available = credits_available + ?
      WHERE id = ?
    `, [amount, amount, user_id]);

    // 2. Log transaction
    const [result] = await query(`
      INSERT INTO transactions (
        user_id, type, amount, description, status
      ) VALUES (?, 'credit', ?, 'Wallet Recharge', 'completed')
    `, [user_id, amount]);

    // 3. Get updated balance
    const [userRows] = await query('SELECT wallet_balance FROM users WHERE id = ?', [user_id]);
    const newBalance = parseFloat(userRows[0].wallet_balance);

    res.json({ success: true, message: 'Wallet recharged successfully', balance: newBalance, transactionId: result.insertId });
  } catch (err) {
    console.error('RECHARGE ERROR:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Initiate CCAvenue Payment
 */
router.post('/ccavenue-initiate', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;

    if (!amount || isNaN(amount) || amount < 1) {
      return res.status(400).json({ success: false, message: 'Invalid recharge amount' });
    }

    const merchantId = (process.env.CCAVENUE_MERCHANT_ID || '').trim();
    const accessCode = (process.env.CCAVENUE_ACCESS_CODE || '').trim();
    const workingKey = (process.env.CCAVENUE_WORKING_KEY || '').trim();

    if (!merchantId || !accessCode || !workingKey) {
        return res.status(500).json({ success: false, message: 'CCAvenue configuration missing on server' });
    }

    const orderId = `${Date.now()}${userId}`; // Keep it numeric-ish, no special chars
    const redirectUrl = `${process.env.BACKEND_URL || 'https://notifynow.in/api'}/wallet/ccavenue-response`;
    const cancelUrl = `${process.env.BACKEND_URL || 'https://notifynow.in/api'}/wallet/ccavenue-response`;

    // 1. Prepare data (Added mandatory billing fields for authentication)
    const paymentData = {
        merchant_id: merchantId,
        order_id: orderId,
        amount: parseFloat(amount).toFixed(2),
        currency: 'INR',
        redirect_url: redirectUrl,
        cancel_url: cancelUrl,
        language: 'EN',
        billing_name: (req.user.name || 'User').replace(/[^a-zA-Z0-9 ]/g, ''),
        billing_email: req.user.email || '',
        billing_tel: req.user.contact_phone || '9999999999',
        billing_address: 'Main Street',
        billing_city: 'Mumbai',
        billing_state: 'Maharashtra',
        billing_zip: '400001',
        billing_country: 'India',
        merchant_param1: userId.toString(),
        tid: Date.now().toString()
    };

    // 2. Encrypt
    const merchantData = qs.stringify(paymentData);
    const encryptedData = ccav.encrypt(merchantData, workingKey);

    // 3. Return initiation data
    res.json({
        success: true,
        merchant_id: merchantId,
        access_code: accessCode,
        enc_request: encryptedData,
        gateway_url: 'https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction'
    });

  } catch (err) {
    console.error('CCAVENUE INITIATE ERROR:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * CCAvenue Response Handler (Callback)
 */
router.post('/ccavenue-response', async (req, res) => {
    try {
        const { encResp } = req.body;
        const workingKey = process.env.CCAVENUE_WORKING_KEY;

        if (!encResp) return res.status(400).send('Invalid Response');

        // 1. Decrypt
        const decryptedData = ccav.decrypt(encResp, workingKey);
        const responseData = qs.parse(decryptedData);

        const orderId = responseData.order_id;
        const trackingId = responseData.tracking_id;
        const bankRefNo = responseData.bank_ref_no;
        const orderStatus = responseData.order_status;
        const amount = parseFloat(responseData.amount);
        const userId = responseData.merchant_param1;

        console.log(`[CCAvenue Callback] Order: ${orderId}, Status: ${orderStatus}, User: ${userId}`);

        if (orderStatus === 'Success') {
            // 2. Double check if transaction already processed (Idempotency)
            const [existing] = await query('SELECT id FROM transactions WHERE description LIKE ?', [`%Order: ${orderId}%`]);
            
            if (existing.length === 0) {
                // 3. Update User Balance
                await query('UPDATE users SET wallet_balance = wallet_balance + ?, credits_available = credits_available + ? WHERE id = ?', 
                    [amount, amount, userId]);

                // 4. Log Transaction
                await query(`
                    INSERT INTO transactions (user_id, type, amount, description, status)
                    VALUES (?, 'credit', ?, ?, 'completed')
                `, [userId, amount, `CCAvenue Recharge (Order: ${orderId}, Ref: ${bankRefNo})`]);
            }

            // 5. Redirect back to frontend
            return res.redirect(`${process.env.FRONTEND_URL || 'https://notifynow.in'}/wallet?status=success&amt=${amount}`);
        } else {
            return res.redirect(`${process.env.FRONTEND_URL || 'https://notifynow.in'}/wallet?status=failed&order=${orderId}`);
        }

    } catch (err) {
        console.error('CCAVENUE RESPONSE ERROR:', err.message);
        res.status(500).send('Internal Server Error');
    }
});

// Admin Adjust Wallet (Credit/Debit)
router.post('/adjust', authenticateToken, async (req, res) => {
  // Only admin/superadmin can adjust
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const { user_id, type, credits, description } = req.body; // 'credits' here means Amount (Money)

  if (!user_id || credits === undefined || credits === null || !type) {
    return res.status(400).json({ success: false, message: 'Missing required fields: user_id, credits, or type' });
  }

  const amount = parseFloat(credits);
  if (isNaN(amount)) {
    return res.status(400).json({ success: false, message: 'Credits must be a valid number' });
  }

  const isCredit = type === 'adjustment' || type === 'credit'; // 'adjustment' from frontend usually means ADD

  // Determine the amount to add/subtract
  // If type is 'deduction', we subtract (add negative)
  // If type is 'adjustment' or 'refund', we add (add positive)
  let finalAmount = Math.abs(amount);
  if (type === 'deduction') {
    finalAmount = -finalAmount;
  }

  try {
    // 1. Update user balance (Both fields)
    await query(`
        UPDATE users 
        SET wallet_balance = wallet_balance + ?,
            credits_available = credits_available + ?
        WHERE id = ?
      `, [finalAmount, finalAmount, user_id]);

    // 2. Log transaction
    const dbType = finalAmount >= 0 ? 'credit' : 'debit';

    await query(`
        INSERT INTO transactions (
          user_id, type, amount, credits, description, status
        ) VALUES (?, ?, ?, ?, ?, 'completed')
      `, [user_id, dbType, Math.abs(finalAmount), Math.abs(finalAmount), description || 'Admin Adjustment']);

    res.json({ success: true, message: 'Wallet adjusted successfully' });
  } catch (err) {
    console.error('ADJUST ERROR:', err.message);
    // Check for specific DB errors to give better feedback
    if (err.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
      return res.status(400).json({ success: false, message: 'Invalid data format for database' });
    }
    res.status(500).json({ success: false, message: 'Database error: ' + err.message });
  }
});

module.exports = router;