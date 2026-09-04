import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end configuration.
 *
 * Runs against the *production build*, not the dev server, so the tests
 * exercise the same bundle that would be wrapped by Capacitor and shipped.
 *
 * The viewport is an iPhone 15 Pro in landscape, because that is the delivery
 * target and because landscape is the shape that actually breaks HUD layouts.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  // The route test plays the entire arc — two boss-free fights, a guardian, and
  // every restoration — on a software rasteriser, where a frame costs ~100ms
  // rather than ~2ms. Generous on purpose; it is one test, run deliberately.
  timeout: 300_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'iphone-landscape',
      use: {
        // Real iPhone metrics: a 734x343 usable landscape viewport, touch input
        // and a Safari user agent.
        ...devices['iPhone 15 Pro landscape'],
        // The descriptor's `defaultBrowserType` is webkit, which is not
        // installed in this container — and silently launching the Chromium
        // binary with WebKit's protocol fails with an unhelpful
        // "browser has been closed". Pin it explicitly.
        //
        // Honest limitation: iOS ships WebKit, so this verifies layout,
        // behaviour and WebGL2 composition, not Safari-specific rendering.
        // See docs/VALIDATION.md.
        browserName: 'chromium',
        // 3x on a software rasteriser is ~2200x1030 per frame, which makes the
        // route test crawl. 2x still exercises retina layout.
        deviceScaleFactor: 2,
        launchOptions: {
          // Headless Chromium has no GPU here; ANGLE's SwiftShader backend
          // gives us a real WebGL2 context in software. This validates
          // composition and behaviour, never device performance.
          executablePath: '/opt/pw-browsers/chromium',
          args: [
            // This container runs as root, where Chromium's sandbox refuses to
            // start. Safe here: the browser only ever loads our own bundle from
            // localhost.
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--enable-unsafe-swiftshader',
            '--ignore-gpu-blocklist',
          ],
        },
      },
    },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
