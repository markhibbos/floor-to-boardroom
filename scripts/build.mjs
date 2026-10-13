import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

// The Pages document remains the game source; only the native copy gets a bridge.
await mkdir('dist', { recursive: true });
for (const asset of ['privacy.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'fonts']) {
  await cp(asset, `dist/${asset}`, { recursive: true });
}
const html = await readFile('index.html', 'utf8');
await cp('native/mobile.css', 'dist/mobile.css');
await writeFile('dist/index.html', html.replace('</head>', '<link rel="stylesheet" href="mobile.css">\n</head>').replace('<script>', '<script src="native.js"></script>\n<script>'));
await build({ entryPoints: ['native/bridge.js'], outfile: 'dist/native.js', bundle: true, format: 'iife', target: 'safari15', minify: true });
console.log('Bundled One Life, fonts and native plugins for offline use.');
