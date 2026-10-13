// Keep the game's synchronous storage API while serializing durable native writes.
// One snapshot includes slots, achievements, settings and the current life.
export function createNativeStorage(storage, preferences, onError = console.error) {
  let ready = false;
  let tail = Promise.resolve();
  const snapshot = () => {
    const data = {};
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key.startsWith('ftb-')) data[key] = storage.getItem(key);
    }
    return JSON.stringify(data);
  };
  const flush = () => {
    if (!ready) return tail;
    const value = snapshot();
    tail = tail.catch(() => {}).then(() => preferences.set({ key: 'ftb-backup', value }));
    tail.catch(onError);
    return tail;
  };
  const restore = async () => {
    const { value } = await preferences.get({ key: 'ftb-backup' });
    if (value) {
      const data = JSON.parse(value);
      if (!data || typeof data !== 'object' || Array.isArray(data) || Object.entries(data).some(([k, v]) => !k.startsWith('ftb-') || typeof v !== 'string')) {
        throw new Error('Invalid native save snapshot');
      }
      // A force quit can interrupt the last native write. Keep a newer complete
      // WebView snapshot when it still exists; otherwise restore native storage.
      const localRevision = Number(storage.getItem('ftb-native-revision')) || 0;
      const nativeRevision = Number(data['ftb-native-revision']) || 0;
      if (localRevision <= nativeRevision) {
        const keys = [];
        for (let i = 0; i < storage.length; i++) keys.push(storage.key(i));
        for (const key of keys) if (key.startsWith('ftb-')) storage.removeItem(key);
        for (const [key, entry] of Object.entries(data)) storage.setItem(key, entry);
      }
    }
    ready = true;
    await flush();
    return !!value;
  };
  const changed = () => {
    if (!ready) return tail;
    const revision = Math.max(Date.now(), (Number(storage.getItem('ftb-native-revision')) || 0) + 1);
    storage.setItem('ftb-native-revision', String(revision));
    return flush();
  };
  return { restore, flush, changed };
}
