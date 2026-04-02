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

function fixRoutes() {
  if (!fs.existsSync(outDir)) return;
  const routes = ['admin', 'driver', 'vendor', 'login'];
  routes.forEach(route => {
    const routeDir = path.join(outDir, route);
    if (!fs.existsSync(routeDir)) {
      fs.mkdirSync(routeDir, { recursive: true });
    }
    const htmlFile = path.join(outDir, `${route}.html`);
    if (fs.existsSync(htmlFile)) {
      fs.copyFileSync(htmlFile, path.join(routeDir, 'index.html'));
    }
  });
  const indexHtml = path.join(outDir, 'index.html');
  if (fs.existsSync(indexHtml)) {
    fs.copyFileSync(indexHtml, path.join(outDir, '404.html'));
  }
}

if (fs.existsSync(outDir)) {
  console.log('Fixing paths for Capacitor build...');
  walk(outDir);
  fixRoutes();
  console.log('Paths and routes fixed successfully!');
} else {
  console.error('Out directory not found.');
}

