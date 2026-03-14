const axios = require('axios');
require('dotenv').config();

const ADMIN_EMAILS = [
  'vikas@cell24x7.in',
  'sd@cell24x7.com',
  'pillai@cell24x7.com',
  'raghunath@cell24x7.com'
];

/**
 * Send an email using the external API
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Email body text
 */
const sendEmail = async (to, subject, text) => {
  const emailUser = process.env.EMAIL_API_USER;
  const emailPass = process.env.EMAIL_API_PASS;
  const fromAddr = process.env.EMAIL_FROM_ADDR || 'support@cell24x7.com';

  if (!emailUser || !emailPass) {
    console.log(`[DEV MODE] Email to ${to}: ${subject} \n${text}`);
    return;
  }

  try {
    const apiUrl = process.env.EMAIL_API_URL;
    if (!apiUrl) throw new Error('EMAIL_API_URL is missing in .env');

    console.log(`[EMAIL] Attempting to send to ${to} via ${apiUrl}`);
    // The API seems to accept query params based on auth.js
    const response = await axios.post(apiUrl, {
      user: emailUser,
      pwd: emailPass,
      fromAdd: fromAddr,
      toAdd: to,
      fromName: 'NotifyNow',
      subject: subject,
      body: text
    }, { timeout: 10000 }); // 10s timeout

    console.log(`📧 [EMAIL] API Response for ${to}:`, response.data);
    return response.data;
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error(`❌ [EMAIL] Send failed to ${to}:`, errorMsg);
    throw new Error(`Email Service Error: ${errorMsg}`);
  }
};

/**
 * Send notification to admins about user activity
 * @param {Object} user - User object containing details
 * @param {string} type - 'SIGNUP' or 'PROFILE_UPDATE'
 */
const sendAdminNotification = async (user, type) => {
  let subject = '';
  let body = '';

  if (type === 'SIGNUP') {
    subject = `New User Signup: ${user.name || 'User'}`;
    body = `
      <h3>New User Registration Details:</h3>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; font-family: Arial, sans-serif; width: 100%; max-width: 600px;">
        <tr style="background-color: #f2f2f2;">
          <th style="text-align: left;">Field</th>
          <th style="text-align: left;">Value</th>
        </tr>
        <tr>
          <td><b>Name</b></td>
          <td>${user.name || 'N/A'}</td>
        </tr>
        <tr>
          <td><b>Email</b></td>
          <td>${user.email || 'N/A'}</td>
        </tr>
        <tr>
          <td><b>Mobile</b></td>
          <td>${user.contact_phone || 'N/A'}</td>
        </tr>
        <tr>
          <td><b>Company</b></td>
          <td>${user.company || 'N/A'}</td>
        </tr>
        <tr>
          <td><b>Role</b></td>
          <td>${user.role || 'user'}</td>
        </tr>
        <tr>
          <td><b>Plan</b></td>
          <td>${user.plan_name || 'Free'}</td>
        </tr>
        <tr>
          <td><b>Signup Method</b></td>
          <td>${user.email ? 'Email' : 'Mobile'}</td>
        </tr>
        <tr>
          <td><b>Time</b></td>
          <td>${new Date().toLocaleString()}</td>
        </tr>
      </table>
        `;
  } else if (type === 'PROFILE_UPDATE') {
    subject = `Profile Updated: ${user.name || user.email} `;
    body = `
      User Profile Updated:
        -----------------------------
            User ID: ${user.id}
        Name: ${user.name || 'N/A'}
        Email: ${user.email || 'N/A'}
        Mobile: ${user.contact_phone || 'N/A'}
        Company: ${user.company || 'N/A'}
        Role: ${user.role || 'user'}
      Channel Config Enabled: ${user.channels_enabled ? 'Yes' : 'No'}
        Time: ${new Date().toLocaleString()}
        `;
  }

  console.log(`🔔 Sending ${type} notification to admins...`);

  // Send to all admins in parallel
  await Promise.all(
    ADMIN_EMAILS.map(email => sendEmail(email, subject, body))
  );
};

module.exports = {
  sendEmail,
  sendAdminNotification
};
