# Shipping Wispmere to an iPhone

Everything here needs **macOS with Xcode 15 or newer**. None of it can run in the
Linux container this project was built in — see `VALIDATION.md` for exactly what that
leaves unverified.

## One-time setup

```bash
npm install
npm run build          # produces dist/
npx cap add ios        # generates the ios/ Xcode project (gitignored)
npm run ios:sync       # build + copy the bundle into the native project
npm run ios:open       # opens ios/App/App.xcworkspace
```

`ios/` is deliberately **not** committed. It is generated output: regenerating it is one
command, and committing it means every native-template bump arrives as an unreviewable
diff. The two things that *are* committed are `capacitor.config.ts` and the plist
patches described below, because those carry real decisions.

## Required Info.plist changes

Capacitor's template does not know this is a landscape-only game. In Xcode, open
`App/App/Info.plist` and set:

```xml
<key>UISupportedInterfaceOrientations</key>
<array>
  <string>UIInterfaceOrientationLandscapeLeft</string>
  <string>UIInterfaceOrientationLandscapeRight</string>
</array>

<!-- iPad, if it is ever enabled. Same two orientations. -->
<key>UISupportedInterfaceOrientations~ipad</key>
<array>
  <string>UIInterfaceOrientationLandscapeLeft</string>
  <string>UIInterfaceOrientationLandscapeRight</string>
</array>

<!-- The HUD manages its own spacing from the safe area; the status bar would
     only compete with it. -->
<key>UIStatusBarHidden</key>
<true/>
<key>UIViewControllerBasedStatusBarAppearance</key>
<false/>

<!-- The game already dims itself; nothing here needs to keep the screen awake
     against the user's wishes. Leave idle timer behaviour at the default. -->
```

The web side is already correct: `index.html` carries
`viewport-fit=cover`, and every HUD edge is positioned with
`env(safe-area-inset-*)`, so the Dynamic Island and the home indicator are handled
without any native code.

## Signing and running

1. In Xcode, select the **App** target → **Signing & Capabilities**.
2. Set a Team. For a personal device a free Apple ID works; the App Store needs a paid
   Apple Developer account.
3. Change the bundle identifier from `com.wispmere.game` to something in your own
   namespace, or Xcode will refuse to provision it.
4. Pick a connected iPhone and press Run.

**Never commit** certificates, `.mobileprovision` files, `ExportOptions.plist` or
anything else from signing. `.gitignore` already blocks them.

## What to check on a real device

The container could not do any of this. In rough order of what is most likely to bite:

- [ ] **Frame rate** while walking through the meadow with the camera at maximum zoom.
      Watch the in-game `PerfProbe` readout, or Instruments' Core Animation gauge.
      The renderer starts at `medium` and steps down once if it cannot hold 55 fps.
- [ ] **Thermals** over a ten-minute session. If the phone throttles, force
      `quality: 'low'` in Settings and re-measure to isolate fill rate from geometry.
- [ ] **Touch reachability** — can a thumb hold the stick and reach Dodge without
      shifting grip? Try both handedness settings.
- [ ] **Safe area** on a Dynamic Island device, in *both* landscape orientations.
      The notch swaps sides; the HUD must not shift.
- [ ] **Audio** starts after the first touch, and respects the silent switch.
- [ ] **Backgrounding**: swipe away mid-session, reopen, confirm the save is intact and
      depleted nodes have renewed against the wall clock.
- [ ] **Cold launch time** from tap to first rendered frame.

## Adding Android later

The architecture does not have to change: `npx cap add android` against the same
codebase. That is out of scope for the first version, per the brief, and should not be
added without the owner asking for it.
