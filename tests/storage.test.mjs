import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeStorage } from '../native/storage.js';

function memory(entries = {}) {
  const data = new Map(Object.entries(entries));
  return { get length() { return data.size; }, key: i => [...data.keys()][i], getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: k => data.delete(k) };
}
test('restores every game key after WebView eviction without changing other data', async () => {
  const local = memory({ other: 'keep' });
  const saved = { 'ftb-save-v1': '{"day":30}', 'ftb-slot-1': 'slot', 'ftb-look': 'avatar', 'ftb-theme': 'dark' };
  const p = createNativeStorage(local, { get: async () => ({ value: JSON.stringify(saved) }), set: async () => {} });
  await p.restore();
  for (const [key, value] of Object.entries(saved)) assert.equal(local.getItem(key), value);
  assert.equal(local.getItem('other'), 'keep');
});
test('native snapshot wins over stale local data and keeps deleted slots deleted', async () => {
  const local = memory({ 'ftb-save-v1': 'old', 'ftb-slot-2': 'deleted slot' });
  const p = createNativeStorage(local, { get: async () => ({ value: '{"ftb-save-v1":"new"}' }), set: async () => {} });
  await p.restore();
  assert.equal(local.getItem('ftb-save-v1'), 'new');
  assert.equal(local.getItem('ftb-slot-2'), null);
});
test('serializes overlapping writes so the newest game survives restart', async () => {
  const local = memory({ 'ftb-save-v1': 'first' });
  const writes = []; let release; let count = 0;
  const p = createNativeStorage(local, { get: async () => ({ value: null }), set: async ({ value }) => {
    if (++count === 2) await new Promise(resolve => { release = resolve; });
    writes.push(value);
  } });
  await p.restore();
  local.setItem('ftb-save-v1', 'second'); const a = p.flush();
  await Promise.resolve(); await Promise.resolve();
  local.setItem('ftb-save-v1', 'third'); const b = p.flush();
  assert.equal(count, 2); release(); await Promise.all([a, b]);
  assert.equal(JSON.parse(writes.at(-1))['ftb-save-v1'], 'third');
});
test('failed or malformed native reads never overwrite the backup', async () => {
  for (const get of [async () => { throw new Error('unavailable'); }, async () => ({ value: 'broken JSON' }), async () => ({ value: '{"ftb-save-v1":42}' })]) {
    let writes = 0; const local = memory({ 'ftb-save-v1': 'keep' });
    const p = createNativeStorage(local, { get, set: async () => { writes++; } });
    await assert.rejects(p.restore()); await p.flush();
    assert.equal(writes, 0); assert.equal(local.getItem('ftb-save-v1'), 'keep');
  }
});
test('a failed write is reported and subsequent saves can recover', async () => {
  let fail = false; let errors = 0; let final;
  const local = memory();
  const p = createNativeStorage(local, { get: async () => ({ value: null }), set: async ({ value }) => {
    if (fail) throw new Error('full'); final = value;
  } }, () => errors++);
  await p.restore(); fail = true;
  await assert.rejects(p.flush()); assert.equal(errors, 1);
  fail = false; local.setItem('ftb-save-v1', 'recovered'); await p.flush();
  assert.equal(JSON.parse(final)['ftb-save-v1'], 'recovered');
});
test('keeps the newer local snapshot after a force quit interrupts native writing', async () => {
  const local = memory({ 'ftb-save-v1': 'latest life', 'ftb-native-revision': '20' });
  let backup = JSON.stringify({ 'ftb-save-v1': 'older life', 'ftb-slot-2': 'deleted slot', 'ftb-native-revision': '19' });
  const p = createNativeStorage(local, { get: async () => ({ value: backup }), set: async ({ value }) => { backup = value; } });
  await p.restore();
  assert.equal(local.getItem('ftb-save-v1'), 'latest life');
  assert.equal(JSON.parse(backup)['ftb-slot-2'], undefined);
  assert.equal(JSON.parse(backup)['ftb-save-v1'], 'latest life');
});
