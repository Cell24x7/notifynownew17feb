const { query } = require('../config/db');

/**
 * Log a system event
 * @param {string} type - 'login', 'api', 'credit', 'admin_action', 'error'
 * @param {string} action - Short description of action
 * @param {string} details - Detailed info
 * @param {number|null} userId - ID of user performing action (optional)
 * @param {string|null} userName - Name of user (optional)
 * @param {string|null} clientName - Client/Company name (optional)
 * @param {string|null} ipAddress - IP Address (optional)
 * @param {string} severity - 'info', 'warning', 'error'
 * @param {string|null} deviceInfo - Device/UA info (optional)
 * @param {string|null} location - Geo location (optional)
 */
const logSystem = async (type, action, details, userId = null, userName = null, clientName = null, ipAddress = null, severity = 'info', deviceInfo = null, location = null) => {
    try {
        const queryStr = `
      INSERT INTO system_logs 
      (type, action, details, user_id, user_name, client_name, ip_address, severity, device_info, location) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
        const result = await query(queryStr, [type, action, details, userId, userName, clientName, ipAddress, severity, deviceInfo, location]);
        console.log(`✅ System Log Written: [${type}] ${action} (User: ${userName || 'System'})`);
    } catch (err) {
        console.error('❌ Failed to write system log:', err.message);
        console.error('Log Data:', { type, action, userId, userName });
    }
};

module.exports = { logSystem };
