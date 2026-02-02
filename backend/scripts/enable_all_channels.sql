-- Enable all channels for current user (ID 24)
UPDATE users 
SET channels_enabled = '["whatsapp","sms","email","rcs"]' 
WHERE id = 24;

-- Verify the update
SELECT id, email, channels_enabled FROM users WHERE id = 24;
