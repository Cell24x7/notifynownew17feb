const fs = require('fs');
const transcriptPath = 'C:\\Users\\91816\\.gemini\\antigravity-ide\\brain\\d98d70f2-c2de-4290-adef-c678c712e9f1\\.system_generated\\logs\\transcript.jsonl';

if (fs.existsSync(transcriptPath)) {
    const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
    console.log(`Total lines: ${lines.length}`);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes("pm2_status")) {
            console.log(`Line ${i} contains pm2_status.`);
            try {
                const step = JSON.parse(line);
                console.log(`  Source: ${step.source}, Type: ${step.type}, step_index: ${step.step_index}`);
                console.log(`  Content length: ${step.content ? step.content.length : 0}`);
                if (step.content) {
                    console.log(`  Content starts with:`, step.content.substring(0, 100));
                }
            } catch (e) {
                console.log(`  Failed to parse JSON: ${e.message}`);
                console.log(`  Raw snippet:`, line.substring(0, 150));
            }
        }
    }
} else {
    console.log("File not found");
}
