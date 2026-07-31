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
        // EDPL might not require a separate audio upload step if we send it directly in createBroadcastCampaign.
        // However, if the old codebase relies on this step, we can just return a fake ID and handle the real upload during campaign broadcast.
        return { success: true, audioId: 'edpl_audio_deferred', message: 'EDPL uses direct campaign upload' };
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
