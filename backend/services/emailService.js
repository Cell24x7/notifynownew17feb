const nodemailer = require('nodemailer');
const { query } = require('../config/db');

/**
 * Sends an email using SMTP configuration
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email body (HTML)
 * @param {object} config - SMTP configuration (host, port, user, pass, from_name, from_email)
 */
const sendEmail = async (to, subject, html, config) => {
    if (!config || !config.host) {
        throw new Error('Invalid SMTP configuration');
    }

    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port || 587,
        secure: config.port === 465, // true for 465, false for other ports
        auth: {
            user: config.user,
            pass: config.pass
        }
    });

    const mailOptions = {
        from: `"${config.from_name || 'NotifyNow'}" <${config.from_email || config.user}>`,
        to,
        subject,
        html,
        text: html.replace(/<[^>]*>?/gm, '') // Simple fallback text
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('[EmailService] Send Error:', error);
        throw error;
    }
};

module.exports = {
    sendEmail
};
