async function check() {
    try {
        const campaignId = '1931947044';
        const url = `https://wa.notifynow.in/api/message/campaign/${campaignId}/messages-read-status`;
        console.log('Fetching:', url);
        const res = await fetch(url);
        const data = await res.json();
        console.log('Full data response:', JSON.stringify(data, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

check();
