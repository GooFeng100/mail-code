# UniApp Build and Hot Update Guide

## 1. H5 Deployment

- Build command:

```bash
npm run build:h5
```

- H5 keeps using `/api` and relies on Nginx reverse proxy.

## 2. Android First Release

- First APK release still requires HBuilderX cloud packaging (or offline native packaging).
- Keep `appid` fixed as `__UNI__A2B057E`.

## 3. What Can Use WGT Hot Update

- Page updates, JS logic changes, CSS style changes, API call logic changes.
- These can be released as `wgt` without rebuilding full APK.

## 4. Cloud Server WGT Build Flow (CLI)

```bash
cd /opt/apps/mail-code-app/repo/uniapp
npm run build:app-plus
cd dist/build/app-plus
zip -r /opt/apps/mail-code-app/app-updates/__UNI__A2B057E-1.0.1.wgt ./*
```

- Important: zip only the **inside files** of `app-plus`.
- Do not zip the outer `app-plus` directory itself.

If your current uni build output is `dist/build/app`, use:

```bash
cd /opt/apps/mail-code-app/repo/uniapp
npm run build:app
cd dist/build/app
zip -r /opt/apps/mail-code-app/app-updates/__UNI__A2B057E-1.0.1.wgt ./*
```

## 5. Server Files to Update

- `/opt/apps/mail-code-app/app-updates/version.json`
- `/opt/apps/mail-code-app/app-updates/__UNI__A2B057E-1.0.1.wgt`

Online URL:

- `https://m.889100.xyz/app-updates/version.json`

## 6. version.json Example

```json
{
  "wgtVersion": "1.0.1",
  "wgtUrl": "https://m.889100.xyz/app-updates/__UNI__A2B057E-1.0.1.wgt",
  "apkVersion": "1.0.0",
  "apkUrl": "",
  "force": false,
  "note": "Fix some issues"
}
```

## 7. Version Rules

- `versionName` is for hot update resource version. Increase each hot update.
  - Example: `1.0.0` -> `1.0.1` -> `1.0.2`
- `versionCode` is for full APK package. Increase only when republishing APK.
  - Example: `100` -> `101` -> `102`

## 8. Cases That Must Rebuild APK

- Change app icon
- Change app name
- Change Android package name
- Change permissions
- Add native plugin
- Change native SDK
- Change manifest settings that affect native packaging

## 9. API Base Strategy by Platform

- H5: `/api`
- APP-PLUS: `https://m.889100.xyz/api`
- MP-WEIXIN: `https://m.889100.xyz/api`
