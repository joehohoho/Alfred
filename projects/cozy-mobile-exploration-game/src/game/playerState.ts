import { applyDamage } from '../core/combat.ts';

export { PLAYER_MAX_HEALTH } from '../core/progression.ts';

/** Thin wrapper so the loop does not have to repeat the max-health argument. */
export function applyDamageToPlayer(health: number, amount: number) {
  return applyDamage(health, 100, amount);
}
