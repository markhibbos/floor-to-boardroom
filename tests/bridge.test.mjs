import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

test('bundled bridge registers native plugins, hydrates and mirrors game writes', async () => {
  class Storage {
    data = new Map();
    get length() { return this.data.size; }
    key(i) { return [...this.data.keys()][i]; }
    getItem(k) { return this.data.get(k) ?? null; }
    setItem(k, v) { this.data.set(k, String(v)); }
    removeItem(k) { this.data.delete(k); }
    clear() { this.data.clear(); }
  }
  const localStorage = new Storage(); let persisted = '{"ftb-save-v1":"restored"}';
  let background; let saves = 0; const classes = [];
  const sandbox = {
    Storage, localStorage, console,
    document: { documentElement: { classList: { add: x => classes.push(x) } } },
    webkit: { messageHandlers: { bridge: {} } },
    save: () => { saves++; },
    Capacitor: {
      PluginHeaders: [
        { name: 'Preferences', methods: [{ name: 'get', rtype: 'promise' }, { name: 'set', rtype: 'promise' }] },
        { name: 'App', methods: [{ name: 'addListener', rtype: 'callback' }] }
      ],
      nativePromise: async (plugin, method, options) => {
        assert.equal(plugin, 'Preferences');
        if (method === 'get') return { value: persisted };
        persisted = options.value;
      },
      nativeCallback: (plugin, method, options, callback) => {
        assert.equal(plugin, 'App'); assert.equal(options.eventName, 'appStateChange');
        background = callback; return 'listener';
      }
    }
  };
  sandbox.window = sandbox;
  vm.runInNewContext(readFileSync('dist/native.js', 'utf8'), sandbox);
  await sandbox.OneLifeNative.ready;
  assert.equal(localStorage.getItem('ftb-save-v1'), 'restored');
  assert.deepEqual(classes, ['native-ios']);
  for (const name of ['Preferences', 'Filesystem', 'Share', 'StatusBar', 'App']) assert.ok(sandbox.Capacitor.Plugins[name]);
  localStorage.setItem('ftb-slot-1', 'new slot'); await sandbox.OneLifeNative.flush();
  assert.equal(JSON.parse(persisted)['ftb-slot-1'], 'new slot');
  localStorage.removeItem('ftb-slot-1'); await sandbox.OneLifeNative.flush();
  assert.equal(JSON.parse(persisted)['ftb-slot-1'], undefined);
  background({ isActive: false }); await sandbox.OneLifeNative.flush(); assert.equal(saves, 1);
});
