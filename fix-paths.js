const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'out');

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath);
    } else if (file.endsWith('.html') || file.endsWith('.js') || file.endsWith('.css')) {
      let content = fs.readFileSync(filePath, 'utf8');

      // تحويل المسارات المطلقة إلى نسبية لتعمل داخل Capacitor
      content = content.replace(/(?<=href="|src=")\/_next\//g, '_next/');
      content = content.replace(/(?<=href="|src=")\/images\//g, 'images/');
      content = content.replace(/url\(\/_next\//g, 'url(_next/');

      fs.writeFileSync(filePath, content);
    }
  });
}

if (fs.existsSync(outDir)) {
  console.log('Fixing paths for Capacitor build...');
  walk(outDir);
  console.log('Paths fixed successfully!');
} else {
  console.error('Out directory not found.');
}

