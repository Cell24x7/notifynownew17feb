const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const filePath = '/etc/nginx/conf.d/notifynow.conf';
const backupPath = '/etc/nginx/conf.d/notifynow.conf.bak_dlr';

console.log('======================================================');
console.log('🔄 NOTIFYNOW NGINX UPDATE FOR WEBHOOK BYPASS');
console.log('======================================================');

try {
    if (!fs.existsSync(filePath)) {
        console.error(`❌ Error: Nginx configuration file not found at ${filePath}`);
        process.exit(1);
    }

    // Read the current configuration
    const originalContent = fs.readFileSync(filePath, 'utf8');

    // Create a backup first
    fs.writeFileSync(backupPath, originalContent, 'utf8');
    console.log(`💾 Backup created at ${backupPath}`);

    // Split by 'server {'
    const parts = originalContent.split(/server\s*\{/);
    
    // Find the part containing "listen 80"
    let port80Index = -1;
    for (let i = 1; i < parts.length; i++) {
        if (parts[i].includes('listen 80')) {
            port80Index = i;
            break;
        }
    }

    if (port80Index === -1) {
        console.error('❌ Error: Could not find the port 80 server block in the Nginx configuration.');
        process.exit(1);
    }

    console.log(`📍 Found port 80 block at segment index ${port80Index}`);

    // Define the new port 80 server block
    const newPort80Block = `
    listen 80 default_server;
    server_name notifynow.in www.notifynow.in;

    # Exclude all incoming webhooks (SMS, WhatsApp, Dotgo, Voice) from HTTPS redirection
    location /api/webhooks/ {
        proxy_pass http://localhost:5050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Redirect everything else to HTTPS
    location / {
        if ($host = www.notifynow.in) {
            return 301 https://$host$request_uri;
        }
        if ($host = notifynow.in) {
            return 301 https://$host$request_uri;
        }
        return 404;
    }
}
`;

    // Replace the segment
    parts[port80Index] = newPort80Block;

    // Join back
    const updatedContent = parts.join('server {');

    // Write the updated configuration
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`✏️ Updated Nginx configuration written to ${filePath}`);

    // Test Nginx configuration
    console.log('🛠️ Testing Nginx configuration...');
    try {
        const testResult = execSync('nginx -t', { encoding: 'utf8', stdio: 'pipe' });
        console.log('✅ Nginx configuration test passed!');
    } catch (testErr) {
        console.error('❌ Nginx configuration test failed! Restoring backup...');
        fs.writeFileSync(filePath, originalContent, 'utf8');
        console.error(testErr.stderr || testErr.message);
        process.exit(1);
    }

    // Reload Nginx
    console.log('🔄 Reloading Nginx service...');
    try {
        execSync('systemctl reload nginx', { encoding: 'utf8' });
        console.log('✅ Nginx reloaded successfully! Webhook HTTP bypass is now live.');
    } catch (reloadErr) {
        console.error('❌ Failed to reload Nginx! Restoring backup...');
        fs.writeFileSync(filePath, originalContent, 'utf8');
        execSync('systemctl reload nginx', { encoding: 'utf8' });
        console.error(reloadErr.message);
        process.exit(1);
    }

} catch (error) {
    console.error('❌ Critical error during execution:', error.message);
    process.exit(1);
}

console.log('======================================================');
