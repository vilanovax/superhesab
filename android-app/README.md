# SuperHesab Android shell

WebView APK that opens **https://app.superhesab.ir/app** (same product as the PWA).

Package: `ir.superhesab.app` — signed with the release keystore (keep `superhesab-release.jks` forever; Bazaar updates must use the same key).

## Prerequisites

1. SuperHesab must be live at `https://app.superhesab.ir`.
2. JDK 17 + Android SDK (this machine already has them).
3. `android-app/keystore.properties` and `android-app/superhesab-release.jks` (gitignored).

## Build

```bash
# from repo root
npm run apk:debug     # debug APK (package ir.superhesab.app.debug)
npm run apk:release   # signed release APK for sideload + Bazaar
npm run apk:bundle    # signed AAB (Bazaar also accepts this)
```

Outputs:

- Debug: `android-app/app/build/outputs/apk/debug/app-debug.apk`
- Release APK: `android-app/dist/superhesab-release.apk`
- Release AAB: `android-app/dist/superhesab-release.aab`

## Install on a phone

1. Copy `android-app/dist/superhesab-release.apk` to the phone.
2. On the phone: allow install from this source, then open the APK.
3. First launch needs internet; the app loads the live site.

## Cafe Bazaar (بازار)

1. Developer account at [pishkhan.cafebazaar.ir](https://pishkhan.cafebazaar.ir).
2. Upload **APK** or **AAB** (`superhesab-release.apk` / `.aab`).
3. Package name must stay `ir.superhesab.app`.
4. Every update: bump `versionCode` in `app/build.gradle.kts` (never reuse; never sign with a different key).
5. Do not upload the debug APK (it has `.debug` suffix and a different signature).

## Keystore (already created on this machine)

If you must recreate it (only if the original `.jks` is lost — that also means you cannot update the Bazaar listing):

```bash
cd android-app
keytool -genkeypair -v \
  -keystore superhesab-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias superhesab \
  -storepass CHANGE_ME -keypass CHANGE_ME \
  -dname "CN=SuperHesab, OU=Mobile, O=SuperHesab, L=Tehran, C=IR"
```

Then publish the SHA-256 of that cert into `public/.well-known/assetlinks.json`.

## Deep links

`https://app.superhesab.ir/*` opens in the app when installed.
