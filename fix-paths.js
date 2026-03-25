const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach( f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
};

const outDir = path.join(__dirname, 'out');

if (fs.existsSync(outDir)) {
  walk(outDir, (filePath) => {
    if (filePath.endsWith('.html')) {
      let content = fs.readFileSync(filePath, 'utf8');
      // Replace absolute paths with relative ones
      // /_next -> _next
      let newContent = content.replace(/href="\//g, 'href="').replace(/src="\//g, 'src="');
      fs.writeFileSync(filePath, newContent);
      console.log(`Fixed paths in: ${filePath}`);
    }
  });
} else {
  console.error('Out directory not found!');
}
