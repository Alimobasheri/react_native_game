import type { ICharacterProfile } from './characterProfileTypes';

export const GIGGLE_CRYSTAL_PROFILE_ID = 'giggle_crystal' as const;

export const GIGGLE_CRYSTAL_PROFILE = {
  id: GIGGLE_CRYSTAL_PROFILE_ID,
  mass: 1.2,
  baseDrag: 0.15,
  impulseScale: 1,
  dragScale: 1,
  baseStrikeForce: 324,
  /** Legacy profile caps — runtime uses swimmerVisualTuning tier open-water angles. */
  targetSwimAngles: [42, 55, 66],
  comboForceMultipliers: [1.0, 1.5, 2.2],
  comboWindowMs: 350,
  secondaryItemType: 'LaggingSpring',
  secondaryItemWeight: 0.3,
  pivotLockoutDurations: [100, 180, 250],
  splashFxPrefabKey: 'fx_crystal_shards',
} satisfies ICharacterProfile;
