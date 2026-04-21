const axios = require('axios');

/**
 * NotifyNow AI Support Assistant (Powered by Gemini)
 * Handles conversational queries using provided internal context.
 */
async function getGeminiResponse(userPrompt) {
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    
    // If no key, fail gracefully so it doesn't crash the server
    if (!GEMINI_KEY || GEMINI_KEY === 'na') {
        console.warn('AI Warning: GEMINI_API_KEY is missing.');
        return null;
    }

    try {
        // Correcting the model name to exactly what worked in your manual CURL
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_KEY}`;
        
        const response = await axios.post(url, {
            contents: [{ 
                parts: [{ 
                    text: `You are Notify Assistant. Use the following context to help users regarding SMS, WhatsApp, RCS, or Billing issues. Keep answers professional and tech-friendly. If no info is found, suggest connecting to technical staff (Sandeep Yadav).\n\nUser Question: ${userPrompt}` 
                }] 
            }]
        }, { timeout: 8000 }); // 8 seconds timeout for safety

        if (response.data && response.data.candidates && response.data.candidates[0].content) {
            return response.data.candidates[0].content.parts[0].text;
        }
        return null;
    } catch (error) {
        console.error('AI Error:', error.response?.data || error.message);
        return null;
    }
}

module.exports = { getGeminiResponse };
