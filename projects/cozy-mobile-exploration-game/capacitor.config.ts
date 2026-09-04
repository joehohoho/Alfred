import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor wraps the built bundle in a native Xcode project.
 *
 * The game is fully offline: `webDir` is the built `dist/`, there is no
 * `server.url`, and nothing in the app reaches the network. Save data lives in
 * the WKWebView's `localStorage`, which iOS persists with the app.
 */
const config: CapacitorConfig = {
  appId: 'com.wispmere.game',
  appName: 'Wispmere',
  webDir: 'dist',
  // Loopback keeps `localStorage` on a stable origin across app updates.
  // Without it a scheme change would orphan the player's save.
  ios: {
    scheme: 'wispmere',
    contentInset: 'never',
    // The game draws its own background; a white flash between the splash and
    // the first rendered frame is jarring on a warm-toned title.
    backgroundColor: '#d6ecf3',
    limitsNavigationsToAppBoundDomains: true,
  },
  server: {
    // Serving from a custom scheme rather than capacitor:// avoids the
    // file:// CORS restrictions that would block module scripts.
    iosScheme: 'wispmere',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#d6ecf3',
      showSpinner: false,
    },
  },
};

export default config;
