import { LAYOUT_CONSTANTS } from '@/Layout';
import type {
  PlatformShaftHazard,
  PlatformSlabHazard,
} from '@/Game/path/platformShaft/types';

/** Production column count — SSOT: src/Layout.ts */
export const TEST_COLS = LAYOUT_CONSTANTS.COLUMNS;

/** Narrow recipe hazards when the composer is known to emit platform slabs only. */
export const asPlatformSlabHazard = (
  hazard: PlatformShaftHazard
): PlatformSlabHazard => {
  if (hazard.kind !== 'hazard_platform') {
    throw new Error(`expected hazard_platform, got ${hazard.kind}`);
  }
  return hazard;
};

export const asPlatformSlabHazards = (
  hazards: readonly PlatformShaftHazard[]
): PlatformSlabHazard[] => {
  const out: PlatformSlabHazard[] = [];
  for (let i = 0; i < hazards.length; i++) {
    out.push(asPlatformSlabHazard(hazards[i]));
  }
  return out;
};
