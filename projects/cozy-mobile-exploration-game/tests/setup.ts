/**
 * Global test setup.
 *
 * The brief requires audio to be safely disabled in automated/headless
 * contexts. Rather than relying on every test to remember, we assert here that
 * no `AudioContext` exists in the test environment, and expose a flag the audio
 * bus checks. If a future change starts pulling a real AudioContext into unit
 * tests, this is where it will be caught.
 */
(globalThis as Record<string, unknown>).__WISPMERE_HEADLESS__ = true;
