-- First, enable channels for user ID 24
UPDATE users 
SET channels_enabled = '["whatsapp","sms","email","rcs"]' 
WHERE id = 24;

-- Create some test templates for testing approval workflow
INSERT INTO message_templates (
    user_id, name, language, category, channel, template_type,
    header_type, header_content, body, footer, status, created_at, updated_at
) VALUES
-- Template 1: Pending WhatsApp template
(24, 'booking_confirmation', 'en', 'Marketing', 'whatsapp', 'standard',
 'text', 'Booking Confirmed!', 
 'Hello {{1}},\n\nYour booking for {{2}} has been confirmed.\n\nBooking ID: {{3}}\nDate: {{4}}\n\nThank you for choosing us!',
 'Reply HELP for assistance',
 'pending', NOW(), NOW()),

-- Template 2: Pending SMS template
(24, 'otp_verification', 'en', 'Authentication', 'sms', 'standard',
 'none', NULL,
 'Your OTP is {{1}}. Valid for 10 minutes. Do not share with anyone.',
 NULL,
 'pending', NOW(), NOW()),

-- Template 3: Pending Email template
(24, 'welcome_email', 'en', 'Marketing', 'email', 'standard',
 'text', 'Welcome to Cell24x7!',
 'Dear {{1}},\n\nWelcome to Cell24x7! We are excited to have you on board.\n\nYour account has been successfully created.\n\nBest regards,\nCell24x7 Team',
 'Need help? Contact support@cell24x7.com',
 'pending', NOW(), NOW()),

-- Template 4: Already approved template
(24, 'order_shipped', 'en', 'Utility', 'whatsapp', 'standard',
 'text', 'Order Shipped',
 'Hi {{1}},\n\nYour order #{{2}} has been shipped!\n\nTracking ID: {{3}}\n\nExpected delivery: {{4}}',
 'Track your order anytime',
 'approved', NOW(), NOW());

-- Add some buttons to the booking confirmation template
INSERT INTO template_buttons (template_id, type, label, value, position)
SELECT id, 'url', 'View Booking', 'https://example.com/booking/{{3}}', 1
FROM message_templates WHERE name = 'booking_confirmation' LIMIT 1;

INSERT INTO template_buttons (template_id, type, label, value, position)
SELECT id, 'phone', 'Call Support', '+911234567890', 2
FROM message_templates WHERE name = 'booking_confirmation' LIMIT 1;

-- Verify the data
SELECT 
    mt.id,
    mt.name,
    mt.channel,
    mt.status,
    u.email as user_email,
    COUNT(tb.id) as button_count
FROM message_templates mt
LEFT JOIN users u ON mt.user_id = u.id
LEFT JOIN template_buttons tb ON mt.id = tb.template_id
GROUP BY mt.id
ORDER BY mt.created_at DESC;
