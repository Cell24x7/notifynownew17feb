const { query } = require('../config/db');

/**
 * Ensures the 'users' table has the necessary columns for WhatsApp per-category pricing.
 */
async function ensureWhatsAppPricingColumns() {
    try {
        // console.log('🔍 [PricingService] Checking users table for WhatsApp pricing columns...');
        const [columns] = await query('DESCRIBE users');
        const columnNames = columns.map(c => c.Field);

        const columnsToAdd = [
            { name: 'wa_marketing_price', type: 'DECIMAL(10,2)', default: '1.00', after: 'rcs_carousel_price' },
            { name: 'wa_utility_price', type: 'DECIMAL(10,2)', default: '1.00', after: 'wa_marketing_price' },
            { name: 'wa_authentication_price', type: 'DECIMAL(10,2)', default: '1.00', after: 'wa_utility_price' },
            { name: 'sms_promotional_price', type: 'DECIMAL(10,2)', default: '1.00', after: 'wa_authentication_price' },
            { name: 'sms_transactional_price', type: 'DECIMAL(10,2)', default: '1.00', after: 'sms_promotional_price' },
            { name: 'sms_service_price', type: 'DECIMAL(10,2)', default: '1.00', after: 'sms_transactional_price' }
        ];

        for (const col of columnsToAdd) {
            const colExists = columnNames.some(name => name.toLowerCase() === col.name.toLowerCase());
            if (!colExists) {
                // console.log(`➕ [PricingService] Adding column ${col.name}...`);
                await query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type} DEFAULT ${col.default} AFTER ${col.after}`);
            }
        }

        // console.log('✅ [PricingService] WhatsApp pricing columns ready');
    } catch (err) {
        console.error('❌ [PricingService] Failed to ensure WhatsApp pricing columns:', err.message);
    }
}

module.exports = { ensureWhatsAppPricingColumns };
