import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Premium icon SVG (1024x1024 with background) ──────────────────────────────
const ICON_SVG = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Rich dark background radial gradient -->
    <radialGradient id="bg" cx="38%" cy="32%" r="72%">
      <stop offset="0%"   stop-color="#1a3a5c"/>
      <stop offset="55%"  stop-color="#0c1f3d"/>
      <stop offset="100%" stop-color="#020617"/>
    </radialGradient>

    <!-- Pin outer: premium blue gradient -->
    <linearGradient id="pinOuter" x1="15%" y1="0%" x2="85%" y2="100%">
      <stop offset="0%"   stop-color="#BAE6FD"/>
      <stop offset="25%"  stop-color="#60A5FA"/>
      <stop offset="60%"  stop-color="#2563EB"/>
      <stop offset="100%" stop-color="#1E3A8A"/>
    </linearGradient>

    <!-- Pin inner: vivid red-orange gradient -->
    <linearGradient id="pinInner" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%"   stop-color="#FCA5A5"/>
      <stop offset="35%"  stop-color="#EF4444"/>
      <stop offset="100%" stop-color="#991B1B"/>
    </linearGradient>

    <!-- Core yellow dot gradient -->
    <radialGradient id="coreDot" cx="35%" cy="35%" r="65%">
      <stop offset="0%"   stop-color="#FFFFFF"/>
      <stop offset="40%"  stop-color="#FDE68A"/>
      <stop offset="100%" stop-color="#F59E0B"/>
    </radialGradient>

    <!-- Blue glow behind the pin -->
    <filter id="blueGlow" x="-50%" y="-40%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="28" result="blur"/>
      <feColorMatrix in="blur" type="matrix"
        values="0 0 0 0 0.15  0 0 0 0 0.40  0 0 0 0 0.96  0 0 0 0.7 0"
        result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Crisp outer glow on pin -->
    <filter id="pinGlow" x="-25%" y="-15%" width="150%" height="140%">
      <feGaussianBlur stdDeviation="14" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- White dot glow -->
    <filter id="dotGlow" x="-120%" y="-120%" width="340%" height="340%">
      <feGaussianBlur stdDeviation="10" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- ── Background ── -->
  <rect width="1024" height="1024" rx="220" ry="220" fill="url(#bg)"/>

  <!-- Subtle top-right highlight in background -->
  <ellipse cx="720" cy="200" rx="300" ry="200" fill="#1e4080" opacity="0.18"/>

  <!-- ── Depth ring behind pin ── -->
  <ellipse cx="512" cy="385" rx="200" ry="185" fill="#2563EB" opacity="0.10" filter="url(#blueGlow)"/>

  <!-- ── Ground shadow under pin tip ── -->
  <ellipse cx="512" cy="710" rx="110" ry="22" fill="#1D4ED8" opacity="0.45" filter="url(#blueGlow)"/>

  <!-- ── Main Pin Outer (Blue) ──
       Original path scaled 5x, centered on 512,512 canvas.
       Original viewBox 0 0 100 130 → scale=8.5, offset to center pin.
       Pin: outer circle center at (50,40), tip at (50,120).
       Scale=8.5: circle center → (425,340), tip → (425,1020) — too tall.
       Use scale=6.2: center→(310,248+offset), tip→(310,744+offset).
       offset x=202 (512-310=202), offset y=100.
       Pin circle center: (50*6.2+202, 40*6.2+100) = (512, 348).
       Tip: (512, 120*6.2+100) = (512, 844).
  -->
  <path
    d="M512,100
       C419,100 337,182 337,276
       C337,352 512,724 512,724
       C512,724 687,352 687,276
       C687,182 605,100 512,100Z"
    fill="url(#pinOuter)"
    filter="url(#pinGlow)"
  />

  <!-- ── Pin Inner (Red-Orange) ── -->
  <path
    d="M512,194
       C461,194 421,234 421,285
       C421,328 512,584 512,584
       C512,584 603,328 603,285
       C603,234 563,194 512,194Z"
    fill="url(#pinInner)"
  />

  <!-- ── Glass highlight (top-left lens flare) ── -->
  <path
    d="M476,118 C426,140 380,188 368,248 C362,278 374,270 388,238 C410,184 456,148 476,118Z"
    fill="white"
    opacity="0.16"
  />
  <!-- Secondary smaller highlight -->
  <ellipse cx="445" cy="155" rx="18" ry="28" fill="white" opacity="0.09" transform="rotate(-30 445 155)"/>

  <!-- ── Center dot (glowing white/yellow) ── -->
  <circle cx="512" cy="285" r="52" fill="url(#coreDot)" opacity="0.18" filter="url(#dotGlow)"/>
  <circle cx="512" cy="285" r="36" fill="url(#coreDot)"/>
  <!-- Specular highlight on dot -->
  <circle cx="499" cy="272" r="11" fill="white" opacity="0.75"/>
