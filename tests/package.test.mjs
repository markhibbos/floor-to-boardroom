import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

test('Pages game and native copy have valid JavaScript', () => {
  for (const path of ['index.html', 'dist/index.html']) {
    const html = readFileSync(path, 'utf8');
    for (const script of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(script[1]);
    assert.match(html, /viewport-fit=cover/);
    assert.match(html, /safe-area-inset-top/);
    assert.match(html, /safe-area-inset-bottom/);
  }
});
test('every packaged page and font dependency is local and present', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  for (const [, url] of html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g)) {
    assert.ok(!/^https?:/.test(url), `Remote asset: ${url}`);
    assert.ok(existsSync(`dist/${url}`), `Missing asset: ${url}`);
  }
  const css = readFileSync('dist/fonts/fonts.css', 'utf8');
  for (const [, font] of css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) assert.ok(existsSync(`dist/fonts/${font}`));
  assert.equal(readFileSync('index.html','utf8').includes('<script src="native.js">'), false);
  assert.ok(html.indexOf('native.js') < html.indexOf('const KEY='));
});
test('native identity, privacy manifest and project resources are consistent', () => {
  const config = JSON.parse(readFileSync('capacitor.config.json','utf8'));
  const project = readFileSync('ios/App/App.xcodeproj/project.pbxproj','utf8');
  assert.equal(config.appId, 'com.sigosi.onelife');
  assert.equal(config.ios.contentInset, 'never');
  assert.equal(config.server, undefined);
  assert.equal((project.match(/PRODUCT_BUNDLE_IDENTIFIER = com.sigosi.onelife;/g)||[]).length, 2);
  assert.match(project, /PrivacyInfo.xcprivacy in Resources/);
  const privacy = readFileSync('ios/App/App/PrivacyInfo.xcprivacy','utf8');
  assert.match(privacy, /CA92.1/); assert.match(privacy, /C617.1/);
});
