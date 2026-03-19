require('dotenv').config({path: './backend/.env'});
const { query } = require('./backend/config/db');

async function check() {
    try {
        console.log("Checking template: waterpark_booking_co");
        const [templates] = await query('SELECT * FROM message_templates WHERE name = ?', ['waterpark_booking_co']);
        if (templates.length) {
            console.log("Template Found:");
            console.log("Body:", templates[0].body);
            console.log("Metadata:", templates[0].template_metadata);
        } else {
            const [waTemplates] = await query('SELECT * FROM whatsapp_templates WHERE element_name = ?', ['waterpark_booking_co']);
             if (waTemplates.length) {
                console.log("WhatsApp Template Found:");
                console.log("Body:", waTemplates[0].body_text);
                console.log("Full JSON:", waTemplates[0].data_json);
            } else {
                console.log("Template not found in either table.");
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

check();
