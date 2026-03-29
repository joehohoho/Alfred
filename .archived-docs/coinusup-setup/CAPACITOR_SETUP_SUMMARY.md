# Capacitor Integration Summary

## ✅ Changes Made

### Files Modified

1. **`vite.config.ts`**
   - Added `vite-plugin-pwa` integration (web builds only)
   - Added build target support (`VITE_BUILD_TARGET=app` for Capacitor)
   - Dynamic `base` path: `/` for web, `./` for app
   - PWA plugin disabled for app builds (Capacitor handles native features)

2. **`package.json`**
   - Added Capacitor dependencies:
     - `@capacitor/core`
     - `@capacitor/cli`
     - `@capacitor/ios`
     - `@capacitor/android`
   - Added `vite-plugin-pwa` dev dependency
   - Added new scripts:
     - `build:app` - Build for Capacitor
     - `cap:sync` - Sync web assets + native deps
     - `cap:copy` - Copy web assets only
     - `cap:open:ios` - Open iOS project
     - `cap:open:android` - Open Android project

3. **`capacitor.config.ts`** (NEW)
   - App ID: `com.coinusup.app`
   - App Name: `Coin Us Up`
   - Web directory: `dist`
   - Splash screen configuration
   - TODO comments for deep links

4. **`src/integrations/supabase/client.ts`**
   - Updated to use env vars with fallbacks
   - Supports `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - Backwards compatible with hardcoded values

5. **`src/main.tsx`**
   - Conditional service worker registration
   - Disabled for app builds (Capacitor mode)

6. **`src/contexts/AuthContext.tsx`**
   - Added TODO comment for deep link redirects

7. **`src/components/auth/AuthPage.tsx`**
   - Added TODO comment for deep link redirects

8. **`.gitignore`**
   - Added Capacitor build artifacts
   - **Note**: `ios/` and `android/` folders ARE versioned (not ignored)

9. **`MOBILE_DEV.md`** (NEW)
   - Complete mobile development guide

## 🔧 Configuration Details

### Build Targets

- **Web** (`npm run build`): `base: "/"` - For Vercel deployment
- **App** (`npm run build:app`): `base: "./"` - For Capacitor

### PWA Plugin

- **Web builds**: Uses `vite-plugin-pwa` for automatic service worker generation
- **App builds**: PWA plugin disabled (Capacitor provides native features)

### Service Worker

- **Web**: Auto-registered by `vite-plugin-pwa`
- **App**: Disabled (not needed in Capacitor)

## ⚠️ Known TODOs

1. **Supabase Deep Links**: Configure redirect URLs for mobile apps
   - Add app scheme URLs in Supabase dashboard
   - Implement deep link handling in Capacitor
   - Update auth redirect URLs to use app scheme

2. **Environment Variables**: Consider setting Supabase env vars in native projects
   - iOS: `Info.plist` or build settings
   - Android: `build.gradle` or `strings.xml`

3. **App Icons**: Generate and configure native app icons
   - Use `npx cap assets` or manually configure in Xcode/Android Studio

## 📝 Next Steps

See `MOBILE_DEV.md` for detailed instructions on:
- Building the mobile apps
- Running on simulators/devices
- Configuring app icons and splash screens
- Handling deep links
- Production builds




