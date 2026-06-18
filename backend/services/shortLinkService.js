const db = require('../config/db');
const crypto = require('crypto');

// Standalone function to avoid 'this' context issues
function generateShortCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}

class ShortLinkService {

  /**
   * Replaces all URLs in a message with short links
   */
  async processMessage(message, campaignId, userId, msisdn) {
    if (!message) return message;
    
    // Regex to match URLs (http, https, or www)
    const urlRegex = /(?:(?:https?:\/\/)|(?:www\.))[^\s]+(?:[\w\/]|\?(?:[^\s]*)[^\s.])/gi;
    
    let modifiedMessage = message;
    let match;
    const urlsToReplace = [];

    while ((match = urlRegex.exec(message)) !== null) {
      urlsToReplace.push({
        url: match[0],
        index: match.index,
        length: match[0].length
      });
    }

    // Replace from end to start to avoid index shifting issues
    for (let i = urlsToReplace.length - 1; i >= 0; i--) {
      let originalUrl = urlsToReplace[i].url;
      // Ensure URL has http/https
      let longUrl = originalUrl;
      if (!longUrl.startsWith('http')) {
        longUrl = 'http://' + longUrl;
      }

      // Generate short code using standalone function
      let shortCode = generateShortCode(8); // Generates 8 char code
      let isUnique = false;
      while (!isUnique) {
        const [rows] = await db.query('SELECT id FROM short_links WHERE short_code = ?', [shortCode]);
        if (rows.length === 0) {
          isUnique = true;
        } else {
          shortCode = generateShortCode(8);
        }
      }

      // Insert into DB
      await db.query(
        `INSERT INTO short_links (short_code, long_url, campaign_id, user_id, msisdn) 
         VALUES (?, ?, ?, ?, ?)`,
        [shortCode, longUrl, campaignId, userId, msisdn]
      );

      // Create the final short URL
      // Use the whitelisted domain the user requested: cmtpl.in
      const shortUrl = `cmtpl.in/${shortCode}`;

      // Replace in message
      modifiedMessage = 
        modifiedMessage.substring(0, urlsToReplace[i].index) + 
        shortUrl + 
        modifiedMessage.substring(urlsToReplace[i].index + urlsToReplace[i].length);
    }

    return modifiedMessage;
  }

  /**
   * Handle redirect and click tracking
   */
  async handleRedirect(shortCode, reqInfo) {
    const [rows] = await db.query('SELECT id, long_url FROM short_links WHERE short_code = ?', [shortCode]);
    
    if (rows.length === 0) {
      return null;
    }

    const link = rows[0];

    // Increment clicks
    await db.query('UPDATE short_links SET clicks = clicks + 1 WHERE id = ?', [link.id]);

    // Log the click details
    try {
      await db.query(
        `INSERT INTO short_link_clicks (short_link_id, ip_address, user_agent) VALUES (?, ?, ?)`,
        [link.id, reqInfo.ip, reqInfo.userAgent]
      );
    } catch (e) {
      console.error('Error logging short link click:', e);
    }

    return link.long_url;
  }
}

module.exports = new ShortLinkService();
