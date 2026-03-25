const { zip } = require('zip-a-folder');
const fs = require('fs');

async function main() {
    // Create public directory if it doesn't exist
    if (!fs.existsSync('./public')) {
        fs.mkdirSync('./public');
    }
    await zip('./out', './public/www.zip');
}

main();
