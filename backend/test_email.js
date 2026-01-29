require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER, // Send to self
    subject: 'Test Email from Cell24x7',
    text: 'If you see this, your email configuration is working perfectly!'
};

console.log('Attempting to send test email...');
console.log('User:', process.env.EMAIL_USER);
// console.log('Pass:', process.env.EMAIL_PASS); // Security: Don't log password

transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
        console.log('❌ Error:', error);
    } else {
        console.log('✅ Email sent: ' + info.response);
    }
});
