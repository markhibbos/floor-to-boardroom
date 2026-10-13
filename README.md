# One Life

A career and life simulator. Play it here: https://markhibbos.github.io/floor-to-boardroom/

The playable page remains the source of the game. Games save on your device.

## iOS app

One Life uses Capacitor 8, iOS 15 or later, Node 22 or later, and Swift Package
Manager. Building the native binary requires macOS with Xcode 26 or later;
Codemagic provides that environment. Windows can build the web assets, sync the
native project and run the storage/package checks.

```sh
npm ci
npm test
npm run ios:sync
```

`npm run preview` serves the bundled game at http://127.0.0.1:4173.
`npm run ios:open` opens Xcode on a Mac. After changing the icon source,
run `node scripts/artwork.mjs` to regenerate the native artwork.

The build copies `index.html`, the existing icons, privacy page and local fonts
into `dist/`, then adds a bundled plugin bridge only to that copy. GitHub Pages
continues serving the root document without requiring npm or a build step.
The native app loads local assets, with no remote server URL, account service,
advertising or analytics. CSS owns safe areas; the WebView adds no second inset.

The app mirrors all `ftb-` storage keys into native Preferences, including slots,
settings, avatar, records and the current game. Startup restores that snapshot
before executing the game's start hooks. Writes are serialized; deleted slots
stay deleted, and a failed read stops startup instead of replacing a good save.
Background transitions request another save. JSON backups use the iOS share
sheet, and the existing file input imports web or native backup files. Existing
image and life-link sharing hooks use Filesystem and Share. Browser saves do not
automatically transfer into the separate app container: export on the website
and use **Load from file** in the app.

## Codemagic and TestFlight

Bundle ID: `com.sigosi.onelife`. Native display name: **One Life**.

The workflows in `codemagic.yaml` are manual:

1. **ios-register-bundle** registers the separate Apple identifier if missing
   through the existing `currents-apple` API integration.
2. **ios-simulator** compiles the actual iOS project without signing.
3. **ios-testflight** signs and uploads an IPA to App Store Connect.

For release setup, create a separate One Life app in App Store Connect with
that bundle ID, English (U.K.) as the primary language and SKU `onelife-ios`.
In Codemagic's secure code signing identities, create/fetch an App Store
provisioning profile for that ID using the existing
`currents-apple-distribution` certificate; save it as
`onelife-app-store-profile`. Keep its existing private key in Codemagic.
Set `APP_STORE_APPLE_ID` to One Life's numeric Apple ID in this application's
Codemagic environment. The release workflow queries TestFlight before assigning
the next build number and fails if that query is unavailable.

Publishing uploads for internal TestFlight testing. Both beta review and public
App Store submission are disabled. Once Apple finishes processing, add the build
to an internal testing group in App Store Connect. External testers require a
separate beta review setup. Never commit certificates, provisioning profiles,
Apple API private keys or environment secrets.

Official references: [Capacitor requirements](https://capacitorjs.com/docs/getting-started/environment-setup),
[Preferences](https://capacitorjs.com/docs/apis/preferences),
[Filesystem privacy manifest](https://capacitorjs.com/docs/apis/filesystem),
[Codemagic signing](https://docs.codemagic.io/yaml-code-signing/signing-ios/), and
[App Store Connect publishing](https://docs.codemagic.io/yaml-publishing/app-store-connect/).
