import { effectiveGapsAtPressPhase, simPlatformPress } from '@/Game/hazards/platformPressMotion';
import type { BeatRow, GridOccupancy } from '@/Game/grid/types';
import type { PlatformSlabHazard } from '@/Game/path/platformShaft/types';

export const unionBlockedCols = (acc: number[], cols: number[]): number[] => {
  'worklet';
  const out = acc.slice();
  for (let i = 0; i < cols.length; i++) {
    let found = false;
    for (let j = 0; j < out.length; j++) {
      if (out[j] === cols[i]) {
        found = true;
        break;
      }
    }
    if (!found) {
      out.push(cols[i]);
    }
  }
  return out;
};

export const resolvePlatformSlabOccupancy = (args: {
  baseGaps: readonly number[];
  hazard: PlatformSlabHazard;
  beatRow: BeatRow;
  localSec: number;
  columns: number;
}): GridOccupancy | null => {
  'worklet';
  const { baseGaps, hazard, beatRow, localSec, columns } = args;
  const sim = simPlatformPress(hazard, columns, localSec, beatRow);
  if (!sim) {
    return null;
  }
  const effectiveGaps = effectiveGapsAtPressPhase(
    baseGaps,
    hazard,
    beatRow,
    columns,
    localSec
  );
  return {
    blockedCols: sim.blockCols,
    effectiveGaps,
    slabStart: sim.slabStart,
    slabEnd: sim.slabEnd,
    pressT: sim.pressT,
    pressExtent: sim.pressExtent,
  };
};
