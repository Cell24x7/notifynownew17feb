const useragent = require('useragent');

/**
 * Parse User-Agent string to a friendly device name
 */
function getDeviceFriendlyName(uaString) {
    if (!uaString || uaString === 'undefined') return 'Web Browser (Unknown)';
    
    // Some basic manual checks for common short/bot UAs if needed
    if (uaString.includes('Postman')) return 'Postman / API Tool';
    if (uaString.includes('axios')) return 'Server-to-Server (Axios)';

    const agent = useragent.parse(uaString);
    const os = agent.os.toString();
    const device = agent.device.toString();
    const browser = agent.toAgent();
    
    let name = browser;
    if (os && os !== 'Other') name += ` on ${os}`;
    if (device && device !== 'Other 0.0.0' && device !== 'Other') name += ` (${device})`;
    
    return name;
}

const axios = require('axios');

/**
 * Clean up IP address (convert IPv6 loopback to IPv4)
 */
function formatIP(ip) {
    if (!ip) return '0.0.0.0';
    if (ip === '::1') return '127.0.0.1 (Localhost)';
    // Remove IPv6 prefix if present (e.g. ::ffff:127.0.0.1)
    const cleanIp = ip.replace(/^.*:/, '');
    return cleanIp === '1' ? '127.0.0.1 (Localhost)' : cleanIp;
}

/**
 * Get location from IP address
 */
async function getLocation(ip) {
    const cleanIp = formatIP(ip);
    if (cleanIp.startsWith('127.0.0') || cleanIp.startsWith('192.168') || cleanIp.startsWith('10.')) {
        return 'Local Network (Development)';
    }

    try {
        // Use a free API (ip-api.com is free for non-commercial/low rate)
        const response = await axios.get(`http://ip-api.com/json/${cleanIp}?fields=status,message,country,city,isp`);
        if (response.data.status === 'success') {
            return `${response.data.city}, ${response.data.country}`;
        }
        return 'Location Unknown';
    } catch (err) {
        return 'Location Unavailable';
    }
}

module.exports = { getDeviceFriendlyName, formatIP, getLocation };
