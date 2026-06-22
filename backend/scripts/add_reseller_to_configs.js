const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env' + (process.env.NODE_ENV === 'production' ? '.production' : '')) });
const { query } = require('../config/db');

const migrate = async () => {
    try {
        console.log('🚀 Starting Reseller Configuration Migration...');

        // 1. Add reseller_id to whatsapp_configs
        const [waCols] = await query("SHOW COLUMNS FROM whatsapp_configs");
        if (!waCols.some(c => c.Field === 'reseller_id')) {
            console.log('➕ Adding "reseller_id" to "whatsapp_configs"...');
            await query('ALTER TABLE whatsapp_configs ADD COLUMN reseller_id INT NULL DEFAULT NULL');
            await query('ALTER TABLE whatsapp_configs ADD CONSTRAINT fk_wa_reseller FOREIGN KEY (reseller_id) REFERENCES users(id) ON DELETE SET NULL');
        } else {
            console.log('ℹ️ "reseller_id" already exists in whatsapp_configs.');
        }

        // 2. Add reseller_id to rcs_configs
        try {
            const [rcsCols] = await query("SHOW COLUMNS FROM rcs_configs");
            if (!rcsCols.some(c => c.Field === 'reseller_id')) {
                console.log('➕ Adding "reseller_id" to "rcs_configs"...');
                await query('ALTER TABLE rcs_configs ADD COLUMN reseller_id INT NULL DEFAULT NULL');
                await query('ALTER TABLE rcs_configs ADD CONSTRAINT fk_rcs_reseller FOREIGN KEY (reseller_id) REFERENCES users(id) ON DELETE SET NULL');
            } else {
                console.log('ℹ️ "reseller_id" already exists in rcs_configs.');
            }
        } catch (e) {
            console.log('ℹ️ rcs_configs table might not exist yet, skipping.');
        }

        // 3. Add reseller_id to sms_gateways
        try {
            const [smsCols] = await query("SHOW COLUMNS FROM sms_gateways");
            if (!smsCols.some(c => c.Field === 'reseller_id')) {
                console.log('➕ Adding "reseller_id" to "sms_gateways"...');
                await query('ALTER TABLE sms_gateways ADD COLUMN reseller_id INT NULL DEFAULT NULL');
                await query('ALTER TABLE sms_gateways ADD CONSTRAINT fk_sms_reseller FOREIGN KEY (reseller_id) REFERENCES users(id) ON DELETE SET NULL');
            } else {
                console.log('ℹ️ "reseller_id" already exists in sms_gateways.');
            }
        } catch (e) {
            console.log('ℹ️ sms_gateways table might not exist yet, skipping.');
        }

        console.log('✨ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
};

migrate();
