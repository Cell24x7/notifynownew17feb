const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();

// Token caching Map: configId -> { token, expiresAt }
// Keys: 'default', 'admin', or configId
const tokenCache = new Map();

// Template caching Map: botId -> { data, expiresAt }
const templateCache = new Map();
const TEMPLATE_CACHE_TTL = 300000; // 5 minutes

// Single-flight Map to prevent multiple simultaneous auth calls for same config
const tokenFetchingPromises = new Map();

/**
 * Base64URL Encode a string
 */
const base64UrlEncode = (str) => {
  if (!str) return '';
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_'); // Keeping padding (the ==)
};

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

    // Single-flight check: if already fetching, wait for that promise
    if (tokenFetchingPromises.has(cacheKey)) {
      console.log(`⏳ Waiting for existing token fetch for [${config.name || cacheKey}]...`);
      return tokenFetchingPromises.get(cacheKey);
    }

    // Create a new fetch promise
    const fetchPromise = (async () => {
      try {
        console.log(`🔑 Fetching Dotgo RCS token for [${config.name || cacheKey}]...`);
        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        const response = await axios.post(
          authUrl,
          "grant_type=client_credentials",
          {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: 10000 // 10 seconds timeout
          }
        );

        const token = response.data?.access_token;
        if (!token) {
          console.error("❌ Dotgo Token Error: token not found in response", response.data);
          tokenFetchingPromises.delete(cacheKey);
          return null;
        }

        const expiresIn = response.data.expires_in || 3600;
        tokenCache.set(cacheKey, {
          token: token,
          expiresAt: Date.now() + (expiresIn * 1000) - 300000 // 5 mins buffer
        });

        console.log(`✅ Dotgo Token obtained successfully for [${config.name || cacheKey}]`);
        tokenFetchingPromises.delete(cacheKey);
        return token;
      } catch (error) {
        console.error("❌ Dotgo Token Error:", error.message);
        tokenFetchingPromises.delete(cacheKey);
        return null;
      }
    })();

    tokenFetchingPromises.set(cacheKey, fetchPromise);
    return fetchPromise;
  } catch (error) {
    console.error("❌ Dotgo Token Error (Outer):", error.message);
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
const sendRcsTemplate = async (mobile, templateName, config, customParams = []) => {
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
          templateCode: templateCode,
          customParams: (Array.isArray(customParams) && customParams.length > 0) ? customParams : undefined
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
 * @param {object} config 
 * @param {object} templateData 
 * @param {Array} [files] - Array of uploaded files from multer
 * @param {string} [existingName] - If provided, performs an UPDATE instead of CREATE
 * @returns {Promise<object>}
 */
const submitDotgoTemplate = async (config, templateData, files = [], existingName = null) => {
  try {
    const token = await getDotgoAdminToken();
    if (!token) return { success: false, error: "Platform Admin Authentication failed" };

    const botId = config.bot_id;
    const baseUrl = process.env.DOTGO_ADMIN_TEMPLATE_URL || `https://developer-api.dotgo.com/directory/secure/api/v1/bots`;

    // Pattern: {serverRoot}/directory/secure/api/v1/bots/{botId}/templates[/{name}]
    let url = `${baseUrl}/${botId}/templates`;
    if (existingName || templateData.isUpdate) {
      const targetName = existingName || templateData.name;
      const base64Name = base64UrlEncode(targetName);
      url = `${url}/${base64Name}`;
      console.log(`🔄 Updating Dotgo Template: ${targetName} (B64URL: ${base64Name})`);
    } else {
      console.log(`📤 Creating Dotgo Template for Bot: ${botId}, Template: ${templateData.name}`);
    }

    // Refine payload structure based on Dotgo Documentation and frontend field names
    const refinedData = {
      name: templateData.name,
      type: templateData.type || templateData.template_type || 'text_message',
      fallbackText: templateData.fallbackText || templateData.body?.substring(0, 100) || "RCS Message"
    };

    // Strict type check to prevent Dotgo "Invalid Template Type" error
    const validTypes = ['text_message', 'rich_card', 'carousel'];
    if (!validTypes.includes(refinedData.type)) {
      refinedData.type = 'text_message'; // Default to text if invalid
    }

    // Helper to map suggestions correctly according to provided curl examples
    const mapSuggestions = (btns) => {
      if (!btns || !Array.isArray(btns)) return [];
      return btns.map(btn => {
        const suggestion = {
          suggestionType: btn.suggestionType || (btn.type === 'url' || btn.type === 'url_action' ? 'url_action' : btn.type === 'phone' || btn.type === 'dialer_action' ? 'dialer_action' : 'reply'),
          displayText: btn.displayText || btn.label || "Click here",
          postback: btn.postback || btn.value || "postback"
        };

        if (suggestion.suggestionType === 'url_action') {
          suggestion.url = btn.url || btn.value || btn.uri;
        } else if (suggestion.suggestionType === 'dialer_action') {
          suggestion.phoneNumber = btn.phoneNumber || btn.value || btn.uri;
        }

        return suggestion;
      });
    };

    if (refinedData.type === 'text_message') {
      refinedData.textMessageContent = templateData.body || templateData.textMessageContent;
      refinedData.suggestions = mapSuggestions(templateData.buttons || templateData.suggestions);
    } else if (refinedData.type === 'rich_card') {
      refinedData.orientation = templateData.orientation || templateData.metadata?.orientation || 'VERTICAL';
      refinedData.height = templateData.height || templateData.metadata?.height || 'SHORT_HEIGHT';

      const cardContent = templateData.standAlone || templateData.metadata || {};
      refinedData.standAlone = {
        cardTitle: templateData.cardTitle || cardContent.cardTitle || "",
        cardDescription: templateData.body || cardContent.cardDescription || cardContent.description || "",
        suggestions: mapSuggestions(templateData.buttons || cardContent.buttons || cardContent.suggestions)
      };

      // Handle Media URL vs File Upload
      // Priority: If fileName exists in cardContent (set by frontend when file is picked), use it.
      // If mediaUrl is a data: URL (base64), IGNORE IT and rely on files array.
      if (cardContent.fileName) {
        refinedData.standAlone.fileName = cardContent.fileName;
        if (cardContent.thumbnailFileName) refinedData.standAlone.thumbnailFileName = cardContent.thumbnailFileName;
      } else if (cardContent.mediaUrl && !cardContent.mediaUrl.startsWith('data:')) {
        refinedData.standAlone.mediaUrl = cardContent.mediaUrl;
        if (cardContent.thumbnailUrl) refinedData.standAlone.thumbnailUrl = cardContent.thumbnailUrl;
      }
    } else if (refinedData.type === 'carousel') {
      refinedData.height = templateData.height || templateData.metadata?.height || 'SHORT_HEIGHT';
      refinedData.width = templateData.width || templateData.metadata?.width || 'MEDIUM_WIDTH';

      const carouselList = templateData.carouselList || templateData.metadata?.carouselList || [];
      refinedData.carouselList = carouselList.map(card => {
        const mappedCard = {
          cardTitle: card.cardTitle || card.title || "",
          cardDescription: card.cardDescription || card.description || "",
          suggestions: mapSuggestions(card.buttons || card.suggestions)
        };

        if (card.fileName) {
          mappedCard.fileName = card.fileName;
          if (card.thumbnailFileName) mappedCard.thumbnailFileName = card.thumbnailFileName;
        } else if (card.mediaUrl && !card.mediaUrl.startsWith('data:')) {
          mappedCard.mediaUrl = card.mediaUrl;
          if (card.thumbnailUrl) mappedCard.thumbnailUrl = card.thumbnailUrl;
        }
        return mappedCard;
      });
    }

    // Use FormData with rich_template_data field
    const FormData = require('form-data');
    const form = new FormData();
    form.append('rich_template_data', JSON.stringify(refinedData));

    // Append any actual files if present (multer)
    if (files && Array.isArray(files)) {
      files.forEach(file => {
        form.append('multimedia_files', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype
        });
      });
    }

    const response = await axios.post(url, form, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      },
      timeout: 60000
    });

    console.log(`✅ Dotgo Response [${response.status}]:`, JSON.stringify(response.data).substring(0, 500));

    // Some versions of Dotgo API return 200 OK with an error status inside the JSON
    if (response.data && (response.data.status === 'Bad Request' || response.data.error)) {
      const errorMsg = response.data.error?.message || response.data.message || JSON.stringify(response.data);
      console.error("❌ Dotgo Business Error (inside 200 OK):", errorMsg);
      return { success: false, error: errorMsg };
    }

    // Clear cache so the next list fetch is fresh
    templateCache.delete(botId);

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
    const base64Name = base64UrlEncode(templateName);
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
    const base64Name = base64UrlEncode(templateName);
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

    // Pattern: {serverRoot}/directory/secure/api/v1/bots/{botId}/deleteTemplate/{base64_name}
    const base64Name = base64UrlEncode(templateName);
    const url = `${baseUrl}/${botId}/deleteTemplate/${base64Name}`;

    console.log(`🗑️ Deleting Dotgo Template (Admin Token) for Bot: ${botId}, Template: ${templateName} (B64: ${base64Name})`);

    // The user's curl shows POST for deletion
    const response = await axios.post(url, {}, {
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 15000
    });

    // Clear cache so the next list fetch is fresh
    templateCache.delete(botId);

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
    const botId = config.bot_id;

    // Check Cache first
    const cached = templateCache.get(botId);
    if (cached && cached.expiresAt > Date.now()) {
      console.log(`📦 Returning CACHED templates for Bot: ${botId}`);
      return cached.data;
    }

    const token = await getDotgoAdminToken();
    if (!token) {
      console.error("❌ Dotgo Admin Token failure for template listing");
      return [];
    }

    const baseUrl = process.env.DOTGO_ADMIN_TEMPLATE_URL || `https://developer-api.dotgo.com/directory/secure/api/v1/bots`;
    const url = `${baseUrl}/${botId}/templates`;

    console.log(`📡 Fetching LIVE Dotgo Templates for Bot: ${botId} (Admin Token)`);

    const response = await axios.get(url, {
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 20000 // 20 seconds timeout for large lists
    });

    console.log(`📥 Dotgo Template List Response [${response.status}]`);

    // Match the JSON structure: { "templateList": [...] } or { "templates": [...] } or sometimes it's an array directly
    const templateList = response.data?.templateList || response.data?.templates || (Array.isArray(response.data) ? response.data : []);

    const mapped = templateList.map(t => ({
      id: t.name || t.id,
      name: t.name || t.id,
      status: t.status || t.templateStatus,
      type: t.templateType || t.type,
      lastUpdate: t.lastUpdate || t.updatedAt
    }));

    // Update Cache
    templateCache.set(botId, {
      data: mapped,
      expiresAt: Date.now() + TEMPLATE_CACHE_TTL
    });

    return mapped;

  } catch (error) {
    console.error("❌ Fetch External Templates Error:", error.message);
    // If it's a timeout or error, return the cached data if it exists (even if expired) as a fallback
    const stale = templateCache.get(config.bot_id);
    if (stale) {
      console.log(`⚠️ Returning STALE cache due to fetch error for Bot: ${config.bot_id}`);
      return stale.data;
    }
    return [];
  }
};

