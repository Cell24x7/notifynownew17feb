const cell24x7 = require('./voice/providers/cell24x7');
const edpl = require('./voice/providers/edpl');

/**
 * Factory for routing requests based on provider type
 */

const uploadVoiceAudio = async (fileBuffer, fileName, config) => {
    const provider = config?.provider || 'cell24x7';
    
    if (provider === 'cell24x7') {
        return cell24x7.uploadVoiceAudio(fileBuffer, fileName, config);
    }
    
    if (provider === 'edpl') {
        const fs = require('fs');
        const path = require('path');
        const uploadDir = path.join(__dirname, '../../uploads/voice');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        // Save file locally and return local path as audioId
        const ext = path.extname(fileName) || '.mp3';
        const uniqueName = `edpl_${Date.now()}_${Math.floor(Math.random()*1000)}${ext}`;
        const filePath = path.join(uploadDir, uniqueName);
        fs.writeFileSync(filePath, fileBuffer);
        
        return { success: true, audioId: `local:${uniqueName}`, message: 'EDPL audio saved locally for later bulk upload' };
    }
    
    return { success: false, error: 'Unknown Voice Provider' };
};

const sendVoiceCall = async (mobile, audioId, options = {}, config = {}) => {
    const provider = config?.provider || 'cell24x7';
    
    if (provider === 'cell24x7') {
        return cell24x7.sendVoiceCall(mobile, audioId, options, config);
    }
    
    if (provider === 'edpl') {
        // EDPL doesn't send single voice calls. It operates at a campaign level via CSV.
        return { success: false, error: 'EDPL Provider only supports bulk campaign broadcasts, not single calls.' };
    }
    
    return { success: false, error: 'Unknown Voice Provider' };
};

/**
 * Route EDPL Broadcast Campaign creation
 */
const createBroadcastCampaign = async (name, audioBuffer, audioFileName, csvBuffer, csvFileName, allowedPorts, config) => {
    if (config?.provider === 'edpl') {
        return edpl.createBroadcastCampaign(name, audioBuffer, audioFileName, csvBuffer, csvFileName, allowedPorts, config);
    }
    return { success: false, error: 'Provider does not support direct broadcast campaigns.' };
};

module.exports = {
    // Legacy support (mostly cell24x7)
    uploadVoiceAudio,
    sendVoiceCall,
    
    // New EDPL support
    createBroadcastCampaign,
    
    // Export raw providers if needed elsewhere
    providers: {
        cell24x7,
        edpl
    }
};
