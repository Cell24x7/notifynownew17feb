const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();

const DOTGO_AUTH_URL = process.env.DOTGO_AUTH_URL;
const DOTGO_API_BASE_URL = process.env.DOTGO_API_BASE_URL;
const DOTGO_CLIENT_ID = process.env.DOTGO_CLIENT_ID;
const DOTGO_CLIENT_SECRET = process.env.DOTGO_CLIENT_SECRET;
const DOTGO_BOT_ID = process.env.DOTGO_BOT_ID;

let dotgoAccessToken = null;
let tokenExpiresAt = null;

/**
 * Get Dotgo RCS Access Token
 * @returns {Promise<string|null>} - Access token
 */
const getRcsToken = async () => {
  try {
    if (dotgoAccessToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
      return dotgoAccessToken;
    }

    console.log("🔑 Fetching Dotgo RCS token...");
    const auth = Buffer.from(`${DOTGO_CLIENT_ID}:${DOTGO_CLIENT_SECRET}`).toString('base64');

    const response = await axios.post(
      DOTGO_AUTH_URL,
      "grant_type=client_credentials",
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const token = response.data?.access_token;

    if (!token) {
      console.error("❌ Dotgo Token Error: token not found in response", response.data);
      return null;
    }

    dotgoAccessToken = token;
    const expiresIn = response.data.expires_in || 3600;
    tokenExpiresAt = Date.now() + (expiresIn * 1000) - 300000; // 5 mins buffer

    console.log("✅ Dotgo Token obtained successfully");
    return dotgoAccessToken;
  } catch (error) {
    console.error("❌ Dotgo Token Error:", error.message);
    if (error.response) {
      console.error("📦 Response Data:", JSON.stringify(error.response.data));
    }
    return null;
  }
};

/**
 * Send RCS Template Message using Dotgo
 * @param {string} mobile - Recipient phone number (e.g. +91XXXXXXXXXX)
 * @param {string} templateName - Dotgo templateCode
 * @returns {Promise<object>}
 */
const sendRcsTemplate = async (mobile, templateName) => {
  try {
    const token = await getRcsToken();
    if (!token) return { success: false, error: "Authentication failed" };

    // Ensure mobile has + prefix for Dotgo
    const formattedMobile = mobile.startsWith('+') ? mobile : `+${mobile}`;

    // Use hardcoded template as per user request if not provided or for testing
    const templateCode = templateName || "Empowering_business";

    const url = `${DOTGO_API_BASE_URL}/phones/${formattedMobile}/agentMessages?botId=${DOTGO_BOT_ID}`;

    const payload = {
      contentMessage: {
        templateMessage: {
          templateCode: templateCode
        }
      }
    };

    console.log(`📤 Sending Dotgo RCS to ${formattedMobile} (Template: ${templateCode})`);

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📥 Dotgo Response [${response.status}]:`, JSON.stringify(response.data));

    // Dotgo usually returns a messageId in response
    if (response.status === 200 || response.status === 201) {
      // Check for multiple possible ID fields
      const messageId = response.data?.messageId ||
        response.data?.messageID ||
        response.data?.id ||
        response.data?.msgId ||
        "N/A";

      if (messageId === "N/A") {
        console.warn("⚠️ Dotgo response missing ID field:", JSON.stringify(response.data));
      }

      return {
        success: true,
        messageId: messageId,
        raw: response.data
      };
    }

    return { success: false, error: `API returned status ${response.status}`, raw: response.data };
  } catch (error) {
    console.error("❌ Dotgo Send Error:", error.message);
    if (error.response) {
      console.error("📦 Error Response:", JSON.stringify(error.response.data));
      return { success: false, error: error.response.data?.message || JSON.stringify(error.response.data) };
    }
    return { success: false, error: error.message };
  }
};

/**
 * Send Plain Text RCS Message using Dotgo
 * @param {string} mobile 
 * @param {string} message 
 * @returns {Promise<object>}
 */
const sendRcsMessage = async (mobile, message) => {
  try {
    const token = await getRcsToken();
    if (!token) return { success: false, error: "Authentication failed" };

    const formattedMobile = mobile.startsWith('+') ? mobile : `+${mobile}`;
    const url = `${DOTGO_API_BASE_URL}/phones/${formattedMobile}/agentMessages?botId=${DOTGO_BOT_ID}`;

    const payload = {
      contentMessage: {
        text: message
      }
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📥 Dotgo Text Response [${response.status}]:`, JSON.stringify(response.data));

    if (response.status === 200 || response.status === 201) {
      const messageId = response.data?.messageId ||
        response.data?.messageID ||
        response.data?.id ||
        response.data?.msgId ||
        "N/A";
      return { success: true, messageId: messageId };
    }

    return { success: false, error: `API status ${response.status}` };
  } catch (error) {
    console.error("❌ Dotgo Text Send Error:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Submit a new template to Dotgo
 * @param {object} templateData - Template configuration
 * @returns {Promise<object>}
 */
const submitDotgoTemplate = async (templateData) => {
  try {
    const token = await getRcsToken();
    if (!token) return { success: false, error: "Authentication failed" };

    const url = `https://developer-api.dotgo.com/directory/secure/api/v1/bots/${DOTGO_BOT_ID}/templates`;

    const form = new FormData();
    form.append('rich_template_data', JSON.stringify(templateData));

    console.log(`📤 Submitting Dotgo Template: ${templateData.name}`);

    const response = await axios.post(url, form, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      }
    });

    return { success: true, data: response.data };
  } catch (error) {
    console.error("❌ Dotgo Template Submission Error:", error.message);
    if (error.response) {
      console.error("📦 Error Response:", JSON.stringify(error.response.data));
      return { success: false, error: error.response.data?.message || JSON.stringify(error.response.data) };
    }
    return { success: false, error: error.message };
  }
};

/**
 * Get Dotgo Template Status
 * @param {string} templateName - Name of the template
 * @returns {Promise<object>}
 */
const getDotgoTemplateStatus = async (templateName) => {
  try {
    const token = await getRcsToken();
    if (!token) return { success: false, error: "Authentication failed" };

    // Base64 encode the template name
    const base64Name = Buffer.from(templateName).toString('base64');
    const url = `https://developer-api.dotgo.com/directory/secure/api/v1/bots/${DOTGO_BOT_ID}/templates/${base64Name}/templateStatus`;

    console.log(`🔍 Checking Dotgo Status for: ${templateName} (${base64Name})`);

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return { success: true, status: response.data?.status || 'UNKNOWN', raw: response.data };
  } catch (error) {
    console.error("❌ Dotgo Status Check Error:", error.message);
    if (error.response) {
      return { success: false, error: error.response.data?.message || JSON.stringify(error.response.data) };
    }
    return { success: false, error: error.message };
  }
};

/**
 * Dotgo doesn't seem to have a simple "get all templates" API mentioned in the snippets,
 * but for compatibility with existing UI, we return the hardcoded one the user asked for.
 */
const getExternalTemplates = async () => {
  return [
    { name: "Empowering_business", id: "Empowering_business", body: "Hardcoded Dotgo Template" }
  ];
};

module.exports = {
  getRcsToken,
  sendRcsTemplate,
  sendRcsMessage,
  getExternalTemplates,
  submitDotgoTemplate,
  getDotgoTemplateStatus
};

