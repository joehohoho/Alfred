import type { Page } from '@playwright/test';

/**
 * Test-side view of the game handle the build exposes on `window.wispmere`.
 * Only the members these tests touch are declared.
 */
export interface GameHandle {
  state: {
    pouch: Record<string, number>;
    flags: Record<string, boolean>;
    playerHealth: number;
    returnPoint: string;
    weapon: string;
    nodes: Record<string, { depletedAt: number | null }>;
    settings: Record<string, unknown>;
    regionsSeen: string[];
  };
  journey: { step: string; title: string; ready: boolean };
  prompt: { kind: string; blocked?: string; verb: string } | null;
  paused: boolean;
}

export async function readGame<T>(page: Page, read: (game: GameHandle) => T): Promise<T> {
  return page.evaluate(read as never) as Promise<T>;
}

/**
 * Advances the game by `frames` real animation frames.
 *
 * Headless Chromium only services `requestAnimationFrame` when something asks
 * for a frame; a plain `waitForTimeout` between evaluate calls lets wall-clock
 * time pass while the game loop stays frozen. Awaiting rAF *inside* the page
 * requests frames, so this is the only reliable way to let the simulation run.
 */
export async function pump(page: Page, frames = 8): Promise<void> {
  await page.evaluate(async (count) => {
    for (let i = 0; i < count; i++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  }, frames);
}

/** Runs a snippet against `window.wispmere`, then lets the game settle. */
export async function drive(page: Page, script: string, frames = 8): Promise<void> {
  await page.evaluate(`(() => { const g = window.wispmere; ${script} })()`);
  await pump(page, frames);
}

export async function journeyStep(page: Page): Promise<string> {
  return page.evaluate(() => window.wispmere.journey.step);
}

export async function pouch(page: Page): Promise<Record<string, number>> {
  return page.evaluate(() => ({ ...window.wispmere.state.pouch }));
}

export async function flags(page: Page): Promise<Record<string, boolean>> {
  return page.evaluate(() => ({ ...window.wispmere.state.flags }));
}

/** Grants materials directly. Used to skip repetitive gathering, never rules. */
export async function grant(page: Page, bundle: Record<string, number>): Promise<void> {
  await drive(
    page,
    `for (const [k, v] of Object.entries(${JSON.stringify(bundle)})) g.state.pouch[k] += v; g.refresh();`,
    30,
  );
}

/** Walks to a point using the real stick input, then reports whether it arrived. */
export async function walkTo(
  page: Page,
  x: number,
  z: number,
  timeoutMs = 12_000,
): Promise<boolean> {
  return page.evaluate(
    async ([targetX, targetZ, limit]) => {
      const game = window.wispmere;
      // Screen-space stick -> world direction uses the fixed camera yaw, so we
      // invert that here rather than guessing at world axes.
      const YAW = Math.PI * 0.24;
      const started = performance.now();
      while (performance.now() - started < (limit as number)) {
        const px = game.player.position.x;
        const pz = game.player.position.z;
        const dx = (targetX as number) - px;
        const dz = (targetZ as number) - pz;
        if (Math.hypot(dx, dz) < 1.2) {
          game.input.setStick(0, 0);
          return true;
        }
        const cos = Math.cos(YAW);
        const sin = Math.sin(YAW);
        // Inverse of: dirX = mx*cos - my*sin ; dirZ = -mx*sin - my*cos
        const mx = dx * cos - dz * sin;
        const my = -dx * sin - dz * cos;
        const length = Math.hypot(mx, my) || 1;
        game.input.setStick(mx / length, my / length);
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      game.input.setStick(0, 0);
      return false;
    },
    [x, z, timeoutMs] as const,
  );
}
