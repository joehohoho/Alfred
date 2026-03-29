# How to Clear App Data on Android Emulator

## Detailed Step-by-Step Instructions

### Method 1: Using Android Settings (Recommended)

#### Step 1: Open Settings
1. On your Android emulator, look for the **Settings** app icon
   - It looks like a gear/cog icon ⚙️
   - Usually found in the app drawer or on the home screen
   - You can also swipe down from the top and tap the gear icon in the notification panel

#### Step 2: Navigate to Apps
1. In Settings, scroll down and find **Apps** (or **Applications**)
   - On some Android versions, it might be called **Apps & notifications** or **Application manager**
   - Tap on it

#### Step 3: Find Coin Us Up App
1. You'll see a list of all installed apps
2. Scroll through the list to find **Coin Us Up**
   - Apps are usually listed alphabetically
   - You can also use the search bar at the top if available
3. Tap on **Coin Us Up** to open its details

#### Step 4: Access Storage Settings
1. In the app details screen, you'll see several options:
   - **Force stop**
   - **Uninstall**
   - **Storage** ← Tap this one
   - **Permissions**
   - **Notifications**
   - etc.

#### Step 5: Clear Data
1. In the Storage screen, you'll see:
   - **App size** (how much space the app uses)
   - **User data** (your app data)
   - **Cache** (temporary files)
   
2. You'll see buttons at the bottom:
   - **Clear cache** - Removes temporary files (might not be enough)
   - **Clear storage** or **Clear data** ← Tap this one
   - This removes ALL app data including cached web assets

3. A confirmation dialog will appear:
   - It will warn you that this will delete all app data
   - Tap **OK** or **Delete** to confirm

#### Step 6: Reopen the App
1. Go back to your home screen
2. Find the **Coin Us Up** app icon
3. Tap to open it
4. The app will start fresh with the latest build

---

### Method 2: Using App Info Shortcut (Faster)

#### Step 1: Long Press App Icon
1. On your home screen or app drawer
2. Find the **Coin Us Up** app icon
3. **Long press** (hold down) on the icon
4. A menu will appear

#### Step 2: Select App Info
1. In the menu, look for **App info** or **ℹ️** icon
2. Tap on it
3. This takes you directly to the app's settings page

#### Step 3: Follow Steps 4-6 from Method 1
- Tap **Storage**
- Tap **Clear data**
- Confirm
- Reopen the app

---

### Method 3: Using ADB Command Line (Advanced)

If you have ADB (Android Debug Bridge) installed:

```powershell
# Connect to emulator
adb devices

# Clear app data
adb shell pm clear com.coinusup.app

# Or uninstall and reinstall
adb uninstall com.coinusup.app
cd android
.\gradlew.bat installDebug
```

---

## Visual Guide (What You'll See)

### Settings Screen
```
┌─────────────────────────┐
│  ⚙️ Settings            │
├─────────────────────────┤
│  Network & internet     │
│  Connected devices      │
│  Apps                   │ ← Tap here
│  Notifications         │
│  ...                    │
└─────────────────────────┘
```

### Apps Screen
```
┌─────────────────────────┐
│  Apps                   │
├─────────────────────────┤
│  📧 Calendar            │
│  📱 Coin Us Up          │ ← Tap here
│  📞 Contacts            │
│  ...                    │
└─────────────────────────┘
```

### App Details Screen
```
┌─────────────────────────┐
│  Coin Us Up             │
├─────────────────────────┤
│  Force stop             │
│  Uninstall              │
│  Storage                │ ← Tap here
│  Permissions            │
│  Notifications          │
└─────────────────────────┘
```

### Storage Screen
```
┌─────────────────────────┐
│  Storage                │
├─────────────────────────┤
│  App size: 45 MB        │
│  User data: 12 MB       │
│  Cache: 2 MB            │
│                         │
│  [Clear cache]           │
│  [Clear storage]        │ ← Tap here
└─────────────────────────┘
```

---

## Troubleshooting

### Can't Find Settings?
- Swipe down from the top of the screen
- Tap the gear icon ⚙️ in the notification panel
- Or search for "Settings" in the app drawer

### Can't Find the App?
- Make sure the app is installed
- Check if it's in a folder on your home screen
- Use the search function in Settings → Apps

### Clear Data Button Grayed Out?
- The app might be running
- Go back and tap **Force stop** first
- Then try clearing data again

### Still Seeing Old Content?
1. Make sure you cleared **Data**, not just **Cache**
2. Try uninstalling and reinstalling:
   - Settings → Apps → Coin Us Up → Uninstall
   - Then reinstall from Android Studio (Shift+F10)

---

## What Gets Cleared

When you clear app data, you'll lose:
- ✅ Cached web assets (this is what we want!)
- ✅ Login session (you'll need to log in again)
- ✅ Any locally stored preferences
- ✅ Offline data

**You WON'T lose:**
- Data stored on the server (Supabase)
- Your account information
- Organization data

---

## After Clearing Data

1. **First Launch:**
   - App will start fresh
   - You'll need to log in again
   - All web assets will reload from the latest build

2. **Verify Changes:**
   - Check Volunteer Shifts page - button should be visible
   - Check sticky header - should stay fixed when scrolling
   - Check horizontal scrolling - should be fixed

---

## Quick Reference

**Fastest Method:**
1. Long press app icon → App info → Storage → Clear data → OK

**Most Reliable Method:**
1. Settings → Apps → Coin Us Up → Storage → Clear data → OK

**Command Line Method:**
```powershell
adb shell pm clear com.coinusup.app
```





