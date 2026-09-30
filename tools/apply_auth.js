const fs = require('fs');
const path = require('path');

const protectedPages = ['academy.html', 'investments.html', 'accounts.html', 'dashboard.html'];
const htmlFiles = [];

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.html')) {
            htmlFiles.push(fullPath);
        }
    }
}
walkDir('.');

// 1. Add auth-guard.js to protected pages
for (const file of htmlFiles) {
    const basename = path.basename(file);
    if (protectedPages.includes(basename)) {
        let content = fs.readFileSync(file, 'utf8');
        
        if (!content.includes('auth-guard.js')) {
            const depth = file.split(path.sep).length - 1;
            const scriptSrc = depth > 0 ? '../auth-guard.js' : 'auth-guard.js';
            const scriptTag = `  <script src="${scriptSrc}"></script>\n</head>`;
            content = content.replace('</head>', scriptTag);
            fs.writeFileSync(file, content, 'utf8');
        }
    }
}

// 2. Add auth-required class to restricted links
const restrictedUrls = ['academy.html', 'investments.html', 'accounts.html', 'dashboard.html'];

for (const file of htmlFiles) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Regex to find <a> tags
    const regex = /<a\s+[^>]*href="([^"]+)"[^>]*>/gi;
    let modified = false;
    
    content = content.replace(regex, (match, href) => {
        const isRestricted = restrictedUrls.some(url => href.includes(url));
        if (!isRestricted || match.includes('auth-required')) return match;
        
        modified = true;
        const classMatch = match.match(/class="([^"]*)"/i);
        if (classMatch) {
            const oldClasses = classMatch[1];
            const newClasses = `${oldClasses} auth-required`.trim();
            return match.replace(`class="${oldClasses}"`, `class="${newClasses}"`);
        } else {
            return match.replace('<a ', '<a class="auth-required" ');
        }
    });
    
    if (modified) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated links in ${file}`);
    }
}

console.log('Done applying auth gates.');
