import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CORE_DIR = join(process.cwd(), 'src', 'core');

function collect(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? collect(full) : full.endsWith('.ts') ? [full] : [];
  });
}

const CORE_FILES = collect(CORE_DIR);

/**
 * Strips comments and string literals before scanning.
 *
 * Without this the checks below fire on prose: `combat.ts` documents "the
 * player's free window" and `resources.ts` explains that it does not call
 * `Math.random()`. Both are exactly the intent these rules protect, so matching
 * them would be the check contradicting itself.
 */
function codeOnly(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""');
}

/**
 * The architecture decision says core rules stay engine-agnostic and free of
 * browser globals. That is only true if something checks, so this is the check.
 */
describe('src/core stays pure', () => {
  it('found the core files', () => {
    expect(CORE_FILES.length).toBeGreaterThan(8);
  });

  it('never imports three.js', () => {
    const offenders = CORE_FILES.filter((file) => /from\s+''three|three''/.test(codeOnly(file)));
    expect(offenders).toEqual([]);
  });

  it('never imports from the presentation layers', () => {
    const offenders = CORE_FILES.filter((file) =>
      /import[\s\S]{0,200}?\/(game|ui)\//.test(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('never reaches for browser globals', () => {
    const banned = /\b(document|window|navigator|requestAnimationFrame|AudioContext)\b/;
    const offenders = CORE_FILES.filter((file) => banned.test(codeOnly(file))).map((f) =>
      f.replace(process.cwd(), ''),
    );
    expect(offenders).toEqual([]);
  });

  it('confines localStorage to the save port', () => {
    const offenders = CORE_FILES.filter(
      (file) => !file.endsWith('save.ts') && /localStorage/.test(codeOnly(file)),
    ).map((f) => f.replace(process.cwd(), ''));
    expect(offenders).toEqual([]);
  });

  it('never calls Date.now or Math.random — callers pass time and rolls in', () => {
    const offenders = CORE_FILES.filter((file) =>
      /Date\.now\(|Math\.random\(/.test(codeOnly(file)),
    ).map((f) => f.replace(process.cwd(), ''));
    expect(offenders).toEqual([]);
  });
});
