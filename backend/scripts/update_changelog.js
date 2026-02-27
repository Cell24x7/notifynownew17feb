const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Root of the project (assuming this script is in backend/scripts)
const projectRoot = path.join(__dirname, '../../');
const changelogPath = path.join(projectRoot, 'frontend/public/CHANGELOG.md');

try {
    console.log('🔄 Updating Changelog from Git history...');

    // Get git logs for the last 30 days, grouped by date
    // Note: This requires git to be installed and the folder to be a git repo
    const logCommand = 'git log --pretty=format:"### [%ad]%n- %s (%h)" --date=short --since="30 days ago"';
    const logs = execSync(logCommand, { cwd: projectRoot }).toString().trim();

    if (!logs) {
        console.log('ℹ️ No new git commits found in the last 30 days.');
        process.exit(0);
    }

    // Process logs to group by date
    const lines = logs.split('\n');
    const groupedLogs = {};
    let currentDate = '';

    lines.forEach(line => {
        if (line.startsWith('### [')) {
            currentDate = line.match(/\[(.*?)\]/)[1];
            if (!groupedLogs[currentDate]) groupedLogs[currentDate] = [];
        } else if (line.startsWith('- ') && currentDate) {
            groupedLogs[currentDate].push(line);
        }
    });

    // Build Markdown
    let markdownContent = `# Daily Updates & Changelog\n\n`;
    markdownContent += `This document is automatically updated based on development activity.\n\n`;

    const sortedDates = Object.keys(groupedLogs).sort((a, b) => new Date(b) - new Date(a));

    sortedDates.forEach(date => {
        markdownContent += `## [${date}]\n`;
        groupedLogs[date].forEach(commit => {
            markdownContent.trim();
            markdownContent += `${commit}\n`;
        });
        markdownContent += `\n---\n\n`;
    });

    markdownContent += `\n> [!NOTE]\n> This log is auto-generated from git commits. To add manual notes, use git commit messages.\n`;

    fs.writeFileSync(changelogPath, markdownContent);
    console.log('✅ CHANGELOG.md updated successfully!');

} catch (error) {
    console.error('❌ Failed to update changelog:', error.message);
    // Don't crash the process if git log fails (e.g. no git repo)
}
