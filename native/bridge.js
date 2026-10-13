import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { StatusBar } from '@capacitor/status-bar';
import { App } from '@capacitor/app';
import { createNativeStorage } from './storage.js';

if (Capacitor.isNativePlatform()) {
  document.documentElement.classList.add('native-ios');
  // Existing game hooks use this interface. Register official plugin proxies.
  Object.assign(window.Capacitor.Plugins, { Preferences, Filesystem, Share, StatusBar, App });
  const report = () => {
    if (typeof toastMsg === 'function') toastMsg('Could not save progress. Please export a backup before closing.');
  };
  const persistence = createNativeStorage(localStorage, Preferences, report);
  window.OneLifeNative = persistence;
  // Hydrate before any of the game's start wrappers execute.
  persistence.ready = persistence.restore();
  const original = {};
  for (const name of ['setItem', 'removeItem', 'clear']) {
    original[name] = Storage.prototype[name];
    Storage.prototype[name] = function (...args) {
      const result = original[name].apply(this, args);
      if (this === localStorage && (name === 'clear' || String(args[0]).startsWith('ftb-'))) persistence.flush();
      return result;
    };
  }
  App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) {
      if (typeof save === 'function') save();
      persistence.flush();
    }
  });
}
