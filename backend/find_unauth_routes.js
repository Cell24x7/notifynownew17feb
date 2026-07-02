const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

const methodRegex = /router\.(get|post|put|delete)\(['"]([^'"]+)['"],\s*(async\s*\([^)]*\)\s*=>|function|[^,)]*,)/g;

let vulnerableRoutes = [];

files.forEach(file => {
  const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const route = match[2];
    const afterRoute = content.slice(match.index + match[0].length - match[3].length, match.index + match[0].length + 50);
    
    // Check if 'authenticate' or similar auth middleware is part of the arguments
    const argsSection = content.slice(match.index, content.indexOf('{', match.index));
    
    if (!argsSection.includes('authenticate') && 
        !argsSection.includes('authenticateApiKey') &&
        !argsSection.includes('verifyToken') &&
        !file.includes('webhooks') && 
        !file.includes('auth.js') &&
        !route.includes('whitelabel')) {
      vulnerableRoutes.push({ file, method, route });
    }
  }
});

console.log(JSON.stringify(vulnerableRoutes, null, 2));
