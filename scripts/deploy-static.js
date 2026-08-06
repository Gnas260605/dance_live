const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../apps/web/dist');
const destDir = path.join(__dirname, '../apps/api/public');

function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

try {
    console.log('📦 Copying web build assets to api public folder...');
    if (fs.existsSync(destDir)) {
        fs.rmSync(destDir, { recursive: true, force: true });
    }
    copyDir(srcDir, destDir);
    console.log('✅ Web assets copied successfully!');
} catch (err) {
    console.error('❌ Failed to copy web assets:', err.message);
    process.exit(1);
}
