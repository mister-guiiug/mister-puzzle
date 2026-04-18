import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'public');
const distDir = join(rootDir, 'dist');

const svgBuffer = readFileSync(join(publicDir, 'logo.svg'));

async function generateIcons() {
  // PWA icons
  await sharp(svgBuffer)
    .resize(192, 192, { fit: 'cover', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(publicDir, 'pwa-192x192.png'));

  await sharp(svgBuffer)
    .resize(512, 512, { fit: 'cover', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(publicDir, 'pwa-512x512.png'));

  // Logo for Open Graph
  await sharp(svgBuffer)
    .resize(1200, 630, { fit: 'cover', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(publicDir, 'logo.png'));

  // Favicon ICO (use PNG as base, 32x32)
  const favicon32 = await sharp(svgBuffer)
    .resize(32, 32, { fit: 'cover', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  writeFileSync(join(publicDir, 'favicon.ico'), favicon32);

  // Also copy to dist
  const distPwa192 = await sharp(svgBuffer)
    .resize(192, 192, { fit: 'cover', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const distPwa512 = await sharp(svgBuffer)
    .resize(512, 512, { fit: 'cover', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const distFavicon = await sharp(svgBuffer)
    .resize(32, 32, { fit: 'cover', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  writeFileSync(join(distDir, 'pwa-192x192.png'), distPwa192);
  writeFileSync(join(distDir, 'pwa-512x512.png'), distPwa512);
  writeFileSync(join(distDir, 'favicon.ico'), distFavicon);

  console.log('✅ Icons generated successfully!');
  console.log('  - public/pwa-192x192.png');
  console.log('  - public/pwa-512x512.png');
  console.log('  - public/logo.png');
  console.log('  - public/favicon.ico');
  console.log('  - dist/pwa-192x192.png');
  console.log('  - dist/pwa-512x512.png');
  console.log('  - dist/favicon.ico');
}

generateIcons().catch(console.error);