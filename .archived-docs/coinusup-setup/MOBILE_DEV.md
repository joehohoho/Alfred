# Mobile Development Guide

This guide explains how to build and run the Coin Us Up mobile apps (iOS & Android) using Capacitor.

## Prerequisites

Before you begin, ensure you have:

1. **Node.js & npm** (v18+ recommended)
   - Check: `node --version` and `npm --version`

2. **Xcode** (for iOS development)
   - macOS only
   - Install from Mac App Store
   - Includes iOS Simulator
   - Check: `xcodebuild -version`

3. **Android Studio** (for Android development)
   - Download from [developer.android.com](https://developer.android.com/studio)
   - Includes Android SDK and emulator
   - Check: `adb --version`

4. **CocoaPods** (for iOS dependencies)
   - Install: `sudo gem install cocoapods`
   - Check: `pod --version`

## Project Structure

```
CoinUsUp/
├── src/                    # React app source code
├── public/                  # Static assets
├── dist/                    # Built web app (used by Capacitor)
├── ios/                     # iOS native project (generated)
├── android/                 # Android native project (generated)
├── capacitor.config.ts      # Capacitor configuration
├── vite.config.ts           # Vite build configuration
└── package.json             # Dependencies and scripts
```

## Initial Setup (One-Time)

### 1. Install Dependencies

```bash
npm install
```

### 2. Add Capacitor Platforms

```bash
# Add iOS platform (macOS only)
npx cap add ios

# Add Android platform
npx cap add android
```

This creates the `ios/` and `android/` folders with native projects.

## Building for Mobile

### Step 1: Build Web App for Mobile

Build the React app with Capacitor-compatible settings:

```bash
npm run build:app
```

This builds with `base: "./"` (relative paths) which Capacitor needs.

**Note**: Regular `npm run build` is for web deployment (Vercel) and uses `base: "/"`.

### Step 2: Copy Web Assets to Native Projects

```bash
npx cap copy
```

This copies the `dist/` folder contents to `ios/App/App/public/` and `android/app/src/main/assets/public/`.

### Step 3: Sync Native Dependencies

```bash
npx cap sync
```

This:
- Updates native dependencies (CocoaPods for iOS, Gradle for Android)
- Copies web assets
- Updates native project files

**Tip**: Run `npx cap sync` after any `npm install` that adds Capacitor plugins.

## Running the Apps

### iOS (macOS only)

```bash
# Open in Xcode
npx cap open ios

# Then in Xcode:
# 1. Select a simulator or connected device
# 2. Click the Play button (▶️) or press Cmd+R
```

### Android

```bash
# Open in Android Studio
npx cap open android

# Then in Android Studio:
# 1. Wait for Gradle sync to complete
# 2. Select an emulator or connected device
# 3. Click the Run button (▶️) or press Shift+F10
```

## Development Workflow

### Making Frontend Changes

1. **Make changes** to React code in `src/`
2. **Rebuild** for mobile:
   ```bash
   npm run build:app
   ```
3. **Copy assets** to native projects:
   ```bash
   npx cap copy
   ```
4. **Reload in app**:
   - iOS: Shake device/simulator → "Reload"
   - Android: Shake device/emulator → "Reload"
   - Or restart the app

### Making Native Changes

If you modify native code in `ios/` or `android/`:

1. Make changes in Xcode/Android Studio
2. Test in the app
3. **Important**: Native changes are NOT synced back to `dist/`
4. Commit native project files to Git

### Adding Capacitor Plugins

```bash
# Install plugin
npm install @capacitor/camera

# Sync to native projects
npx cap sync

# Rebuild native projects if needed
npx cap open ios
npx cap open android
```

## Configuration

### App Name & Bundle ID

Edit `capacitor.config.ts`:

```typescript
appId: 'com.coinusup.app',  // Change bundle ID here
appName: 'Coin Us Up',      // Change app name here
```

After changing, run:
```bash
npx cap sync
```

### App Icons & Splash Screens

#### iOS

1. Open `ios/App/App.xcworkspace` in Xcode
2. Select `App` target → `General` tab
3. Under `App Icons and Launch Screen`:
   - Drag icon images (1024x1024px recommended)
   - Configure launch screen

Or use [Capacitor Assets](https://capacitorjs.com/docs/guides/splash-screens-and-icons):
```bash
npx cap assets
```

#### Android

1. Open `android/` in Android Studio
2. Navigate to `app/src/main/res/`
3. Replace icon files in `mipmap-*` folders:
   - `ic_launcher.png` (various sizes)
   - `ic_launcher_foreground.png`
   - `ic_launcher_background.png`

Or use Capacitor Assets:
```bash
npx cap assets
```

### Environment Variables

For mobile apps, set environment variables in:

#### iOS
- Edit `ios/App/App/Info.plist` or use Xcode's build settings
- Add custom URL schemes if needed for deep links

#### Android
- Edit `android/app/build.gradle`
- Or use `android/app/src/main/res/values/strings.xml`

**Example**: To set Supabase URL for mobile:
```typescript
// In capacitor.config.ts or native config
// Use Capacitor's Preferences API or native config
```

**Current Setup**: The app uses fallback values from `src/integrations/supabase/client.ts` if env vars aren't set.

## Supabase Auth & Deep Links

### Current Status

The app uses Supabase auth with redirect URLs. For mobile apps, you'll need to configure:

1. **Supabase Dashboard**:
   - Add app scheme URLs: `com.coinusup.app://` (iOS) and `com.coinusup.app` (Android)
   - Add deep link URLs for password reset, email confirmation, etc.

2. **Capacitor Deep Links** (TODO):
   - Configure URL schemes in `capacitor.config.ts`
   - Handle deep links in native code
   - Update auth redirect URLs to use app scheme

**See**: `capacitor.config.ts` has commented-out `intentFilters` for Android deep links.

## Troubleshooting

### iOS Issues

**"No such module 'Capacitor'"**
```bash
cd ios/App
pod install
cd ../..
```

**Build errors**
- Clean build folder: Xcode → Product → Clean Build Folder (Shift+Cmd+K)
- Delete derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData`

### Android Issues

**Gradle sync failed**
```bash
cd android
./gradlew clean
cd ..
npx cap sync
```

**"SDK location not found"**
- Open Android Studio
- File → Project Structure → SDK Location
- Set Android SDK path

### General Issues

**App shows blank screen**
1. Check browser console: `npx cap run ios --livereload` or use Safari Web Inspector
2. Verify `dist/` folder exists and has content
3. Run `npx cap copy` again

**Changes not appearing**
1. Rebuild: `npm run build:app`
2. Copy: `npx cap copy`
3. Reload app (shake device → Reload)

**Service worker errors**
- Service workers are disabled for Capacitor builds (handled by native code)
- If you see SW errors, check `src/main.tsx` - it should detect app builds

## Scripts Reference

| Command | Description |
|--------|-------------|
| `npm run build` | Build for web (Vercel) - uses `base: "/"` |
| `npm run build:app` | Build for mobile (Capacitor) - uses `base: "./"` |
| `npx cap sync` | Sync web assets + native dependencies |
| `npx cap copy` | Copy web assets only (faster) |
| `npx cap open ios` | Open iOS project in Xcode |
| `npx cap open android` | Open Android project in Android Studio |
| `npx cap run ios` | Build and run iOS app |
| `npx cap run android` | Build and run Android app |

## Production Builds

### iOS (App Store)

1. Open `ios/App/App.xcworkspace` in Xcode
2. Select "Any iOS Device" or specific device
3. Product → Archive
4. Distribute App → App Store Connect
5. Follow App Store submission process

### Android (Google Play)

1. Open `android/` in Android Studio
2. Build → Generate Signed Bundle / APK
3. Select "Android App Bundle"
4. Follow Google Play submission process

## Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS Development Guide](https://capacitorjs.com/docs/ios)
- [Android Development Guide](https://capacitorjs.com/docs/android)
- [Capacitor Plugins](https://capacitorjs.com/docs/plugins)

## Notes

- **Web deployment unchanged**: `npm run build` still works for Vercel
- **Single codebase**: All code in `src/` - no platform-specific React code needed
- **Native folders versioned**: `ios/` and `android/` are committed to Git
- **Build artifacts ignored**: Only native build outputs are in `.gitignore`




