const axios = require('axios');
// Redundant dotenv call removed - handled by index.js

const ADMIN_EMAILS = [
  'vikas@cell24x7.in',
  'sd@cell24x7.com',
  'pillai@cell24x7.com',
  'raghunath@cell24x7.com',
  'sandeep@cell24x7.in'
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
  } else if (type === 'TICKET_RAISED' || type === 'EDIT_REQUEST') {
    const isEdit = type === 'EDIT_REQUEST';
    subject = isEdit ? `[UPDATED] Support Ticket [#${user.ticket_id}]: ${user.subject}` : `[NEW TICKET] #${user.ticket_id}: ${user.subject}`;
    
    // Build attachments HTML if any exist
    let attachmentsHtml = '';
    if (user.attachments && user.attachments.length > 0) {
        attachmentsHtml = `
            <div style="margin-top: 20px;">
                <p style="font-size: 14px; font-weight: bold; color: #475569; margin-bottom: 10px;">📎 Attachments (${user.attachments.length}):</p>
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    ${user.attachments.map((a, i) => `
                        <a href="${process.env.APP_URL || 'https://notifynow.in'}${a.file_url}" 
                           style="display: inline-block; padding: 8px 12px; background: #f1f5f9; border-radius: 6px; color: #0f172a; text-decoration: none; font-size: 12px; font-weight: bold; border: 1px solid #e2e8f0;">
                           View Attachment ${i + 1}
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }

    body = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Support Command Center</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0; font-size: 14px;">${isEdit ? 'Ticket Modification Alert' : 'New Incoming Resolvable Item'}</p>
        </div>
        
        <div style="padding: 30px;">
          <div style="margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center;">
             <span style="background: #fef2f2; color: #dc2626; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase;">Priority: ${user.priority || 'Normal'}</span>
             <span style="font-size: 12px; font-weight: bold; color: #94a3b8;">Ref ID: #${user.ticket_id}</span>
          </div>

          <h3 style="color: #0f172a; font-size: 18px; margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">Ticket Details</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; font-size: 13px; color: #64748b; width: 30%;"><b>Subject</b></td>
              <td style="padding: 12px 0; font-size: 13px; color: #1e293b;"><b>${user.subject}</b></td>
            </tr>
            <tr>
              <td style="padding: 12px 0; font-size: 13px; color: #64748b;"><b>Category</b></td>
              <td style="padding: 12px 0; font-size: 13px; color: #1e293b;">${user.category}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; font-size: 13px; color: #64748b;"><b>Contact Person</b></td>
              <td style="padding: 12px 0; font-size: 13px; color: #1e293b;">${user.name} (${user.email})</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; font-size: 13px; color: #64748b;"><b>Company</b></td>
              <td style="padding: 12px 0; font-size: 13px; color: #1e293b;">${user.company || 'Individual'}</td>
            </tr>
          </table>

          <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-top: 25px; border: 1px solid #f1f5f9;">
            <p style="margin: 0 0 10px 0; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Issue Statement</p>
            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #334155;">${user.description}</p>
          </div>

          ${attachmentsHtml}

          <div style="margin-top: 40px; text-align: center;">
            <a href="${process.env.APP_URL || 'https://notifynow.in'}/admin/support/tickets/${user.ticket_id}" 
               style="background: #0f172a; color: #ffffff; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; transition: background 0.3s;">
               Take Action in Dashboard
            </a>
          </div>
        </div>

        <div style="background: #f1f5f9; padding: 25px 30px; border-top: 1px solid #e2e8f0; text-align: left;">
          <p style="margin: 0; font-size: 13px; font-weight: bold; color: #0f172a;">Best Regards,</p>
          <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: 800; color: #4f46e5;">Support Notify Team</p>
          <p style="margin: 2px 0 0 0; font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Technical Support Specialist</p>
          <div style="margin-top: 15px; border-top: 1px dotted #cbd5e1; pt: 10px;">
            <p style="margin: 0; font-size: 10px; color: #94a3b8;">© ${new Date().getFullYear()} NotifyNow. Comprehensive Engagement Platform.</p>
          </div>
        </div>
      </div>
    `;

    // 🚀 WhatsApp Admin Notification
    try {
        const { sendAdminWhatsAppNotification } = require('./whatsappUtils');
        sendAdminWhatsAppNotification(`🔔 *${isEdit ? 'Ticket Modified' : 'New Ticket'}!* \n\n*ID:* #${user.ticket_id} \n*User:* ${user.name} \n*Subject:* ${user.subject} \n\nPlease visit the dashboard to respond.`, user.ticket_id);
    } catch(e) {}
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
