# Android Testing Guide

Complete guide for testing the Coin Us Up Android app using Capacitor.

## Prerequisites

### 1. Install Android Studio

1. Download from [developer.android.com/studio](https://developer.android.com/studio)
2. Run the installer and follow the setup wizard
3. During installation, make sure to install:
   - Android SDK
   - Android SDK Platform-Tools
   - Android Emulator
   - At least one Android Virtual Device (AVD)

### 2. Verify Installation

Open PowerShell and check:

```powershell
# Check if adb (Android Debug Bridge) is available
adb --version

# Check if Android SDK is configured
# If this fails, you may need to add Android SDK to your PATH
```

### 3. Set Up Android SDK Path (if needed)

If `adb` is not found, add Android SDK to your PATH:

1. Open Android Studio
2. Go to **File → Settings** (or **Android Studio → Preferences** on macOS)
3. Navigate to **Appearance & Behavior → System Settings → Android SDK**
4. Note the **Android SDK Location** (e.g., `C:\Users\YourName\AppData\Local\Android\Sdk`)
5. Add these to your system PATH:
   - `%ANDROID_HOME%\platform-tools` (or `$ANDROID_HOME/platform-tools` on macOS/Linux)
   - `%ANDROID_HOME%\tools` (or `$ANDROID_HOME/tools` on macOS/Linux)

Or set environment variable:
```powershell
# PowerShell (run as Administrator or add to your profile)
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\YourName\AppData\Local\Android\Sdk', 'User')
```

## Initial Setup (One-Time)

### Step 1: Install Dependencies

```powershell
npm install
```

### Step 2: Add Android Platform

```powershell
npx cap add android
```

This creates the `android/` folder with the Android project.

### Step 3: Build Web App for Mobile

```powershell
npm run build:app
```

### Step 4: Sync to Android Project

```powershell
npx cap sync
```

## Testing Methods

### Method 1: Android Emulator (Recommended for First Test)

#### Create an Android Virtual Device (AVD)

1. Open Android Studio
2. Click **More Actions → Virtual Device Manager** (or **Tools → Device Manager**)
3. Click **Create Device**
4. Select a device (e.g., **Pixel 5** or **Pixel 6**)
5. Click **Next**
6. Select a system image (e.g., **API 33** or **API 34** - latest stable)
   - If not installed, click **Download** next to the system image
7. Click **Next**
8. Review configuration and click **Finish**

#### Run App on Emulator

**Option A: Using Android Studio (Easiest)**

```powershell
# Open Android project
npx cap open android
```

Then in Android Studio:
1. Wait for Gradle sync to complete (bottom status bar)
2. Start your emulator:
   - Click **Device Manager** tab (right side)
   - Click **Play** button (▶️) next to your AVD
   - Wait for emulator to boot
3. Select the running emulator from the device dropdown (top toolbar)
4. Click **Run** button (▶️) or press `Shift+F10`
5. Wait for the app to build and install

**Option B: Using Command Line**

```powershell
# Start emulator (if not already running)
# Open Android Studio → Device Manager → Start your AVD

# Build and run directly
npx cap run android
```

### Method 2: Physical Android Device

#### Enable Developer Options

1. On your Android device, go to **Settings → About Phone**
2. Tap **Build Number** 7 times
3. Go back to **Settings → System → Developer Options**
4. Enable:
   - **USB Debugging**
   - **Stay Awake** (optional, keeps screen on while charging)

#### Connect Device

1. Connect your device via USB
2. On your device, when prompted, tap **Allow USB Debugging**
3. Verify connection:

```powershell
adb devices
```

You should see your device listed, e.g.:
```
List of devices attached
ABC123XYZ    device
```

#### Run App on Device

```powershell
# Open Android project
npx cap open android
```

Then in Android Studio:
1. Select your connected device from the device dropdown
2. Click **Run** button (▶️) or press `Shift+F10`

Or use command line:
```powershell
npx cap run android
```

## Development Workflow

### Making Changes and Testing

1. **Make changes** to React code in `src/`
2. **Rebuild** for mobile:
   ```powershell
   npm run build:app
   ```
3. **Copy assets** to Android project:
   ```powershell
   npx cap copy
   ```
4. **Reload app**:
   - Shake device/emulator → Tap **Reload**
   - Or restart the app from Android Studio

### Hot Reload (Faster Development)

For faster iteration, you can use Capacitor's live reload:

1. **Start Vite dev server** (in one terminal):
   ```powershell
   npm run dev
   ```

2. **Configure Capacitor for dev server** (temporary):
   - Edit `capacitor.config.ts`
   - Uncomment the `server` section:
   ```typescript
   server: {
     url: 'http://localhost:8080',
     cleartext: true
   },
   ```

3. **Sync**:
   ```powershell
   npx cap sync
   ```

4. **Run app**:
   ```powershell
   npx cap run android
   ```

5. **Make changes** - they'll appear automatically!

**Note**: Remember to comment out the `server` section before building for production.

## Debugging

### View Console Logs

**Option 1: Android Studio Logcat**

1. Open Android Studio with your project
2. Run the app
3. Open **Logcat** tab (bottom panel)
4. Filter by your app: Select **app** from the dropdown
5. Look for JavaScript errors (they'll be prefixed with `chromium:` or `console:`)

**Option 2: Chrome DevTools (Recommended)**

1. Connect device/emulator
2. Run the app
3. Open Chrome browser
4. Navigate to `chrome://inspect`
5. Under **Remote Target**, find your app
6. Click **Inspect**
7. You'll see the full Chrome DevTools with:
   - Console (JavaScript errors)
   - Network tab (API calls)
   - Elements (DOM inspection)
   - Sources (debugging)

**Option 3: ADB Logcat**

```powershell
# View all logs
adb logcat

# Filter for JavaScript/WebView errors
adb logcat | Select-String -Pattern "chromium|console|WebView"

# Clear logs and start fresh
adb logcat -c
adb logcat
```

### Common Issues & Solutions

#### Issue: "SDK location not found"

**Solution:**
1. Open Android Studio
2. **File → Project Structure → SDK Location**
3. Set Android SDK path (e.g., `C:\Users\YourName\AppData\Local\Android\Sdk`)
4. Click **Apply**

#### Issue: Gradle sync failed

**Solution:**
```powershell
cd android
.\gradlew clean
cd ..
npx cap sync
```

#### Issue: App shows blank screen

**Checklist:**
1. Verify `dist/` folder exists and has content:
   ```powershell
   dir dist
   ```
2. Rebuild and copy:
   ```powershell
   npm run build:app
   npx cap copy
   ```
3. Check Chrome DevTools (`chrome://inspect`) for JavaScript errors
4. Verify Supabase URLs are correct (check network tab)

#### Issue: "Build failed" or "Gradle build failed"

**Solution:**
1. Open Android Studio
2. **File → Invalidate Caches → Invalidate and Restart**
3. Wait for Gradle sync
4. Try running again

#### Issue: Emulator is slow

**Solutions:**
1. Enable hardware acceleration in Android Studio
2. Allocate more RAM to emulator (AVD Manager → Edit → Show Advanced Settings)
3. Use a physical device for faster testing

#### Issue: App crashes on startup

**Debug steps:**
1. Check Logcat in Android Studio for native errors
2. Check Chrome DevTools (`chrome://inspect`) for JavaScript errors
3. Verify all dependencies are installed:
   ```powershell
   npm install
   npx cap sync
   ```

## Testing Checklist

After running the app, verify:

- [ ] App launches without crashes
- [ ] Landing page loads correctly
- [ ] Navigation works (try different routes)
- [ ] Login/Signup forms work
- [ ] Supabase authentication works
- [ ] API calls succeed (check Network tab)
- [ ] Images load correctly
- [ ] Forms submit successfully
- [ ] No console errors (check Chrome DevTools)
- [ ] App works in both portrait and landscape (if supported)

## Quick Commands Reference

```powershell
# Build for Android
npm run build:app

# Sync to Android
npx cap sync

# Copy assets only (faster)
npx cap copy

# Open Android Studio
npx cap open android

# Run on connected device/emulator
npx cap run android

# Check connected devices
adb devices

# View logs
adb logcat

# Clear app data (useful for testing)
adb shell pm clear com.coinusup.app
```

## Next Steps

- Test on multiple Android versions (API 28+)
- Test on different screen sizes
- Configure app icons and splash screens
- Set up deep links for Supabase auth
- Prepare for Google Play Store submission

## Additional Resources

- [Capacitor Android Guide](https://capacitorjs.com/docs/android)
- [Android Studio User Guide](https://developer.android.com/studio/intro)
- [Chrome DevTools for Mobile](https://developer.chrome.com/docs/devtools/remote-debugging/)



