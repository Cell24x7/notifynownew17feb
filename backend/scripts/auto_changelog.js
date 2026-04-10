const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const changelogPath = path.join(__dirname, '..', '..', 'frontend', 'public', 'CHANGELOG.md');

function updateChangelog() {
    try {
        const today = new Date().toISOString().split('T')[0];
        console.log(`🚀 Checking for updates on ${today}...`);

        // Check if today already has an entry to avoid duplicates
        const content = fs.readFileSync(changelogPath, 'utf8');
        if (content.includes(`## [${today}]`)) {
            console.log(`ℹ️ Changelog already has an entry for ${today}. Skipping auto-entry.`);
            return;
        }

        // Get git logs for today
        const gitLogs = execSync(`git log --since="${today} 00:00:00" --oneline`).toString().trim();
        
        if (!gitLogs) {
            console.log('📭 No new commits found for today.');
            return;
        }

        const lines = gitLogs.split('\n').map(line => `- ${line}`);
        const newEntry = `## [${today}]\n${lines.join('\n')}\n\n`;

        // Find the marker for historical archive or the first date entry
        // We want to insert after "<br>\n\n"
        const marker = '<br>\n\n';
        const parts = content.split(marker);

        if (parts.length > 1) {
            const updatedContent = parts[0] + marker + newEntry + parts[1];
            fs.writeFileSync(changelogPath, updatedContent);
            console.log(`✅ Automatically added ${lines.length} commits to CHANGELOG.md`);
        } else {
            console.warn('⚠️ Could not find insertion marker in CHANGELOG.md');
        }

    } catch (error) {
        console.error('❌ Auto-changelog error:', error.message);
    }
}

updateChangelog();