/**
 * Step 1: Submit Bot to Dotgo
 * @param {object} creationData 
 * @returns {Promise<object>}
 */
const submitBotToDotgo = async (creationData) => {
  try {
    const token = await getDotgoAdminToken();
    if (!token) return { success: false, error: "Platform Admin Authentication failed" };

    const url = `https://developer-api.dotgo.com/directory/secure/api/v1/bots/submit_bot`;

    const form = new FormData();

    // Safety check: Warn if a local URL is being sent to Dotgo
    const logoUrl = creationData.data?.bot_logo_url || "";
    const bannerUrl = creationData.data?.banner_logo_url || "";
    if (logoUrl.includes('localhost') || bannerUrl.includes('localhost') || logoUrl.includes('127.0.0.1')) {
      console.warn("⚠️ WARNING: Submitting local URLs (localhost) to Dotgo. They will NOT be able to access these images.");
    }

    form.append('creation_data', JSON.stringify(creationData));

    console.log(`📤 Submitting Bot to Dotgo: ${creationData.brand_details?.brand_name}`);
    console.log(`📦 Payload:`, JSON.stringify(creationData, null, 2));

    const response = await axios.post(url, form, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      }
    });

    console.log(`✅ Dotgo Response [${response.status}]:`, JSON.stringify(response.data));

    if (response.data && response.data.status_message === 'success') {
      return { success: true, brand_id: response.data.brand_id, bot_id: response.data.bot_id };
    }

    return { success: false, error: response.data?.status_message || "Submission failed", raw: response.data };
  } catch (error) {
    if (error.response) {
      console.error("❌ Dotgo Bot Submission Error Body:", JSON.stringify(error.response.data));
      return { success: false, error: error.response.data?.status_message || error.response.data?.message || JSON.stringify(error.response.data) };
    }
    console.error("❌ Dotgo Bot Submission Error:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Step 2: Verify Bot to Dotgo
 * @param {object} verifyData 
 * @param {object} files - { screenImages, brandLogoImage }
 * @returns {Promise<object>}
 */
const verifyBotToDotgo = async (verifyData, files = {}) => {
  try {
    const token = await getDotgoAdminToken();
    if (!token) return { success: false, error: "Platform Admin Authentication failed" };

    const url = `https://developer-api.dotgo.com/directory/secure/api/v1/bots/submit_bot_for_verification`;

    const form = new FormData();
    form.append('data', JSON.stringify(verifyData));

    if (files.screenImages) {
      form.append('screenImages', files.screenImages.buffer, {
        filename: files.screenImages.originalname,
        contentType: files.screenImages.mimetype
      });
    }

    if (files.brandLogoImage) {
      form.append('brandLogoImage', files.brandLogoImage.buffer, {
        filename: files.brandLogoImage.originalname,
        contentType: files.brandLogoImage.mimetype
      });
    }

    console.log(`📤 Submitting Bot for Verification: ${verifyData.bot_id}`);
    console.log(`📦 Verification Data:`, JSON.stringify(verifyData, null, 2));

    const response = await axios.post(url, form, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      }
    });

    console.log(`✅ Dotgo Verification Response [${response.status}]:`, JSON.stringify(response.data));

    if (response.data && response.data.status_message === 'success') {
      return { success: true, data: response.data };
    }

    return { success: false, error: response.data?.status_message || "Verification submission failed", raw: response.data };
  } catch (error) {
    if (error.response) {
      console.error("❌ Dotgo Bot Verification Error Body:", JSON.stringify(error.response.data));
      return { success: false, error: error.response.data?.status_message || error.response.data?.message || JSON.stringify(error.response.data) };
    }
    console.error("❌ Dotgo Bot Verification Error:", error.message);
    return { success: false, error: error.message };
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
  deleteDotgoTemplate,
  submitBotToDotgo,
  verifyBotToDotgo
};

