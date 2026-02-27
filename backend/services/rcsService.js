const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();

// Token caching Map: configId -> { token, expiresAt }
// Keys: 'default', 'admin', or configId
const tokenCache = new Map();

/**
 * Get Dotgo RCS Access Token
 * @param {object} config - Configuration object containing client_id, client_secret, auth_url, and an optional id for caching.
 * @returns {Promise<string|null>} - Access token
 */
const getRcsToken = async (config) => {
  if (!config) {
    console.error("❌ Dotgo Token Error: No configuration provided");
    return null;
  }

  try {
    const clientId = config.client_id?.trim();
    const clientSecret = config.client_secret?.trim();
    const authUrl = config.auth_url?.trim();
    const cacheKey = config.id || config.bot_id;

    const cached = tokenCache.get(cacheKey);
    if (cached && cached.token && cached.expiresAt && Date.now() < cached.expiresAt) {
      return cached.token;
    }

    console.log(`🔑 Fetching Dotgo RCS token for [${config.name || cacheKey}]...`);
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await axios.post(
      authUrl,
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

    const expiresIn = response.data.expires_in || 3600;
    tokenCache.set(cacheKey, {
      token: token,
      expiresAt: Date.now() + (expiresIn * 1000) - 300000 // 5 mins buffer
    });

    console.log(`✅ Dotgo Token obtained successfully for [${config.name || cacheKey}]`);
    return token;
  } catch (error) {
    console.error("❌ Dotgo Token Error:", error.message);
    if (error.response) {
      console.error("📦 Response Data:", JSON.stringify(error.response.data));
    }
    return null;
  }
};

/**
 * Get Dotgo Admin Token for template management
 */
const getDotgoAdminToken = async () => {
  const adminConfig = {
    id: 'admin',
    name: 'Main Admin',
    client_id: (process.env.DOTGO_ADMIN_CLIENT_ID || '').trim(),
    client_secret: (process.env.DOTGO_ADMIN_CLIENT_SECRET || '').trim(),
    auth_url: (process.env.DOTGO_ADMIN_AUTH_URL || '').trim()
  };
  return getRcsToken(adminConfig);
};

/**
 * Send RCS Template Message using Dotgo
 * @param {string} mobile - Recipient phone number
 * @param {string} templateName - Dotgo templateCode
 * @param {object} [config] - Optional configuration override
 * @returns {Promise<object>}
 */
const sendRcsTemplate = async (mobile, templateName, config) => {
  if (!config) return { success: false, error: "No RCS configuration assigned to this user" };

  try {
    const token = await getRcsToken(config);
    if (!token) return { success: false, error: "Authentication failed" };

    const { api_base_url: apiBaseUrl, bot_id: botId } = config;

    // Ensure mobile has + prefix for Dotgo
    const formattedMobile = mobile.startsWith('+') ? mobile : `+${mobile}`;

    // Use hardcoded template as per user request if not provided or for testing
    const templateCode = templateName || "Empowering_business";

    const url = `${apiBaseUrl}/phones/${formattedMobile}/agentMessages?botId=${botId}`;

    const payload = {
      contentMessage: {
        templateMessage: {
          templateCode: templateCode
        }
      }
    };

    console.log(`📤 Sending Dotgo RCS (Config: ${config?.name || 'Default'}) to ${formattedMobile} (Template: ${templateCode})`);

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📥 Dotgo Response [${response.status}]:`, JSON.stringify(response.data));

    if (response.status === 200 || response.status === 201) {
      const messageId = response.data?.messageId || response.data?.messageID || response.data?.id || response.data?.msgId || "N/A";
      return { success: true, messageId: messageId, raw: response.data };
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
 * @param {object} [config]
 * @returns {Promise<object>}
 */
const sendRcsMessage = async (mobile, message, config) => {
  if (!config) return { success: false, error: "No RCS configuration assigned to this user" };

  try {
    const token = await getRcsToken(config);
    if (!token) return { success: false, error: "Authentication failed" };

    const { api_base_url: apiBaseUrl, bot_id: botId } = config;

    const formattedMobile = mobile.startsWith('+') ? mobile : `+${mobile}`;
    const url = `${apiBaseUrl}/phones/${formattedMobile}/agentMessages?botId=${botId}`;

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
      const messageId = response.data?.messageId || response.data?.messageID || response.data?.id || response.data?.msgId || "N/A";
      return { success: true, messageId: messageId };
    }

    return { success: false, error: `API status ${response.status}` };
  } catch (error) {
    console.error("❌ Dotgo Text Send Error:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Submit a new template to Dotgo using ADMIN credentials
 * @param {string} botId 
 * @param {object} templateData 
 * @returns {Promise<object>}
 */
const submitDotgoTemplate = async (config, templateData) => {
  try {
    const token = await getDotgoAdminToken();
    if (!token) return { success: false, error: "Platform Admin Authentication failed" };

    const botId = config.bot_id;
    const baseUrl = process.env.DOTGO_ADMIN_TEMPLATE_URL || `https://developer-api.dotgo.com/directory/secure/api/v1/bots`;
    const url = `${baseUrl}/${botId}/templates`;

    console.log(`📤 Submitting Dotgo Template (Admin Token) for Bot: ${botId}, Template: ${templateData.name}`);

    // Refine payload structure based on Dotgo Documentation
    const refinedData = {
      name: templateData.name,
      type: templateData.type,
      fallbackText: templateData.fallbackText || "RCS Message"
    };

    if (templateData.type === 'text_message') {
      refinedData.textMessageContent = templateData.textMessageContent;
      refinedData.suggestions = templateData.suggestions;
    } else if (templateData.type === 'rich_card') {
      refinedData.orientation = templateData.orientation || 'VERTICAL';
      refinedData.height = templateData.height || 'SHORT_HEIGHT';
      refinedData.standAlone = templateData.richCardContent?.standaloneCard?.cardContent || templateData.standAlone;
      // Map frontend cardTitle/cardDescription if they exist directly
      if (templateData.cardTitle) refinedData.standAlone.cardTitle = templateData.cardTitle;
      if (templateData.cardDescription) refinedData.standAlone.cardDescription = templateData.cardDescription;
    } else if (templateData.type === 'carousel') {
      refinedData.height = templateData.height || 'SHORT_HEIGHT';
      refinedData.width = templateData.width || 'MEDIUM_WIDTH';
      refinedData.carouselList = templateData.carouselContent?.carouselCards?.map(c => c.cardContent) || templateData.carouselList;
    }

    // Use FormData with rich_template_data field
    const FormData = require('form-data');
    const form = new FormData();
    form.append('rich_template_data', JSON.stringify(refinedData));

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
 * Get Dotgo Template Status using ADMIN credentials
 */
const getDotgoTemplateStatus = async (config, templateName) => {
  try {
    const token = await getDotgoAdminToken();
    if (!token) return { success: false, error: "Platform Admin Authentication failed" };

    const botId = config.bot_id;
    const baseUrl = process.env.DOTGO_ADMIN_TEMPLATE_URL || `https://developer-api.dotgo.com/directory/secure/api/v1/bots`;
    const base64Name = Buffer.from(templateName).toString('base64');
    const url = `${baseUrl}/${botId}/templates/${base64Name}/templateStatus`;

    console.log(`🔍 Checking Dotgo Status (Admin Token) for Bot: ${botId}, Template: ${templateName}`);

    const response = await axios.get(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    return { success: true, status: response.data?.status || 'UNKNOWN', raw: response.data };
  } catch (error) {
    console.error("❌ Dotgo Status Check Error:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Get Dotgo Template Details using ADMIN credentials
 */
const getDotgoTemplateDetails = async (config, templateName) => {
  try {
    const token = await getDotgoAdminToken();
    if (!token) return { success: false, error: "Platform Admin Authentication failed" };

    const botId = config.bot_id;
    const baseUrl = process.env.DOTGO_ADMIN_TEMPLATE_URL || `https://developer-api.dotgo.com/directory/secure/api/v1/bots`;
    const base64Name = Buffer.from(templateName).toString('base64');
    const url = `${baseUrl}/${botId}/templates/${base64Name}`;

    console.log(`🔍 Fetching Dotgo Details (Admin Token) for Bot: ${botId}, Template: ${templateName}`);

    const response = await axios.get(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    return { success: true, data: response.data };
  } catch (error) {
    console.error("❌ Dotgo Details Fetch Error:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Delete a template from Dotgo using ADMIN credentials
 */
const deleteDotgoTemplate = async (config, templateName) => {
  try {
    const token = await getDotgoAdminToken();
    if (!token) return { success: false, error: "Platform Admin Authentication failed" };

    const botId = config.bot_id;
    const baseUrl = process.env.DOTGO_ADMIN_TEMPLATE_URL || `https://developer-api.dotgo.com/directory/secure/api/v1/bots`;
    // Endpoint: {serverRoot}/directory/secure/api/v1/bots/{botId}/deleteTemplate/{name}
    const url = `${baseUrl}/${botId}/deleteTemplate/${templateName}`;

    console.log(`🗑️ Deleting Dotgo Template (Admin Token) for Bot: ${botId}, Template: ${templateName}`);

    const response = await axios.delete(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    return { success: true, data: response.data };
  } catch (error) {
    console.error("❌ Dotgo Template Deletion Error:", error.message);
    if (error.response) {
      console.error("📦 Error Response:", JSON.stringify(error.response.data));
      const dotgoError = error.response.data?.error?.message || error.response.data?.message || JSON.stringify(error.response.data);
      return { success: false, error: dotgoError };
    }
    return { success: false, error: error.message };
  }
};

/**
 * Get live external templates from Dotgo using ADMIN credentials
 * @param {string} botId
 */
const getExternalTemplates = async (config) => {
  if (!config || !config.bot_id) return [];

  try {
    const token = await getDotgoAdminToken();
    if (!token) {
      console.error("❌ Dotgo Admin Token failure for template listing");
      return [];
    }

    const botId = config.bot_id;
    const baseUrl = process.env.DOTGO_ADMIN_TEMPLATE_URL || `https://developer-api.dotgo.com/directory/secure/api/v1/bots`;
    const url = `${baseUrl}/${botId}/templates`;

    console.log(`📡 Fetching LIVE Dotgo Templates for Bot: ${botId} (Admin Token)`);

    const response = await axios.get(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log(`📥 Dotgo Template List Response [${response.status}]:`, JSON.stringify(response.data));

    // Match the JSON structure provided by the user: { "templateList": [...] }
    const templateList = response.data?.templateList || [];

    return templateList.map(t => ({
      id: t.name,
      name: t.name,
      status: t.status, // approved, created, etc.
      type: t.templateType,
      lastUpdate: t.lastUpdate
    }));

  } catch (error) {
    console.error("❌ Fetch External Templates Error:", error.message);
    return [];
  }
};

module.exports = {
  getRcsToken,
  sendRcsTemplate,
  sendRcsMessage,
  getExternalTemplates,
  submitDotgoTemplate,
  getDotgoTemplateStatus,
  getDotgoTemplateDetails,
  deleteDotgoTemplate
};

