const fs = require('fs');
const transcriptPath = 'C:\\Users\\91816\\.gemini\\antigravity-ide\\brain\\d98d70f2-c2de-4290-adef-c678c712e9f1\\.system_generated\\logs\\transcript.jsonl';

if (fs.existsSync(transcriptPath)) {
    const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
    console.log(`Total lines: ${lines.length}`);
    for (let i = Math.max(0, lines.length - 10); i < lines.length; i++) {
        if (lines[i].trim()) {
            console.log(`Line ${i}:`, lines[i].substring(0, 150));
        }
    }
} else {
    console.log("File not found");
}
