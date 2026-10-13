import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';
const base = 'ios/App/App/Assets.xcassets';
await sharp('icon-512.png').resize(1024, 1024).flatten({ background: '#13212A' }).png().toFile(`${base}/AppIcon.appiconset/AppIcon-512@2x.png`);
// Reuse the game's own artwork on the launch screen; avoid the template logo.
await mkdir(`${base}/Splash.imageset`, { recursive: true });
await sharp('icon-512.png').resize(240, 240).png().toFile(`${base}/Splash.imageset/one-life.png`);
await writeFile(`${base}/Splash.imageset/Contents.json`, JSON.stringify({ images: [{ filename: 'one-life.png', idiom: 'universal' }], info: { author: 'xcode', version: 1 } }, null, 2) + '\n');