</svg>`;

// ── Foreground-only SVG (transparent bg, for adaptive icon preview) ───────────
const FOREGROUND_SVG = `<svg width="432" height="432" viewBox="0 0 432 432" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pinOuter" x1="15%" y1="0%" x2="85%" y2="100%">
      <stop offset="0%"   stop-color="#BAE6FD"/>
      <stop offset="25%"  stop-color="#60A5FA"/>
      <stop offset="60%"  stop-color="#2563EB"/>
      <stop offset="100%" stop-color="#1E3A8A"/>
    </linearGradient>
    <linearGradient id="pinInner" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%"   stop-color="#FCA5A5"/>
      <stop offset="35%"  stop-color="#EF4444"/>
      <stop offset="100%" stop-color="#991B1B"/>
    </linearGradient>
    <radialGradient id="coreDot" cx="35%" cy="35%" r="65%">
      <stop offset="0%"   stop-color="#FFFFFF"/>
      <stop offset="40%"  stop-color="#FDE68A"/>
      <stop offset="100%" stop-color="#F59E0B"/>
    </radialGradient>
    <filter id="glow" x="-30%" y="-20%" width="160%" height="150%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <!-- Pin outer -->
  <path
    d="M216,12 C151,12 98,65 98,130 C98,185 216,400 216,400 C216,400 334,185 334,130 C334,65 281,12 216,12Z"
    fill="url(#pinOuter)" filter="url(#glow)"
  />
  <!-- Pin inner -->
  <path
    d="M216,76 C181,76 154,103 154,138 C154,168 216,310 216,310 C216,310 278,168 278,138 C278,103 251,76 216,76Z"
    fill="url(#pinInner)"
  />
  <!-- Glass highlight -->
  <path
    d="M195,26 C162,40 132,68 124,104 C120,120 128,116 136,98 C150,70 178,46 195,26Z"
    fill="white" opacity="0.2"
  />
  <!-- Center dot -->
  <circle cx="216" cy="138" r="26" fill="url(#coreDot)" opacity="0.25" filter="url(#glow)"/>
  <circle cx="216" cy="138" r="18" fill="url(#coreDot)"/>
  <circle cx="208" cy="130" r="5" fill="white" opacity="0.8"/>
</svg>`;

// ── PNG size map ──────────────────────────────────────────────────────────────
const SIZES = [
  { dir: 'mipmap-mdpi',    size: 48  },
  { dir: 'mipmap-hdpi',    size: 72  },
  { dir: 'mipmap-xhdpi',   size: 96  },
  { dir: 'mipmap-xxhdpi',  size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

const RES_DIR = path.join(ROOT, 'android/app/src/main/res');

async function generateIcons() {
  console.log('🎨 Generating premium app icons...\n');

  // Save the master SVG to public/ for web use
  fs.writeFileSync(path.join(ROOT, 'public/app-icon.svg'), ICON_SVG, 'utf8');
  console.log('✅ Updated public/app-icon.svg');

  // Generate PNG for each Android density
  for (const { dir, size } of SIZES) {
    const outDir = path.join(RES_DIR, dir);
    fs.mkdirSync(outDir, { recursive: true });

    // Standard launcher icon (square, with background)
    await sharp(Buffer.from(ICON_SVG))
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, 'ic_launcher.png'));

    // Round icon (circular crop)
    const circleMask = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`
    );
    await sharp(Buffer.from(ICON_SVG))
      .resize(size, size)
      .composite([{ input: circleMask, blend: 'dest-in' }])
      .png()
      .toFile(path.join(outDir, 'ic_launcher_round.png'));

    // Foreground layer for adaptive icon
    await sharp(Buffer.from(FOREGROUND_SVG))
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, 'ic_launcher_foreground.png'));

    console.log(`✅ ${dir}: ${size}×${size}px (square + round + foreground)`);
  }

  // Also generate a web-ready 512px icon
  await sharp(Buffer.from(ICON_SVG))
    .resize(512, 512)
    .png()
    .toFile(path.join(ROOT, 'public/icon-512.png'));
  console.log('✅ public/icon-512.png (512×512)');

  console.log('\n✨ All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('❌ Error generating icons:', err);
  process.exit(1);
});
