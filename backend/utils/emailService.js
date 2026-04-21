const axios = require('axios');
// Redundant dotenv call removed - handled by index.js

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
 * @param {string|number} otp - Optional OTP (to trigger provider templates)
 * @param {string} template - Template name
 */
const sendEmail = async (to, subject, text, otp = null, template = process.env.EMAIL_OTP_TEMPLATE || 'otp_template_latest_feb') => {
  const emailUser = process.env.EMAIL_API_USER;
  const emailPass = process.env.EMAIL_API_PASS;
  const fromAddr = process.env.EMAIL_FROM_ADDR || 'support@cell24x7.com';
  const useTemplate = process.env.EMAIL_USE_TEMPLATE === 'true';

  if (!emailUser || !emailPass) {
    // console.log(`[DEV MODE] Email to ${to}: ${subject} \n${text}`);
    return;
  }

  try {
    const apiUrl = process.env.EMAIL_API_URL;
    if (!apiUrl) throw new Error('EMAIL_API_URL is missing in .env');

    // Build params for the GET request as per provider format
    const params = {
      user: emailUser,
      pwd: emailPass,
      fromAdd: fromAddr,
      toAdd: to,
      fromName: 'NotifyNow',
      subject: subject,
      body: text
    };

    // If OTP is provided AND templates are enabled, add template and otp params
    if (otp && useTemplate) {
      params.otp = otp;
      params.template = template;
      params.var1 = otp; // Fallback for some providers
      params.var2 = otp; // Fallback
      params.msg = text; // Fallback for message content
      // console.log(`[EMAIL] Attempting to send OTP Email to ${to} using template: ${template}`);
    } else {
      // console.log(`[EMAIL] Attempting to send Regular Email to ${to}`);
    }

    const response = await axios.get(apiUrl, { params, timeout: 10000 });

    // Debug logging (masking password)
    const logParams = { ...params, pwd: '****' };
    // console.log(`📧 [EMAIL] Request Params:`, JSON.stringify(logParams));
    // console.log(`📧 [EMAIL] API Response for ${to}:`, response.data);
    
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
  } else if (type === 'TICKET_RAISED') {
    subject = `New Support Ticket [#${user.ticket_id}]: ${user.subject}`;
    body = `
      <h3>New Support Ticket Details:</h3>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; font-family: Arial, sans-serif; width: 100%; max-width: 600px;">
        <tr style="background-color: #f2f2f2;">
          <th style="text-align: left;">Field</th>
          <th style="text-align: left;">Value</th>
        </tr>
        <tr>
          <td><b>Ticket ID</b></td>
          <td>#${user.ticket_id}</td>
        </tr>
        <tr>
          <td><b>Subject</b></td>
          <td>${user.subject}</td>
        </tr>
        <tr>
          <td><b>Category</b></td>
          <td>${user.category}</td>
        </tr>
        <tr>
          <td><b>User Name</b></td>
          <td>${user.name || 'N/A'}</td>
        </tr>
        <tr>
          <td><b>User Email</b></td>
          <td>${user.email || 'N/A'}</td>
        </tr>
        <tr>
          <td><b>Company</b></td>
          <td>${user.company || 'N/A'}</td>
        </tr>
        <tr>
          <td><b>Description</b></td>
          <td>${user.description}</td>
        </tr>
        <tr>
          <td><b>Time</b></td>
          <td>${new Date().toLocaleString()}</td>
        </tr>
      </table>
      <p><a href="${process.env.APP_URL || 'https://notifynow.in'}/admin/support/tickets/${user.ticket_id}">View Ticket in Dashboard</a></p>
    `;

    // 🚀 WhatsApp Notification Logic for Admins can be triggered here
    try {
        const { sendAdminWhatsAppNotification } = require('./whatsappUtils');
        sendAdminWhatsAppNotification(`🔔 *New Support Ticket Raised!* \n\n*ID:* #${user.ticket_id} \n*User:* ${user.name} \n*Subject:* ${user.subject} \n*Category:* ${user.category} \n\nPlease visit the dashboard to respond.`, user.ticket_id);
    } catch(e) {
        console.warn('WhatsApp Admin notification skipped (util not found/failed)');
    }
  }

  // console.log(`🔔 Sending ${type} notification to admins...`);

  // Send to all admins in parallel
  await Promise.all(
    ADMIN_EMAILS.map(email => sendEmail(email, subject, body))
  );
};

module.exports = {
  sendEmail,
  sendAdminNotification
};
