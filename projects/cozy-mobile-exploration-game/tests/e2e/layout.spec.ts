import { expect, test, type Locator, type Page } from '@playwright/test';
import { drive, pump } from './helpers.ts';

/**
 * Touch layout on a landscape iPhone.
 *
 * The brief is specific about this: the HUD must be safe-area aware, scalable,
 * usable left- or right-handed, and it must never cover the player or the
 * middle of the play area. Those are all measurable, so they are measured here
 * rather than eyeballed in a screenshot.
 */

const HUD_SELECTORS = [
  '.stick-zone',
  '.action-cluster',
  '.journey',
  '.vitality',
  '.btn-pause',
] as const;

async function boxOf(page: Page, selector: string) {
  const box = await page.locator(selector).boundingBox();
  expect(box, `${selector} should be laid out`).not.toBeNull();
  return box!;
}

test.describe('HUD layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.wispmere), null, { timeout: 30_000 });
    await drive(page, 'g.resetProgress();', 10);
  });

  test('keeps every control inside the viewport and the safe area', async ({ page }) => {
    const viewport = page.viewportSize()!;
    // Simulate a notch: the real insets are zero in a desktop browser, so we
    // set them explicitly and check the HUD actually respects them.
    await page.addStyleTag({
      content: `:root { --safe-top: 12px; --safe-bottom: 21px; --safe-left: 59px; --safe-right: 59px; }`,
    });
    await pump(page, 6);

    for (const selector of HUD_SELECTORS) {
      const box = await boxOf(page, selector);
      expect(box.x, `${selector} crosses the left safe inset`).toBeGreaterThanOrEqual(58);
      expect(box.y, `${selector} crosses the top safe inset`).toBeGreaterThanOrEqual(11);
      expect(
        box.x + box.width,
        `${selector} crosses the right safe inset`,
      ).toBeLessThanOrEqual(viewport.width - 58);
      expect(
        box.y + box.height,
        `${selector} crosses the bottom safe inset`,
      ).toBeLessThanOrEqual(viewport.height - 20);
    }
  });

  test('never covers the player', async ({ page }) => {
    // The brief's actual requirement is that the HUD must not obscure the
    // player or the interactions around them. So measure that directly: take
    // the player's real projected screen position and require a clear disc
    // around it, rather than guessing at a rectangle.
    //
    // A fixed rectangle was the first attempt and it was the wrong tool — the
    // Journey card legitimately reaches a third of the way down the right-hand
    // side of a 343pt-tall screen, which no honest rectangle can both allow and
    // still be a meaningful check.
    // At the default zoom the character is about 31px tall and 18px wide on a
    // 343pt screen. 60px from their centre point therefore leaves roughly a
    // character-and-a-half of clear space in every direction — comfortably
    // "not obscuring the player", and still tight enough that a card drifting
    // toward the middle fails this test.
    const KEEP_CLEAR = 60;

    const player = await page.evaluate(() => {
      const game = window.wispmere;
      const canvas = document.getElementById('stage') as HTMLCanvasElement;
      const ndc = game.camera.project(
        game.player.position.x,
        game.player.position.y + 0.6,
        game.player.position.z,
      );
      return {
        x: ((ndc.x + 1) / 2) * canvas.clientWidth,
        y: ((1 - ndc.y) / 2) * canvas.clientHeight,
      };
    });

    for (const selector of HUD_SELECTORS) {
      const box = await boxOf(page, selector);
      // Distance from the player's screen point to the nearest point of the box.
      const dx = Math.max(box.x - player.x, 0, player.x - (box.x + box.width));
      const dy = Math.max(box.y - player.y, 0, player.y - (box.y + box.height));
      const distance = Math.hypot(dx, dy);
      expect(
        distance,
        `${selector} comes within ${KEEP_CLEAR}px of the player at (${player.x.toFixed(0)}, ${player.y.toFixed(0)})`,
      ).toBeGreaterThan(KEEP_CLEAR);
    }
  });

  test('keeps the vertical centre line free of chrome', async ({ page }) => {
    // Nothing persistent may sit dead centre horizontally, where the player
    // walks. The interact prompt is deliberately excluded: it is transient, it
    // appears below the play area, and being centred is the point.
    const viewport = page.viewportSize()!;
    const band = { left: viewport.width * 0.44, right: viewport.width * 0.56 };

    for (const selector of HUD_SELECTORS) {
      const box = await boxOf(page, selector);
      const crosses = box.x < band.right && box.x + box.width > band.left;
      expect(crosses, `${selector} sits across the vertical centre line`).toBe(false);
    }
  });

  test('swaps the stick and the action cluster for left- or right-handed play', async ({ page }) => {
    const viewport = page.viewportSize()!;

    await drive(page, "g.applySettings({ handedness: 'left' });", 6);
    const leftStick = await boxOf(page, '.stick-zone');
    const leftCluster = await boxOf(page, '.action-cluster');
    expect(leftStick.x).toBeLessThan(viewport.width / 2);
    expect(leftCluster.x).toBeGreaterThan(viewport.width / 2);

    await drive(page, "g.applySettings({ handedness: 'right' });", 6);
    const rightStick = await boxOf(page, '.stick-zone');
    const rightCluster = await boxOf(page, '.action-cluster');
    expect(rightStick.x).toBeGreaterThan(viewport.width / 2);
    expect(rightCluster.x).toBeLessThan(viewport.width / 2);
  });

  test('scales the interface without pushing anything off screen', async ({ page }) => {
    const viewport = page.viewportSize()!;
    const small = await boxOf(page, '.btn-attack');

    await drive(page, 'g.applySettings({ uiScale: 1.4 });', 6);
    const large = await boxOf(page, '.btn-attack');
    expect(large.width).toBeGreaterThan(small.width);

    for (const selector of HUD_SELECTORS) {
      const box = await boxOf(page, selector);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 0.5);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 0.5);
      expect(box.x).toBeGreaterThanOrEqual(-0.5);
    }
  });

  test('every touch target is large enough to hit with a thumb', async ({ page }) => {
    // 44pt is Apple's minimum; the stick is much larger by design.
    for (const selector of ['.btn-attack', '.btn-interact', '.btn-dodge', '.btn-pause', '.btn-zoom']) {
      const box = await boxOf(page, selector);
      expect(Math.min(box.width, box.height), `${selector} is too small to tap`).toBeGreaterThanOrEqual(44);
    }
  });

  test('the on-screen controls actually drive the game', async ({ page }) => {
    const attack: Locator = page.locator('.btn-attack');
    const before = await page.evaluate(() => window.wispmere.player.swinging);
    expect(before).toBe(false);

    await attack.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch' });
    await pump(page, 3);
    expect(await page.evaluate(() => window.wispmere.input.state.attackHeld)).toBe(true);
    await attack.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'touch' });
    await pump(page, 3);
    expect(await page.evaluate(() => window.wispmere.input.state.attackHeld)).toBe(false);

    // Dragging the stick moves the player.
    const stick = await boxOf(page, '.stick-zone');
    const centre = { x: stick.x + stick.width / 2, y: stick.y + stick.height / 2 };
    const start = await page.evaluate(() => ({ ...window.wispmere.player.position }));
    await page.locator('.stick-zone').dispatchEvent('pointerdown', {
      pointerId: 2, pointerType: 'touch', clientX: centre.x, clientY: centre.y,
    });
    await page.locator('.stick-zone').dispatchEvent('pointermove', {
      pointerId: 2, pointerType: 'touch', clientX: centre.x, clientY: centre.y - stick.height / 2,
    });
    await pump(page, 40);
    await page.locator('.stick-zone').dispatchEvent('pointerup', {
      pointerId: 2, pointerType: 'touch', clientX: centre.x, clientY: centre.y - stick.height / 2,
    });

    const moved = await page.evaluate(() => ({ ...window.wispmere.player.position }));
    const travelled = Math.hypot(moved.x - start.x, moved.z - start.z);
    expect(travelled, 'dragging the virtual stick should move the player').toBeGreaterThan(0.5);
  });

  test('the pause panel opens, exposes the reset, and closes', async ({ page }) => {
    await page.locator('.btn-pause').click();
    await pump(page, 4);
    expect(await page.evaluate(() => window.wispmere.paused)).toBe(true);
    await expect(page.locator('.panel-scrim')).toHaveAttribute('data-open', 'true');
    await expect(page.getByText('Start over')).toBeVisible();
    await expect(page.getByText('Reduced motion')).toBeVisible();
    await expect(page.getByText('High contrast')).toBeVisible();
    await page.screenshot({ path: 'screenshots/hud-settings.png' });

    await page.getByText('Back to the meadow').click();
    await pump(page, 4);
    expect(await page.evaluate(() => window.wispmere.paused)).toBe(false);
  });
});
