const http = require('http');

function checkApi(retries = 3) {
    const req = http.get('http://localhost:5000/api/resellers', (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (json.success) {
                    console.log('✅ API Request Successful');
                    if (json.resellers.length > 0) {
                        const r = json.resellers[0];
                        if (r.hasOwnProperty('plan_id')) {
                            console.log('✅ plan_id found in response:', r.plan_id);
                            console.log('✅ channels_enabled found in response:', r.channels_enabled);
                            process.exit(0);
                        } else {
                            console.log('⚠️ plan_id MISSING in response. Retrying...');
                            if (retries > 0) {
                                setTimeout(() => checkApi(retries - 1), 2000);
                            } else {
                                console.error('❌ Failed to verify plan_id after retries');
                                process.exit(1);
                            }
                        }
                    } else {
                        console.log('⚠️ No resellers found to check');
                        process.exit(0);
                    }
                } else {
                    console.log('❌ API returned success: false', json);
                    process.exit(1);
                }
            } catch (e) {
                console.error('❌ Failed to parse JSON:', e.message);
                process.exit(1);
            }
        });
    });

    req.on('error', (err) => {
        console.error('❌ API Request Failed:', err.message);
        if (retries > 0) {
            setTimeout(() => checkApi(retries - 1), 2000);
        } else {
            process.exit(1);
        }
    });
}

console.log('Starting verification...');
setTimeout(checkApi, 1000); // Initial delay
