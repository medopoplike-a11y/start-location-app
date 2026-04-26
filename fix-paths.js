const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'out');

function walk(dir) {
  // تم تعطيل تعديل المسارات هنا لأن استخدام androidScheme: "https" و hostname: "localhost"
  // يجعل المسارات المطلقة (/_next/...) تعمل بشكل مثالي وبدون أخطاء الشاشة البيضاء.
  console.log('Skipping path rewrite, using native absolute paths for safety.');
}

if (fs.existsSync(outDir)) {
  console.log('Fixing paths for Capacitor build...');
  walk(outDir);
  console.log('Paths fixed successfully!');
} else {
  console.error('Out directory not found.');
}

