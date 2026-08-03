# SuperHesab Android shell

WebView APK that opens **https://app.superhesab.ir/app** (same product as the PWA).

## Prerequisites

1. Deploy SuperHesab to `app.superhesab.ir` (today that host may still serve another app).
2. Fix TLS so the certificate matches `app.superhesab.ir` (required for WebView + installability).
3. JDK 17 + Android SDK (already used by this machine’s Gradle build).

## Build

```bash
# from repo root
npm run apk:debug     # unsigned/debug APK
npm run apk:release   # signed release APK (after keystore setup)
```

Outputs:

- Debug: `android-app/app/build/outputs/apk/debug/app-debug.apk`
- Release: `android-app/app/build/outputs/apk/release/app-release.apk`

## Keystore (first time)

```bash
cd android-app
keytool -genkeypair -v \
  -keystore superhesab-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias superhesab \
  -storepass CHANGE_ME -keypass CHANGE_ME \
  -dname "CN=SuperHesab, OU=Mobile, O=SuperHesab, L=Tehran, C=IR"

cat > keystore.properties <<EOF
storeFile=superhesab-release.jks
storePassword=CHANGE_ME
keyAlias=superhesab
keyPassword=CHANGE_ME
EOF
```

Then publish the SHA-256 of that cert into `public/.well-known/assetlinks.json` on the live site if you later move to TWA / Play Store Digital Asset Links.

## Deep links

`https://app.superhesab.ir/*` opens in the app when installed.
