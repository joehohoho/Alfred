# iOS Xcode Setup Guide

The iOS project has been created and synced! However, you need to complete a few setup steps before you can test in Xcode.

## Current Status
✅ Web app built for Capacitor  
✅ iOS platform added  
✅ Web assets synced to iOS project  
⚠️ CocoaPods not installed  
⚠️ Xcode developer directory not set  

## Steps to Complete Setup

### Step 1: Set Xcode as Active Developer Directory

If you have Xcode installed, run:
```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

If Xcode is installed in a different location, adjust the path accordingly.

### Step 2: Install CocoaPods

CocoaPods is required to manage iOS dependencies:
```bash
sudo gem install cocoapods
```

### Step 3: Install iOS Dependencies

Navigate to the iOS app directory and install pods:
```bash
cd ios/App
pod install
cd ../..
```

### Step 4: Open in Xcode

You can now open the project:
```bash
npx cap open ios
```

Or manually open:
```bash
open ios/App/App.xcworkspace
```

**Important**: Always open the `.xcworkspace` file, not the `.xcodeproj` file when using CocoaPods.

## Testing in Xcode

1. Open the project in Xcode (using the commands above)
2. Select a simulator or connected device from the device menu
3. Click the Play button (▶️) or press `Cmd+R` to build and run
4. The app should launch in the simulator/device

## Troubleshooting

### If CocoaPods installation fails:
- Make sure you have Ruby installed: `ruby --version`
- You may need to use `sudo` for gem installation
- On newer macOS versions, you might need: `sudo gem install -n /usr/local/bin cocoapods`

### If Xcode is not found:
- Make sure Xcode is installed from the App Store
- Check if it's in `/Applications/Xcode.app`
- You may need to accept the Xcode license: `sudo xcodebuild -license accept`

### If pod install fails:
- Make sure you're in the `ios/App` directory
- Try: `pod repo update` first
- Then: `pod install --repo-update`

## Quick Commands Reference

```bash
# Build web app for Capacitor
npm run build:app

# Sync web assets to iOS
npx cap sync

# Open in Xcode
npx cap open ios

# Install pods (from ios/App directory)
cd ios/App && pod install
```
