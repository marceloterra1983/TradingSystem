/**
 * Generate PWA Icons
 * Creates simple placeholder icons for PWA functionality
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

// SVG template for icons
function generateSVG(size) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="#0f172a"/>

  <!-- Chart Line (simplified trading symbol) -->
  <polyline
    points="${size * 0.15},${size * 0.7} ${size * 0.3},${size * 0.5} ${size * 0.5},${size * 0.6} ${size * 0.7},${size * 0.3} ${size * 0.85},${size * 0.4}"
    fill="none"
    stroke="#3b82f6"
    stroke-width="${size * 0.04}"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <!-- Accent points -->
  <circle cx="${size * 0.3}" cy="${size * 0.5}" r="${size * 0.05}" fill="#3b82f6"/>
  <circle cx="${size * 0.5}" cy="${size * 0.6}" r="${size * 0.05}" fill="#3b82f6"/>
  <circle cx="${size * 0.7}" cy="${size * 0.3}" r="${size * 0.05}" fill="#10b981"/>

  <!-- Text -->
  <text
    x="${size * 0.5}"
    y="${size * 0.9}"
    font-family="Arial, sans-serif"
    font-size="${size * 0.08}"
    font-weight="bold"
    fill="#e2e8f0"
    text-anchor="middle"
  >TRADING</text>
</svg>`;
}

// Generate icons
const sizes = [192, 512];

sizes.forEach(size => {
  const svg = generateSVG(size);
  const filename = `icon-${size}.png`;
  const svgPath = path.join(publicDir, `icon-${size}.svg`);
  const pngPath = path.join(publicDir, filename);

  // Write SVG first
  fs.writeFileSync(svgPath, svg);
  console.log(`✅ Created ${filename} (SVG source)`);
});

// Also create favicon.ico placeholder (using 192 size)
const faviconSVG = generateSVG(32);
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSVG);
console.log('✅ Created favicon.svg');

// Create robots.txt
const robotsTxt = `User-agent: *
Allow: /

Sitemap: http://localhost:9080/sitemap.xml
`;
fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt);
console.log('✅ Created robots.txt');

console.log('\n📦 PWA assets generated successfully!');
console.log('\nNote: For production, you may want to replace SVG icons with actual PNG files.');
console.log('SVG icons will work in most modern browsers.');
