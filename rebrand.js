const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory && !dirPath.includes('.git')) {
            walkDir(dirPath, callback);
        } else if (!isDirectory) {
            callback(path.join(dir, f));
        }
    });
}

const extensions = ['.html', '.css', '.js', '.xml', '.txt', '.md', '.json'];

walkDir('.', function(filePath) {
    if (extensions.some(ext => filePath.endsWith(ext))) {
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;
        
        // 1. crestwealth.com -> crestwealth.com
        content = content.replace(/crestwealth\.com/g, 'crestwealth.com');
        content = content.replace(/crestwealth/g, 'crestwealth');
        
        // 2. Crest Wealth -> Crest Wealth
        content = content.replace(/Crest Wealth/g, 'Crest Wealth');
        content = content.replace(/Crest Wealth/g, 'CREST WEALTH');
        
        // 3. Crest -> Crest
        content = content.replace(/Crest/g, 'Crest');
        content = content.replace(/Crest/g, 'CREST');

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Rebranded ${filePath}`);
        }
    }
});
console.log('Rebranding complete.');

