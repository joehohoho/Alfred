/**
 * Manual visual check: boots the built game in headless Chromium at an iPhone
 * landscape viewport and writes screenshots.
 *
 * WebGL in headless Chromium runs on SwiftShader (software), so this verifies
 * *composition and art* — what is drawn and where — not real device
 * performance. See docs/VALIDATION.md.
 */
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = new URL('../dist/', import.meta.url).pathname;
const PORT = 4180;
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (request, response) => {
  const path = (request.url ?? '/').split('?')[0];
  const file = join(ROOT, normalize(path === '/' ? '/index.html' : path));
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end('not found');
  }
});

await new Promise((resolve) => server.listen(PORT, resolve));

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: [
    // Root container: Chromium's sandbox will not start. Only our own bundle
    // from localhost is ever loaded.
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
});

// iPhone 15 Pro, landscape.
const context = await browser.newContext({
  viewport: { width: 852, height: 393 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
page.on('console', (message) => {
  if (message.type() === 'error') console.log('[page error]', message.text());
});
page.on('pageerror', (error) => console.log('[page exception]', error.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

const shots = JSON.parse(process.argv[2] ?? '[]');
if (shots.length === 0) {
  await page.screenshot({ path: 'screenshots/00-boot.png' });
  console.log('wrote screenshots/00-boot.png');
} else {
  for (const shot of shots) {
    if (shot.eval) await page.evaluate(shot.eval);
    if (shot.wait) await page.waitForTimeout(shot.wait);
    await page.screenshot({ path: `screenshots/${shot.name}.png` });
    console.log(`wrote screenshots/${shot.name}.png`);
  }
}

await browser.close();
server.close();
