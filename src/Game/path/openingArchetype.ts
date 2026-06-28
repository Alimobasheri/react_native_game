/**
 * Opening archetype resolver — column-safe bias ranges and fastChicane cap (worklet-safe).
 */

import { runProgressionTuning } from '@/config/runProgression';
import { mixU32, intMod } from '@/Game/path/deterministicMix';
import { flowGapCenterBounds } from '@/Game/path/flowGenerators';
import type { OpeningArchetype } from '@/Game/path/runBlueprint';

export type OpeningFlowParams = {
  seedCenter?: number;
  chuteRowsTargetOverride?: number;
};

export function pickBiasCenter(
  side: 'left' | 'right',
  runSeed: number,
  columnCount: number
): number {
  'worklet';
  const { lo, hi } = flowGapCenterBounds(columnCount);
  const mid = Math.floor((lo + hi) / 2);
  let rangeLo: number;
  let rangeHi: number;
  let salt: number;
  if (side === 'left') {
    rangeLo = lo;
    rangeHi = Math.min(lo + 1, mid);
    salt = runProgressionTuning.SALT_OPENING_BIAS_LEFT;
  } else {
    rangeLo = Math.max(hi - 1, mid + 1);
    rangeHi = hi;
    salt = runProgressionTuning.SALT_OPENING_BIAS_RIGHT;
  }
  const width = rangeHi - rangeLo + 1;
  const roll = intMod(mixU32(runSeed >>> 0, columnCount >>> 0, salt >>> 0), width);
  return rangeLo + roll;
}

export function pickFastChicaneRowCap(runSeed: number): number {
  'worklet';
  const min = runProgressionTuning.FAST_CHICANE_CHUTE_ROWS_MIN;
  const max = runProgressionTuning.FAST_CHICANE_CHUTE_ROWS_MAX;
  const width = max - min + 1;
  return (
    min +
    intMod(
      mixU32(runSeed >>> 0, 0, runProgressionTuning.SALT_FAST_CHICANE_ROWS >>> 0),
      width
    )
  );
}

export function resolveOpeningFlowParams(
  archetype: OpeningArchetype,
  runSeed: number,
  columnCount: number
): OpeningFlowParams {
  'worklet';
  switch (archetype) {
    case 'leftBias':
      return { seedCenter: pickBiasCenter('left', runSeed, columnCount) };
    case 'rightBias':
      return { seedCenter: pickBiasCenter('right', runSeed, columnCount) };
    case 'fastChicane':
      return { chuteRowsTargetOverride: pickFastChicaneRowCap(runSeed) };
    case 'warmChute':
    default:
      return {};
  }
}
