const express = require('express');
const { query } = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware'); // Ensure auth middleware is used
const ccav = require('../utils/ccavutil');
const qs = require('querystring');
const axios = require('axios');

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

// GET wallet transactions (Admin sees all, Reseller sees theirs + clients, User sees theirs)
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const targetClientId = req.query.clientId;

    let baseSql = `
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
    `;
    const params = [];
    let whereClauses = [];

    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'super_admin';
    const isReseller = req.user.role === 'reseller';

    if (targetClientId) {
      // Fetching for a specific client
      whereClauses.push('t.user_id = ?');
      params.push(targetClientId);

      if (isReseller) {
        // Enforce reseller ownership
        whereClauses.push('u.reseller_id = ?');
        params.push(req.user.actual_reseller_id || req.user.id);
      } else if (!isAdmin) {
        // Normal user trying to fetch another user's data? Deny.
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    } else {
      // Fetching general transactions
      if (isReseller) {
        // Reseller sees their own transactions AND their clients' transactions
        whereClauses.push('(t.user_id = ? OR u.reseller_id = ?)');
        const resId = req.user.actual_reseller_id || req.user.id;
        params.push(req.user.id, resId);
      } else if (!isAdmin) {
        // Normal user only sees their own
        whereClauses.push('t.user_id = ?');
        params.push(req.user.id);
      }
    }

    if (whereClauses.length > 0) {
      baseSql += ' WHERE ' + whereClauses.join(' AND ');
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

// GET advanced hierarchical credit ledger (Super Admin & Reseller Only)
router.get('/ledger', authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'super_admin' || req.user.id === 56;
    const isReseller = req.user.role === 'reseller';

    if (!isAdmin && !isReseller) {
      return res.status(403).json({ success: false, message: 'Unauthorized. Ledger access is restricted to Admins and Resellers.' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let baseSql = `
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN users r ON u.reseller_id = r.id
    `;
    const params = [];
    let whereClauses = [];

    // Filter by specific user if provided
    if (req.query.userId) {
      whereClauses.push('t.user_id = ?');
      params.push(req.query.userId);
    }
    
    // Filter by type if provided
    if (req.query.type) {
      whereClauses.push('t.type = ?');
      params.push(req.query.type);
    }

    // Role-based scoping
    if (isReseller) {
      const resId = req.user.actual_reseller_id || req.user.id;
      const resEmail = req.user.email;

      // Reseller ONLY sees transactions for their own clients (not reseller's own account transactions with Super Admin)
      whereClauses.push('(u.reseller_id = ? OR u.reseller_id IN (SELECT id FROM resellers WHERE email = ?) OR u.reseller_id = ?)');
      params.push(resId, resEmail, req.user.id);

      // Exclude reseller's own user ID so reseller doesn't see their own transactions with Super Admin
      whereClauses.push('t.user_id != ?');
      params.push(req.user.id);
    }

    if (whereClauses.length > 0) {
      baseSql += ' WHERE ' + whereClauses.join(' AND ');
    }

    // Get total count & totals across all pages
    const [statsResult] = await query(`
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0 END), 0) as total_added,
        COALESCE(SUM(CASE WHEN t.type = 'debit' THEN t.amount ELSE 0 END), 0) as total_deducted
      ${baseSql}
    `, params);

    const total = statsResult[0]?.total || 0;
    const overallAdded = parseFloat(statsResult[0]?.total_added || 0);
    const overallDeducted = parseFloat(statsResult[0]?.total_deducted || 0);

    // Get enriched data
    const selectSql = `
      SELECT 
        t.id, t.type, t.amount, t.description, t.status, t.created_at,
        u.name as owner_name, u.email as owner_email, u.role as owner_role,
        COALESCE(r.name, (SELECT name FROM users WHERE id = u.reseller_id LIMIT 1), (SELECT name FROM resellers WHERE id = u.reseller_id LIMIT 1)) as reseller_name,
        COALESCE(r.email, (SELECT email FROM users WHERE id = u.reseller_id LIMIT 1), (SELECT email FROM resellers WHERE id = u.reseller_id LIMIT 1)) as reseller_email
      ${baseSql}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await query(selectSql, [...params, limit, offset]);

    res.json({
      success: true,
      ledger: rows,
      summary: {
        totalAdded: overallAdded,
        totalDeducted: overallDeducted
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('LEDGER ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch ledger' });
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

    let merchantId = (process.env.CCAVENUE_MERCHANT_ID || '').trim();
    let accessCode = (process.env.CCAVENUE_ACCESS_CODE || '').trim();
    let workingKey = (process.env.CCAVENUE_WORKING_KEY || '').trim();
    let currentResellerId = req.user.actual_reseller_id;

    // Check if user belongs to a reseller with their own gateway
    // NOTE: If the logged in user IS a reseller, they should pay the Super Admin (Platform)
    if (currentResellerId && req.user.role !== 'reseller') {
        console.log(`[Payment] User ${userId} (Role: ${req.user.role}) is under Reseller ${currentResellerId}. Fetching gateway...`);
        const [reseller] = await query(
            'SELECT payment_gateway_type, ccavenue_merchant_id, ccavenue_access_code, ccavenue_working_key FROM resellers WHERE id = ?',
            [currentResellerId]
        );

        if (reseller.length > 0 && reseller[0].payment_gateway_type === 'ccavenue' && reseller[0].ccavenue_merchant_id) {
            merchantId = reseller[0].ccavenue_merchant_id;
            accessCode = reseller[0].ccavenue_access_code;
            workingKey = reseller[0].ccavenue_working_key;
            console.log(`[Payment] ✅ Using Reseller Gateway (ID: ${currentResellerId}, Merchant: ${merchantId})`);
        } else {
            console.log(`[Payment] ⚠️ Reseller ${currentResellerId} has no gateway configured. Type: ${reseller[0]?.payment_gateway_type}`);
            // Error for sub-users if reseller hasn't configured gateway
            return res.status(400).json({ 
                success: false, 
                message: 'Payment gateway is not configured by your provider. Please contact your administrator/reseller.' 
            });
        }
    } else {
        console.log(`[Payment] Using Platform (Super Admin) Gateway for User ${userId}. ResellerID: ${currentResellerId}, Role: ${req.user.role}`);
    }

    if (!merchantId || !accessCode || !workingKey) {
        return res.status(500).json({ success: false, message: 'Payment gateway configuration missing' });
    }

    const orderId = `${Date.now()}${userId}`; // Keep it numeric-ish, no special chars
    const baseUrl = process.env.BACKEND_URL || 'https://notifynow.in/api';
    const redirectUrl = currentResellerId 
        ? `${baseUrl}/wallet/ccavenue-response?reseller_id=${currentResellerId}`
        : `${baseUrl}/wallet/ccavenue-response`;
    const cancelUrl = redirectUrl;

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
        const { reseller_id } = req.query;
        let workingKey = process.env.CCAVENUE_WORKING_KEY;

        if (reseller_id) {
            const [rows] = await query('SELECT ccavenue_working_key FROM resellers WHERE id = ?', [reseller_id]);
            if (rows.length > 0 && rows[0].ccavenue_working_key) {
                workingKey = rows[0].ccavenue_working_key;
                console.log(`[Payment Response] Using Reseller Working Key (ID: ${reseller_id})`);
            }
        }

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

/**
 * Get Available Payment Gateways for user
 */
router.get('/gateways', authenticateToken, async (req, res) => {
  try {
    const gateways = [];
    const currentResellerId = req.user.actual_reseller_id;

    if (currentResellerId && req.user.role !== 'reseller') {
      const [reseller] = await query(
        'SELECT payment_gateway_type, ccavenue_merchant_id, paypal_client_id FROM resellers WHERE id = ?',
        [currentResellerId]
      );

      if (reseller.length > 0) {
        const type = reseller[0].payment_gateway_type;
        if (type === 'ccavenue' && reseller[0].ccavenue_merchant_id) {
          gateways.push('ccavenue');
        } else if (type === 'paypal' && reseller[0].paypal_client_id) {
          gateways.push('paypal');
        } else if (type === 'both') {
          if (reseller[0].ccavenue_merchant_id) gateways.push('ccavenue');
          if (reseller[0].paypal_client_id) gateways.push('paypal');
        }
      }
    }

    if (gateways.length === 0) {
      // Fallback to platform settings
      if (process.env.CCAVENUE_MERCHANT_ID) gateways.push('ccavenue');
      if (process.env.PAYPAL_CLIENT_ID) gateways.push('paypal');
    }

    res.json({ success: true, gateways });
  } catch (err) {
    console.error('GET GATEWAYS ERROR:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Initiate PayPal Recharge Payment
 */
router.post('/paypal-initiate', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;

    if (!amount || isNaN(amount) || amount < 1) {
      return res.status(400).json({ success: false, message: 'Invalid recharge amount' });
    }

    let clientId = (process.env.PAYPAL_CLIENT_ID || '').trim();
    let secretKey = (process.env.PAYPAL_SECRET_KEY || '').trim();
    let mode = (process.env.PAYPAL_MODE || 'sandbox').trim();
    let currentResellerId = req.user.actual_reseller_id;

    if (currentResellerId && req.user.role !== 'reseller') {
      const [reseller] = await query(
        'SELECT payment_gateway_type, paypal_client_id, paypal_secret_key, paypal_mode FROM resellers WHERE id = ?',
        [currentResellerId]
      );

      if (reseller.length > 0 && (reseller[0].payment_gateway_type === 'paypal' || reseller[0].payment_gateway_type === 'both') && reseller[0].paypal_client_id) {
        clientId = reseller[0].paypal_client_id;
        secretKey = reseller[0].paypal_secret_key;
        mode = reseller[0].paypal_mode || 'sandbox';
      } else {
        return res.status(400).json({ 
          success: false, 
          message: 'PayPal gateway is not configured by your provider.' 
        });
      }
    }

    if (!clientId || !secretKey) {
      return res.status(500).json({ success: false, message: 'PayPal gateway configuration missing' });
    }

    // Get PayPal token
    const paypalUrl = mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
    const authString = Buffer.from(`${clientId}:${secretKey}`).toString('base64');
    
    const tokenResponse = await axios.post(
      `${paypalUrl}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Calculate USD amount (INR to USD)
    const rate = parseFloat(process.env.PAYPAL_INR_TO_USD_RATE || '83');
    const amountInUSD = (parseFloat(amount) / rate).toFixed(2);

    const orderId = `${Date.now()}${userId}`;
    const baseUrl = process.env.BACKEND_URL || 'https://notifynow.in/api';
    const returnUrl = currentResellerId
      ? `${baseUrl}/wallet/paypal-response?reseller_id=${currentResellerId}&original_amount=${amount}&user_id=${userId}`
      : `${baseUrl}/wallet/paypal-response?original_amount=${amount}&user_id=${userId}`;
    const cancelUrl = `${process.env.FRONTEND_URL || 'https://notifynow.in'}/wallet?status=failed`;

    // Create PayPal Order
    const orderResponse = await axios.post(
      `${paypalUrl}/v2/checkout/orders`,
      {
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: amountInUSD
          },
          description: `NotifyNow Wallet Recharge - Order ${orderId}`
        }],
        application_context: {
          return_url: returnUrl,
          cancel_url: cancelUrl,
          user_action: 'PAY_NOW',
          shipping_preference: 'NO_SHIPPING'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const approveLink = orderResponse.data.links.find(link => link.rel === 'approve');
    if (!approveLink) {
      throw new Error('PayPal approval link not found');
    }

    res.json({
      success: true,
      order_id: orderResponse.data.id,
      approve_url: approveLink.href
    });

  } catch (err) {
    console.error('PAYPAL INITIATE ERROR:', err.response?.data || err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PayPal Response Handler (Redirect Callback)
 */
router.get('/paypal-response', async (req, res) => {
  try {
    const { token, reseller_id, original_amount, user_id } = req.query;
    
    if (!token || !original_amount || !user_id) {
      return res.status(400).send('Invalid Response Parameters');
    }

    let clientId = (process.env.PAYPAL_CLIENT_ID || '').trim();
    let secretKey = (process.env.PAYPAL_SECRET_KEY || '').trim();
    let mode = (process.env.PAYPAL_MODE || 'sandbox').trim();

    if (reseller_id) {
      const [reseller] = await query(
        'SELECT paypal_client_id, paypal_secret_key, paypal_mode FROM resellers WHERE id = ?',
        [reseller_id]
      );
      if (reseller.length > 0 && reseller[0].paypal_client_id) {
        clientId = reseller[0].paypal_client_id;
        secretKey = reseller[0].paypal_secret_key;
        mode = reseller[0].paypal_mode || 'sandbox';
      }
    }

    const paypalUrl = mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
    const authString = Buffer.from(`${clientId}:${secretKey}`).toString('base64');
    
    // Get PayPal token
    const tokenResponse = await axios.post(
      `${paypalUrl}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Capture Order
    console.log(`[PayPal Callback] Order: ${token}, User: ${user_id}. Attempting Capture...`);
    const captureResponse = await axios.post(
      `${paypalUrl}/v2/checkout/orders/${token}/capture`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const orderStatus = captureResponse.data.status;
    console.log(`[PayPal Capture] Status: ${orderStatus}`);

    if (orderStatus === 'COMPLETED') {
      const amount = parseFloat(original_amount);

      // Idempotency: check if transaction already processed
      const [existing] = await query('SELECT id FROM transactions WHERE description LIKE ?', [`%PayPal Order: ${token}%`]);

      if (existing.length === 0) {
        // Update User Balance
        await query('UPDATE users SET wallet_balance = wallet_balance + ?, credits_available = credits_available + ? WHERE id = ?', 
            [amount, amount, user_id]);

        // Log Transaction
        await query(`
            INSERT INTO transactions (user_id, type, amount, description, status)
            VALUES (?, 'credit', ?, ?, 'completed')
        `, [user_id, amount, `PayPal Recharge (PayPal Order: ${token})`]);
      }

      return res.redirect(`${process.env.FRONTEND_URL || 'https://notifynow.in'}/wallet?status=success&amt=${amount}`);
    } else {
      return res.redirect(`${process.env.FRONTEND_URL || 'https://notifynow.in'}/wallet?status=failed`);
    }

  } catch (err) {
    console.error('PAYPAL CALLBACK ERROR:', err.response?.data || err.message);
    res.redirect(`${process.env.FRONTEND_URL || 'https://notifynow.in'}/wallet?status=failed`);
  }
});

// POST /api/wallet/manage-credits (Super Admin & Reseller can allocate/deduct credits)
router.post('/manage-credits', authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'super_admin' || req.user.id === 56;
    const isReseller = req.user.role === 'reseller';

    if (!isAdmin && !isReseller) {
      return res.status(403).json({ success: false, message: 'Unauthorized. Only Admins and Resellers can manage credits.' });
    }

    const { targetUserId, action, amount, description } = req.body;
    const numAmount = parseFloat(amount);

    if (!targetUserId || !action || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid target user, action, or amount.' });
    }

    // Fetch target user
    const [targetRows] = await query('SELECT id, name, email, role, wallet_balance, credits_available, reseller_id FROM users WHERE id = ?', [targetUserId]);
    if (!targetRows.length) {
      return res.status(404).json({ success: false, message: 'Target user not found.' });
    }
    const targetUser = targetRows[0];

    const currentTargetBal = parseFloat(targetUser.wallet_balance || targetUser.credits_available || 0);

    // Reseller scoping validation
    if (isReseller) {
      const resId = req.user.actual_reseller_id || req.user.id;
      if (Number(targetUser.reseller_id) !== Number(resId)) {
        return res.status(403).json({ success: false, message: 'You can only manage credits for your own clients.' });
      }

      const [resellerRows] = await query('SELECT id, name, email, wallet_balance, credits_available FROM users WHERE id = ?', [req.user.id]);
      const currentResellerBal = parseFloat(resellerRows[0]?.wallet_balance || resellerRows[0]?.credits_available || 0);

      if (action === 'add') {
        if (currentResellerBal < numAmount) {
          return res.status(400).json({ success: false, message: `Insufficient balance in your account (₹${currentResellerBal.toFixed(2)}). Cannot allocate ₹${numAmount.toFixed(2)}.` });
        }

        // Deduct from Reseller
        await query('UPDATE users SET wallet_balance = wallet_balance - ?, credits_available = credits_available - ? WHERE id = ?', [numAmount, numAmount, req.user.id]);
        await query('INSERT INTO transactions (user_id, type, amount, description, status) VALUES (?, "debit", ?, ?, "completed")', [
          req.user.id, numAmount, description ? `Credit allocated to ${targetUser.name} (${targetUser.email}): ${description}` : `Credit allocated to client ${targetUser.name} (${targetUser.email})`
        ]);

        // Add to Client
        await query('UPDATE users SET wallet_balance = wallet_balance + ?, credits_available = credits_available + ? WHERE id = ?', [numAmount, numAmount, targetUserId]);
        await query('INSERT INTO transactions (user_id, type, amount, description, status) VALUES (?, "credit", ?, ?, "completed")', [
          targetUserId, numAmount, description ? `Credit received from Reseller: ${description}` : `Credit received from Reseller (${req.user.name || req.user.email})`
        ]);
      } else if (action === 'deduct') {
        if (currentTargetBal < numAmount) {
          return res.status(400).json({ success: false, message: `Client only has ₹${currentTargetBal.toFixed(2)}. Cannot deduct ₹${numAmount.toFixed(2)}.` });
        }

        // Deduct from Client
        await query('UPDATE users SET wallet_balance = wallet_balance - ?, credits_available = credits_available - ? WHERE id = ?', [numAmount, numAmount, targetUserId]);
        await query('INSERT INTO transactions (user_id, type, amount, description, status) VALUES (?, "debit", ?, ?, "completed")', [
          targetUserId, numAmount, description ? `Credit reclaimed by Reseller: ${description}` : `Credit reclaimed by Reseller`
        ]);

        // Refund back to Reseller
        await query('UPDATE users SET wallet_balance = wallet_balance + ?, credits_available = credits_available + ? WHERE id = ?', [numAmount, numAmount, req.user.id]);
        await query('INSERT INTO transactions (user_id, type, amount, description, status) VALUES (?, "credit", ?, ?, "completed")', [
          req.user.id, numAmount, description ? `Credit reclaimed from ${targetUser.name}: ${description}` : `Credit reclaimed from client ${targetUser.name}`
        ]);
      }
    } else {
      // Super Admin execution
      if (action === 'add') {
        await query('UPDATE users SET wallet_balance = wallet_balance + ?, credits_available = credits_available + ? WHERE id = ?', [numAmount, numAmount, targetUserId]);
        await query('INSERT INTO transactions (user_id, type, amount, description, status) VALUES (?, "credit", ?, ?, "completed")', [
          targetUserId, numAmount, description ? `Credit added by Admin: ${description}` : `Credit allocated by Admin (${req.user.name || req.user.email})`
        ]);
      } else if (action === 'deduct') {
        if (currentTargetBal < numAmount) {
          return res.status(400).json({ success: false, message: `User only has ₹${currentTargetBal.toFixed(2)}. Cannot deduct ₹${numAmount.toFixed(2)}.` });
        }
        await query('UPDATE users SET wallet_balance = wallet_balance - ?, credits_available = credits_available - ? WHERE id = ?', [numAmount, numAmount, targetUserId]);
        await query('INSERT INTO transactions (user_id, type, amount, description, status) VALUES (?, "debit", ?, ?, "completed")', [
          targetUserId, numAmount, description ? `Credit deducted by Admin: ${description}` : `Credit deducted by Admin`
        ]);
      }
    }

    // Fetch updated balance
    const [updatedRows] = await query('SELECT wallet_balance, credits_available FROM users WHERE id = ?', [targetUserId]);
    const finalBalance = parseFloat(updatedRows[0]?.wallet_balance || updatedRows[0]?.credits_available || 0);

    res.json({
      success: true,
      message: `Successfully ${action === 'add' ? 'added' : 'deducted'} ${numAmount.toLocaleString()} credits for ${targetUser.name}.`,
      newBalance: finalBalance
    });
  } catch (err) {
    console.error('MANAGE CREDITS ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update user credits', error: err.message });
  }
});

/**
 * GET /api/wallet/reseller-monthly-summary
 * Fetches monthly credit allocation, spending, channel breakdown, and client breakdown for resellers & clients
 */
router.get('/reseller-monthly-summary', authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'super_admin' || req.user.id === 56;
    const isReseller = req.user.role === 'reseller';

    if (!isAdmin && !isReseller) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const { month, resellerId: reqResellerId, clientId: reqClientId } = req.query;

    // Default to current month YYYY-MM if not provided
    const targetMonth = month && /^\d{4}-\d{2}$/.test(month) 
      ? month 
      : new Date().toISOString().slice(0, 7);

    const startDate = `${targetMonth}-01 00:00:00`;
    const year = parseInt(targetMonth.split('-')[0]);
    const m = parseInt(targetMonth.split('-')[1]);
    const lastDay = new Date(year, m, 0).getDate();
    const endDate = `${targetMonth}-${String(lastDay).padStart(2, '0')} 23:59:59`;

    // 1. Fetch list of resellers (for Super Admin dropdown)
    let resellersList = [];
    if (isAdmin) {
      const [rRows] = await query(`
        SELECT DISTINCT u.id, u.name, u.email, u.wallet_balance, u.credits_available 
        FROM users u 
        LEFT JOIN resellers r ON u.email = r.email
        WHERE u.role = 'reseller' 
           OR r.id IS NOT NULL 
           OR u.id IN (SELECT DISTINCT reseller_id FROM users WHERE reseller_id IS NOT NULL)
        ORDER BY u.name ASC
      `);
      resellersList = rRows;
    }

    let activeResellerId = reqResellerId;
    if (isReseller) {
      activeResellerId = req.user.id.toString();
    }

    // Determine target reseller user object if a specific reseller ID is provided
    let resellerObj = null;
    if (activeResellerId && activeResellerId !== 'all') {
      const [rRows] = await query(`
        SELECT id, name, email, wallet_balance, credits_available 
        FROM users 
        WHERE id = ? 
           OR email = (SELECT email FROM resellers WHERE id = ?)
      `, [activeResellerId, activeResellerId]);
      resellerObj = rRows[0] || null;
    } else if (isReseller) {
      const [rRows] = await query('SELECT id, name, email, wallet_balance, credits_available FROM users WHERE id = ? OR email = ?', [req.user.id, req.user.email]);
      resellerObj = rRows[0] || null;
    }

    // 2. Fetch clients matching the target reseller and client filter
    let clientWhere = [];
    let clientParams = [];

    if (resellerObj) {
      clientWhere.push("(reseller_id = ? OR reseller_id IN (SELECT id FROM resellers WHERE email = ?) OR reseller_id = ?)");
      clientParams.push(resellerObj.id, resellerObj.email, resellerObj.id);
    } else if (isReseller) {
      const resId = req.user.actual_reseller_id || req.user.id;
      clientWhere.push("(reseller_id = ? OR reseller_id IN (SELECT id FROM resellers WHERE email = ?) OR reseller_id = ?)");
      clientParams.push(resId, req.user.email, req.user.id);
    } else if (isAdmin) {
      // If Admin and "All Resellers" is selected, select all client users
      clientWhere.push("role = 'user'");
    }

    // Filter by specific client if requested
    if (reqClientId && reqClientId !== 'all') {
      clientWhere.push("id = ?");
      clientParams.push(reqClientId);
    }

    const whereSql = clientWhere.length > 0 ? 'WHERE ' + clientWhere.join(' AND ') : '';

    const [clients] = await query(`
      SELECT id, name, email, role, wallet_balance, credits_available, created_at 
      FROM users 
      ${whereSql}
      ORDER BY name ASC
    `, clientParams);

    const clientIds = clients.map(c => c.id);

    // 3. Admin Allocated Credits (Credits given to Reseller/All Resellers in month)
    let adminAllocatedCredits = 0;
    if (resellerObj) {
      const [adminAllocRows] = await query(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE user_id = ? AND type = 'credit' AND created_at >= ? AND created_at <= ?
      `, [resellerObj.id, startDate, endDate]);
      adminAllocatedCredits = parseFloat(adminAllocRows[0]?.total || 0);
    } else if (isAdmin) {
      const resellerUserIds = resellersList.map(r => r.id);
      if (resellerUserIds.length > 0) {
        const [adminAllocRows] = await query(`
          SELECT COALESCE(SUM(amount), 0) as total
          FROM transactions
          WHERE user_id IN (?) AND type = 'credit' AND created_at >= ? AND created_at <= ?
        `, [resellerUserIds, startDate, endDate]);
        adminAllocatedCredits = parseFloat(adminAllocRows[0]?.total || 0);
      }
    }

    let resellerAllocatedCredits = 0;
    let totalSpentCredits = 0;
    let whatsappSpent = 0;
    let rcsSpent = 0;
    let smsSpent = 0;
    let clientBreakdown = [];

    if (clientIds.length > 0) {
      // 4. Credits Allocated by Reseller to Clients in target month
      const [resellerAllocRows] = await query(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE user_id IN (?) AND type = 'credit' AND created_at >= ? AND created_at <= ?
      `, [clientIds, startDate, endDate]);
      resellerAllocatedCredits = parseFloat(resellerAllocRows[0]?.total || 0);

      // 5. Total Spent by Clients in target month
      const [spentRows] = await query(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE user_id IN (?) AND type = 'debit' AND created_at >= ? AND created_at <= ?
      `, [clientIds, startDate, endDate]);
      totalSpentCredits = parseFloat(spentRows[0]?.total || 0);

      // 6. Channel Breakdown in target month
      const [channelRows] = await query(`
        SELECT 
          COALESCE(SUM(CASE WHEN LOWER(description) LIKE '%whatsapp%' THEN amount ELSE 0 END), 0) as wa_spent,
          COALESCE(SUM(CASE WHEN LOWER(description) LIKE '%rcs%' THEN amount ELSE 0 END), 0) as rcs_spent,
          COALESCE(SUM(CASE WHEN LOWER(description) LIKE '%sms%' OR LOWER(description) LIKE '%dlt%' THEN amount ELSE 0 END), 0) as sms_spent
        FROM transactions
        WHERE user_id IN (?) AND type = 'debit' AND created_at >= ? AND created_at <= ?
      `, [clientIds, startDate, endDate]);

      whatsappSpent = parseFloat(channelRows[0]?.wa_spent || 0);
      rcsSpent = parseFloat(channelRows[0]?.rcs_spent || 0);
      smsSpent = parseFloat(channelRows[0]?.sms_spent || 0);

      // 7. Per-Client Breakdown in target month
      const [clientStats] = await query(`
        SELECT 
          user_id,
          COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) as allocated,
          COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) as spent,
          COALESCE(SUM(CASE WHEN type = 'debit' AND LOWER(description) LIKE '%whatsapp%' THEN amount ELSE 0 END), 0) as wa_spent,
          COALESCE(SUM(CASE WHEN type = 'debit' AND LOWER(description) LIKE '%rcs%' THEN amount ELSE 0 END), 0) as rcs_spent,
          COALESCE(SUM(CASE WHEN type = 'debit' AND (LOWER(description) LIKE '%sms%' OR LOWER(description) LIKE '%dlt%') THEN amount ELSE 0 END), 0) as sms_spent
        FROM transactions
        WHERE user_id IN (?) AND created_at >= ? AND created_at <= ?
        GROUP BY user_id
      `, [clientIds, startDate, endDate]);

      const statsMap = new Map();
      clientStats.forEach(st => statsMap.set(st.user_id, st));

      clientBreakdown = clients.map(c => {
        const st = statsMap.get(c.id) || {};
        return {
          id: c.id,
          name: c.name,
          email: c.email,
          allocated: parseFloat(st.allocated || 0),
          spent: parseFloat(st.spent || 0),
          whatsappSpent: parseFloat(st.wa_spent || 0),
          rcsSpent: parseFloat(st.rcs_spent || 0),
          smsSpent: parseFloat(st.sms_spent || 0),
          currentBalance: parseFloat(c.wallet_balance || c.credits_available || 0)
        };
      });
    }

    const resellerCurrentBalance = resellerObj ? parseFloat(resellerObj.wallet_balance || resellerObj.credits_available || 0) : 0;
    const otherSpent = Math.max(0, totalSpentCredits - (whatsappSpent + rcsSpent + smsSpent));

    res.json({
      success: true,
      month: targetMonth,
      reseller: resellerObj,
      resellers: resellersList,
      clients: clients.map(c => ({ id: c.id, name: c.name, email: c.email })),
      summary: {
        adminAllocatedCredits,
        resellerAllocatedCredits,
        totalSpentCredits,
        resellerCurrentBalance,
        totalClients: clients.length,
        channelBreakdown: {
          whatsapp: whatsappSpent,
          rcs: rcsSpent,
          sms: smsSpent,
          other: otherSpent
        },
        clientBreakdown
      }
    });

  } catch (err) {
    console.error('RESELLER MONTHLY SUMMARY ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch reseller monthly summary', error: err.message });
  }
});

module.exports = router;