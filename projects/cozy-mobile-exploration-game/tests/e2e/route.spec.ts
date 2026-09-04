import { expect, test, type Page } from '@playwright/test';
import { drive, flags, grant, journeyStep, pouch, pump, walkTo } from './helpers.ts';

/**
 * The full progression route, played in a real browser.
 *
 * This is the brief's "verify the full route manually from a clean reset
 * through the finale", automated. It drives the shipped production bundle in an
 * iPhone-landscape viewport with a real WebGL2 context.
 *
 * Where it can, it plays honestly: real stick input to walk, the real interact
 * button, real swings against real creatures. Where repetition would only add
 * minutes (gathering fifteen nodes), it grants materials directly — but never
 * skips a *rule*: every restoration, upgrade and unlock goes through the same
 * code path the player's thumb does.
 */

async function bootFresh(page: Page): Promise<void> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  (page as Page & { __errors?: string[] }).__errors = errors;

  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.wispmere), null, { timeout: 30_000 });
  await drive(page, 'g.resetProgress();', 16);
}

function collectedErrors(page: Page): string[] {
  return (page as Page & { __errors?: string[] }).__errors ?? [];
}

test.describe('Wispmere', () => {
  test('plays the whole arc from a clean reset to the finale, and keeps going', async ({ page }) => {
    await bootFresh(page);

    // ---- 1. Wake in the meadow -------------------------------------------
    expect(await journeyStep(page)).toBe('gather-starter');
    expect(await pouch(page)).toMatchObject({ sunpetal: 0, glimmercore: 0 });
    await page.screenshot({ path: 'screenshots/route-01-wake.png' });

    // ---- 2. Gather, for real, from a real node ---------------------------
    const nodeSpot = await page.evaluate(() => {
      const game = window.wispmere;
      const view = [...game.world.nodes.values()].find((n) => n.resource === 'sunpetal')!;
      return { id: view.id, x: view.full.position.x, z: view.full.position.z };
    });
    await drive(page, `g.teleport(${nodeSpot.x}, ${nodeSpot.z + 1.2});`);
    expect(await page.evaluate(() => window.wispmere.prompt?.kind)).toBe('gather');

    await drive(page, 'g.interact();');
    expect((await pouch(page)).sunpetal).toBeGreaterThan(0);
    // The node must now visibly read as spent.
    expect(
      await page.evaluate(
        (id) => window.wispmere.world.nodes.get(id)!.spent.visible,
        nodeSpot.id,
      ),
    ).toBe(true);
    await page.screenshot({ path: 'screenshots/route-02-gathered.png' });

    // Top up the rest of the starter stock rather than walking fifteen nodes.
    await grant(page, { sunpetal: 3, boughwood: 3, riverstone: 3 });
    expect(await journeyStep(page)).toBe('find-core');

    // ---- 3. Settle a thistlebur, for real --------------------------------
    const creature = await page.evaluate(() => {
      const game = window.wispmere;
      const target = game.creatures.instances.find(
        (c) => c.def.species === 'thistlebur' && c.post.region === 'meadow',
      )!;
      return { id: target.id, x: target.post.home.x, z: target.post.home.z };
    });
    await drive(page, `g.teleport(${creature.x + 1.4}, ${creature.z});`, 12);

    // Hold the chime until it settles, exactly as the button does.
    await page.evaluate(async () => {
      const game = window.wispmere;
      game.input.press('attack');
      const started = performance.now();
      while (performance.now() - started < 12_000) {
        if (game.state.pouch.glimmercore >= 1) break;
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      game.input.release('attack');
    });
    expect((await pouch(page)).glimmercore).toBeGreaterThanOrEqual(1);
    expect(await journeyStep(page)).toBe('visit-merchant');
    await page.screenshot({ path: 'screenshots/route-03-core.png' });

    // ---- 4. Ossa upgrades the chime --------------------------------------
    await grant(page, { boughwood: 3, riverstone: 2 });
    const stump = await page.evaluate(() => window.wispmere.places.hollowStump);
    await drive(page, `g.teleport(${stump.x + 2}, ${stump.z + 1.5});`);
    expect(await page.evaluate(() => window.wispmere.prompt?.kind)).toBe('upgrade-weapon');
    await drive(page, 'g.interact();');
    expect((await flags(page)).weaponUpgraded).toBe(true);
    expect(await page.evaluate(() => window.wispmere.state.weapon)).toBe('bright-chime');
    await page.screenshot({ path: 'screenshots/route-04-merchant.png' });

    // ---- 5. Build the Hearthnest and rest ---------------------------------
    expect(await journeyStep(page)).toBe('build-shelter');
    await grant(page, { boughwood: 4, riverstone: 3, sunpetal: 2 });
    const clearing = await page.evaluate(() => window.wispmere.places.shelterClearing);
    await drive(page, `g.teleport(${clearing.x + 2.4}, ${clearing.z + 1});`);
    await drive(page, 'g.interact();', 20);
    expect((await flags(page)).shelterBuilt).toBe(true);
    expect(await page.evaluate(() => window.wispmere.world.hearthnest.built.visible)).toBe(true);

    expect(await journeyStep(page)).toBe('rest-at-shelter');
    await drive(page, 'g.interact();', 14);
    expect((await flags(page)).restedAtShelter).toBe(true);
    expect(await page.evaluate(() => window.wispmere.state.returnPoint)).toBe('hearthnest');
    await page.screenshot({ path: 'screenshots/route-05-hearthnest.png' });

    // ---- 6. Befriend Pim ---------------------------------------------------
    expect(await journeyStep(page)).toBe('befriend-companion');
    const pim = await page.evaluate(() => ({ ...window.wispmere.companion.position }));
    await drive(page, `g.teleport(${pim.x + 1.2}, ${pim.z + 1});`, 20);
    expect(await page.evaluate(() => window.wispmere.prompt?.kind)).toBe('befriend');
    await drive(page, 'g.interact();', 24);
    expect((await flags(page)).companionBefriended).toBe(true);

    // Pim now points at something, which is the whole companion feature.
    await pump(page, 45);
    expect(await page.evaluate(() => window.wispmere.companion.guidance.target !== null)).toBe(true);
    await page.screenshot({ path: 'screenshots/route-06-companion.png' });

    // ---- 7. Wake the Meadow Dawnspire -------------------------------------
    expect(await journeyStep(page)).toBe('restore-meadow-dawnspire');
    await grant(page, { sunpetal: 3, boughwood: 3, riverstone: 3, glimmercore: 1 });
    const spire = await page.evaluate(() => window.wispmere.places.meadowDawnspire);
    await drive(page, `g.teleport(${spire.x + 2.5}, ${spire.z + 2});`);
    expect(await page.evaluate(() => window.wispmere.prompt?.blocked)).toBeUndefined();
    await drive(page, 'g.interact();', 36);

    expect((await flags(page)).meadowLandmarkRestored).toBe(true);
    expect(await page.evaluate(() => window.wispmere.world.spires['meadow-dawnspire'].restored.visible)).toBe(true);
    expect(await page.evaluate(() => window.wispmere.world.brambleGate.open.visible)).toBe(true);
    await page.screenshot({ path: 'screenshots/route-07-first-spire.png' });

    // ---- 8. Walk through the now-open gate, on foot -----------------------
    expect(await journeyStep(page)).toBe('find-grove-guardian');
    const gate = await page.evaluate(() => window.wispmere.places.groveGate);
    await drive(page, `g.teleport(${gate.x - 4}, ${gate.z});`);
    const crossed = await walkTo(page, gate.x + 5, gate.z - 2, 15_000);
    expect(crossed, 'the player should be able to walk through the opened gate').toBe(true);

    // ---- 9. Settle Bramblehorn, for real ----------------------------------
    const ring = await page.evaluate(() => window.wispmere.places.bramblehornRing);
    await drive(page, `g.teleport(${ring.x + 2.2}, ${ring.z + 1});`, 20);
    await page.screenshot({ path: 'screenshots/route-08-guardian.png' });

    await page.evaluate(async () => {
      const game = window.wispmere;
      const started = performance.now();
      // Hold the chime, and dodge out whenever health dips, which is the actual
      // intended way to fight this thing.
      while (performance.now() - started < 60_000) {
        if (game.state.flags.guardianDefeated) break;
        game.input.press('attack');
        if (game.state.playerHealth < 55) {
          game.input.release('attack');
          game.input.press('dodge');
        }
        const guardian = game.creatures.instances.find((c) => c.def.species === 'bramblehorn');
        if (guardian && guardian.group.visible) {
          const dx = guardian.position.x - game.player.position.x;
          const dz = guardian.position.z - game.player.position.z;
          const length = Math.hypot(dx, dz) || 1;
          if (length > 2.2) {
            const YAW = Math.PI * 0.24;
            const mx = dx * Math.cos(YAW) - dz * Math.sin(YAW);
            const my = -dx * Math.sin(YAW) - dz * Math.cos(YAW);
            const m = Math.hypot(mx, my) || 1;
            game.input.setStick(mx / m, my / m);
          } else {
            game.input.setStick(0, 0);
          }
        }
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      game.input.release('attack');
      game.input.setStick(0, 0);
    });

    expect((await flags(page)).guardianDefeated).toBe(true);
    expect(await page.evaluate(() => window.wispmere.world.mistveil.visible)).toBe(false);
    await page.screenshot({ path: 'screenshots/route-09-guardian-settled.png' });

    // ---- 10. Moonmere -----------------------------------------------------
    expect(await journeyStep(page)).toBe('explore-moonmere');
    const finalSpire = await page.evaluate(() => window.wispmere.places.moonmereDawnspire);
    await drive(page, `g.teleport(${finalSpire.x}, ${finalSpire.z + 6});`, 30);
    expect((await flags(page)).moonmereVisited).toBe(true);
    expect(await page.evaluate(() => window.wispmere.state.regionsSeen)).toContain('glade');
    await page.screenshot({ path: 'screenshots/route-10-moonmere.png' });

    // ---- 11. The finale ---------------------------------------------------
    expect(await journeyStep(page)).toBe('restore-moonmere-dawnspire');
    await grant(page, { sunpetal: 2, boughwood: 2, riverstone: 2, glimmercore: 1 });
    await drive(page, `g.teleport(${finalSpire.x + 2.4}, ${finalSpire.z + 2});`, 20);
    await drive(page, 'g.interact();', 40);

    expect((await flags(page)).moonmereLandmarkRestored).toBe(true);
    expect(await page.evaluate(() => window.wispmere.world.spires['moonmere-dawnspire'].restored.visible)).toBe(true);
    await page.screenshot({ path: 'screenshots/route-11-finale.png' });

    // ---- 12. The game does not end ----------------------------------------
    expect(await journeyStep(page)).toBe('explore-freely');

    // Still fully playable: walk, gather, and fight after the finale.
    const walked = await walkTo(page, finalSpire.x + 8, finalSpire.z + 8, 12_000);
    expect(walked, 'the player can still walk after the finale').toBe(true);

    const postFinaleNode = await page.evaluate(() => {
      const game = window.wispmere;
      const view = [...game.world.nodes.values()].find(
        (n) => n.full.position.x > 40 && n.full.position.z < -30,
      )!;
      return { x: view.full.position.x, z: view.full.position.z };
    });
    const before = (await pouch(page)).sunpetal + (await pouch(page)).boughwood + (await pouch(page)).riverstone;
    await drive(page, `g.teleport(${postFinaleNode.x}, ${postFinaleNode.z + 1.2});`);
    await drive(page, 'g.interact();', 14);
    const after = (await pouch(page)).sunpetal + (await pouch(page)).boughwood + (await pouch(page)).riverstone;
    expect(after, 'gathering still works after the finale').toBeGreaterThan(before);
    await page.screenshot({ path: 'screenshots/route-12-open-ended.png' });

    expect(collectedErrors(page), 'no console errors during the whole route').toEqual([]);
  });

  test('defeat is gentle: full health, back home, nothing lost', async ({ page }) => {
    await bootFresh(page);
    await grant(page, { sunpetal: 5, boughwood: 4, riverstone: 3, glimmercore: 2 });

    const before = await pouch(page);
    await drive(
      page,
      `g.teleport(20, 10); g.state.playerHealth = 1;
       const post = g.creatures.instances.find((c) => c.def.species === 'thistlebur');
       g.teleport(post.post.home.x + 1, post.post.home.z);`,
      14,
    );

    await page.evaluate(async () => {
      const game = window.wispmere;
      const started = performance.now();
      while (performance.now() - started < 20_000) {
        if (game.state.stats.timesDefeated > 0) break;
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    });

    expect(await page.evaluate(() => window.wispmere.state.stats.timesDefeated)).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.wispmere.state.playerHealth)).toBe(100);
    expect(await pouch(page)).toEqual(before);
    await page.screenshot({ path: 'screenshots/route-13-defeat.png' });
  });

  test('safe places really are safe', async ({ page }) => {
    await bootFresh(page);
    const clearing = await page.evaluate(() => window.wispmere.places.shelterClearing);
    await drive(page, `g.teleport(${clearing.x}, ${clearing.z});`, 14);

    const startHealth = await page.evaluate(() => window.wispmere.state.playerHealth);
    // Four seconds of real frames next to the Hearthnest.
    await pump(page, 120);
    expect(await page.evaluate(() => window.wispmere.state.playerHealth)).toBe(startHealth);

    // No creature may be standing inside a safe zone either.
    const intruders = await page.evaluate(() =>
      window.wispmere.creatures
        .active()
        .filter((c) => window.wispmere.isInsideSafeZone(c.position))
        .map((c) => c.id),
    );
    expect(intruders).toEqual([]);
  });
});
