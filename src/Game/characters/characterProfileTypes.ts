/**
 * Immutable character profile contracts for the modular locomotion stack.
 * Decouples per-skin physics, combo tiers, and accessory behavior from systems.
 * Safe to import from Reanimated worklets (plain data only).
 */

export type SecondaryItemType =
  | 'LaggingSpring'
  | 'ProceduralChain'
  | 'ShaderReactive';

/** Tier-indexed triple (tier 1, tier 2, tier 3). */
export type CharacterTierTriple = readonly [number, number, number];

export interface ICharacterProfile {
  readonly id: string;
  readonly mass: number;
  readonly baseDrag: number;
  /** Strike impulse numerator before tier scaling and mass division (pixels/s). */
  readonly baseStrikeForce: number;
  /** Tier 1, tier 2, tier 3 strike tilt targets in degrees. */
  readonly targetSwimAngles: CharacterTierTriple;
  /** Tier 1, tier 2, tier 3 tap-force multipliers. */
  readonly comboForceMultipliers: CharacterTierTriple;
  /** Duration of the combo tap window in milliseconds. */
  readonly comboWindowMs: number;
  readonly secondaryItemType: SecondaryItemType;
  readonly secondaryItemWeight: number;
  /** Tier 1, tier 2, tier 3 pivot lockout durations in milliseconds. */
  readonly pivotLockoutDurations: CharacterTierTriple;
  readonly splashFxPrefabKey: string;
}
