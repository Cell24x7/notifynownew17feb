const axios = require("axios");
require("dotenv").config();

const RCS_API_URL = process.env.RCS_API_URL;
const RCS_USERNAME = process.env.RCS_USERNAME;
const RCS_PASSWORD = process.env.RCS_PASSWORD;
const RCS_BOT_ID = process.env.RCS_BOT_ID;

// External templates URL from env (with fallback)
const EXTERNAL_TEMPLATES_URL =
  process.env.EXTERNAL_TEMPLATES_URL ||
  "https://rcs.cell24x7.com/manage_templates/get_template_name_list";

let rcsAccessToken = null;
let tokenExpiresAt = null;

/**
 * Get RCS Access Token
 * @returns {Promise<string|null>} - Access token
 */
const getRcsToken = async () => {
  try {
    // Use cached token if valid
    if (rcsAccessToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
      console.log("? Using cached RCS token");
      return rcsAccessToken;
    }

    console.log("?? Fetching RCS token from API...");
    console.log(`?? API URL: ${RCS_API_URL}/getToken`);
    console.log(`?? Username: ${RCS_USERNAME}`);

    const response = await axios.post(
      `${RCS_API_URL}/getToken`,
      { username: RCS_USERNAME, password: RCS_PASSWORD },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 15000,
      }
    );

    const token =
      response.data?.jwttoken || // primary
      response.data?.accessToken || // fallback
      response.data?.token || // fallback
      response.data?.data?.accessToken; // fallback

    if (!token) {
      console.error("? RCS Token Error: token not found in response");
      console.error("?? Response:", JSON.stringify(response.data));
      return null;
    }

    rcsAccessToken = token;
    tokenExpiresAt = Date.now() + 23 * 60 * 60 * 1000; // 23h cache

    console.log("? RCS Token obtained successfully");
    console.log(`?? Token (first 20 chars): ${String(token).substring(0, 20)}...`);
    return rcsAccessToken;
  } catch (error) {
    console.error("? RCS Token Error:", error.message);
    if (error.response) {
      console.error("?? Status:", error.response.status);
      console.error("?? Data:", JSON.stringify(error.response.data));
    } else if (error.request) {
      console.error("? No response from RCS API - check URL/network");
    }
    return null;
  }
};

/**
 * Send RCS Template Message
 * @param {string} mobile
 * @param {string} templateName
 * @returns {Promise<object>}
 */
const sendRcsTemplate = async (mobile, templateName) => {
  try {
    if (!mobile || !templateName) {
      return { success: false, error: "Mobile and template name required" };
    }

    const token = await getRcsToken();
    if (!token) {
      return { success: false, error: "Unable to get access token" };
    }

    const targetUrl = `${RCS_API_URL}/v1/sendTemplate`;
    console.log(`?? Sending RCS template "${templateName}" to ${mobile}`);
    console.log(`?? Target URL: ${targetUrl}`);

    const response = await axios.post(
      targetUrl,
      {
        mobile,
        templateName,
        botId: RCS_BOT_ID,
        agentId: RCS_BOT_ID,
        client_id: RCS_BOT_ID,
        from: RCS_BOT_ID,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      }
    );

    const isSuccess =
      response.data?.success === true ||
      response.data?.status === "submitted" ||
      response.data?.status === "sent" ||
      response.data?.msg === "Success";

    if (isSuccess) {
      console.log("? RCS template sent successfully");
      return { success: true, messageId: response.data?.messageId || "N/A" };
    }

    console.error("? RCS template send failed:", response.data);
    return { success: false, error: JSON.stringify(response.data) };
  } catch (error) {
    console.error("? RCS Send Error:", error.message);
    if (error.response) {
      console.error("?? Status:", error.response.status);
      console.error("?? Data:", JSON.stringify(error.response.data));
      return { success: false, error: JSON.stringify(error.response.data) };
    }
    return { success: false, error: error.message };
  }
};

/**
 * ? Get External Templates List (FINAL FIXED)
 * External API returns: { success:true, data:[...] }
 * We return ONLY array always -> [...]
 *
 * @param {string|number} custId
 * @returns {Promise<Array>}
 */
const getExternalTemplates = async (custId) => {
  try {
    const safeCustId = custId ?? 7;

    console.log(`?? Fetching external templates for custId: ${safeCustId}`);
    console.log(`?? External URL: ${EXTERNAL_TEMPLATES_URL}`);

    const params = new URLSearchParams();
    params.append("custId", String(safeCustId));

    const response = await axios.post(EXTERNAL_TEMPLATES_URL, params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      timeout: 15000,
    });

    const payload = response.data;

    // Expected format: { success:true, data:[...] }
    if (payload && payload.success === true && Array.isArray(payload.data)) {
      return payload.data; // ? return only templates array
    }

    // Rare case: returns array directly
    if (Array.isArray(payload)) {
      return payload;
    }

    console.error("? Unexpected templates response:", payload);
    return [];
  } catch (error) {
    console.error("? Error fetching external templates:", error.message);
    if (error.response) {
      console.error("?? Status:", error.response.status);
      console.error("?? Data:", JSON.stringify(error.response.data));
    }
    return [];
  }
};

/**
 * Send RCS Custom Message
 * @param {string} mobile
 * @param {string} message
 * @returns {Promise<object>}
 */
const sendRcsMessage = async (mobile, message) => {
  try {
    if (!mobile || !message) {
      return { success: false, error: "Mobile and message required" };
    }

    const token = await getRcsToken();
    if (!token) {
      return { success: false, error: "Unable to get access token" };
    }

    const targetUrl = `${RCS_API_URL}/v1/sendMessage`;
    console.log(`?? Sending RCS message to ${mobile}`);
    console.log(`?? Target URL: ${targetUrl}`);

    const response = await axios.post(
      targetUrl,
      { mobile, message },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      }
    );

    if (response.status === 200 || response.data?.success === true) {
      console.log("? RCS message sent successfully");
      return { success: true, messageId: response.data?.messageId || "N/A" };
    }

    console.error("? RCS message failed:", response.data);
    return { success: false, error: response.data?.message || "Unknown error" };
  } catch (error) {
    console.error("? RCS Service Error:", error.message);
    if (error.response) {
      console.error("?? Status:", error.response.status);
      console.error("?? Data:", JSON.stringify(error.response.data));
      return { success: false, error: JSON.stringify(error.response.data) };
    }
    return { success: false, error: error.message };
  }
};

module.exports = {
  getRcsToken,
  sendRcsTemplate,
  getExternalTemplates,
  sendRcsMessage,
};
