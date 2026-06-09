const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('======================================================');
console.log('🔍 NOTIFYNOW SERVER DIAGNOSTICS');
console.log('======================================================');

// 1. Check .env.production variables
try {
    const envPath = path.join(__dirname, '../.env.production');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        console.log('\n📝 .env.production values:');
        content.split('\n').forEach(line => {
            if (line.includes('API_BASE_URL') || line.includes('DLR_BASE_URL') || line.includes('PORT') || line.includes('DB_NAME')) {
                console.log(`   ${line.trim()}`);
            }
        });
    } else {
        console.log('\n❌ .env.production not found at: ' + envPath);
    }
} catch (e) {
    console.error('Error reading env file:', e.message);
}

// 2. Read Nginx configuration files
try {
    console.log('\n🌐 Nginx Configuration Files:');
    const nginxDir = '/etc/nginx/conf.d';
    if (fs.existsSync(nginxDir)) {
        const files = fs.readdirSync(nginxDir);
        for (const file of files) {
            const filePath = path.join(nginxDir, file);
            console.log(`\n📄 Configuration file: ${filePath}`);
            const confContent = fs.readFileSync(filePath, 'utf8');
            console.log(confContent);
        }
    } else {
        console.log('❌ Nginx conf.d directory not found.');
    }
} catch (e) {
    console.error('Error reading Nginx configurations:', e.message);
}

// 3. Search Nginx logs for SMS callback requests
try {
    console.log('\n📊 Searching Nginx Access Logs for SMS callbacks...');
    // We try to search in standard Nginx access log paths
    const accessLogPaths = [
        '/var/log/nginx/access.log',
        '/var/log/nginx/error.log',
        '/var/log/httpd/access_log'
    ];
    
    let foundLogs = false;
    for (const logPath of accessLogPaths) {
        if (fs.existsSync(logPath)) {
            console.log(`\nLooking in: ${logPath}`);
            try {
                // Grep for callback requests
                const cmd = `tail -n 10000 "${logPath}" | grep "/sms/callback" | tail -n 20`;
                const grepResult = execSync(cmd, { encoding: 'utf8' });
                if (grepResult.trim()) {
                    console.log(grepResult);
                    foundLogs = true;
                } else {
                    console.log('No recent SMS callback logs found in this file.');
                }
            } catch (cmdErr) {
                console.log(`(Could not grep log file: ${cmdErr.message})`);
            }
        }
    }
    
    if (!foundLogs) {
        console.log('\nℹ️ No SMS callback entries detected in any Nginx access logs.');
    }
} catch (e) {
    console.error('Error scanning logs:', e.message);
}

console.log('======================================================');
