const replacePlaceholders = (url, data) => {
    if (!url) return '';
    let formatted = url;
    
    // Default placeholders
    const replacements = {
        '%TO': data.mobile || '',
        '%MSGTEXT': encodeURIComponent(data.message || ''),
        '%FROM': data.sender || '',
        '%TEMPID': data.templateId || '',
        '%PEID': data.peId || '',
        '%USER': 'user123',
        '%PWD': 'pass123',
        '%HASHID': data.hashId || '',
        '%MSGID': data.msgId || `sms_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        '%DLRUSERID': data.userId || '0',
        '%VENDOR': data.gatewayName || 'NotifyNow'
    };

    Object.keys(replacements).forEach(key => {
        // The original code was: const regex = new RegExp(key.replace('%', '\\%'), 'g');
        const regex = new RegExp(key.replace('%', '\\%'), 'g');
        formatted = formatted.replace(regex, replacements[key]);
    });

    return formatted;
};

const testUrl = "http://36.255.3.94:6002/cgi-bin/sendsms?to=%TO&from=%FROM&text=%MSGTEXT&dlr-url=http://154.210.160.233:5000/api/webhooks/sms/callback%3Fmsgid%3D%MSGID%26status%3D%25a%26mobile%3D%25p";
const testData = {
    mobile: '919004207813',
    message: 'Hello World',
    sender: 'SNDR',
    msgId: 'MY_FIXED_ID'
};

console.log('Original URL:', testUrl);
console.log('Formatted URL:', replacePlaceholders(testUrl, testData));
