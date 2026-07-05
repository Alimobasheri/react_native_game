import { hazardAnimLocalSecFromBeatRow, pressExtentAtLocalSec } from '@/Game/hazards/platformPressMotion';
import type { PlatformSlabHazard } from '@/Game/path/platformShaft/types';

export const resolveAnimStartRow = (hazard: PlatformSlabHazard): number => {
  'worklet';
  const raw = hazard.params.animStartRow;
  if (raw != null && Number.isFinite(raw)) {
    return raw;
  }
  return hazard.bounds.rowStart;
};

export const hazardLocalSecFromBeatRow = (
  hazard: PlatformSlabHazard,
  beatRowAtHazard: number,
  rowDurationSec: number
): number => {
  'worklet';
  const startRow = resolveAnimStartRow(hazard);
  if (!Number.isFinite(beatRowAtHazard) || beatRowAtHazard < startRow) {
    return 0;
  }
  return Math.max(0, (beatRowAtHazard - startRow) * rowDurationSec);
};

export type HazardPhase = {
  localSec: number;
  phase01: number;
  pressExtent: number;
};

export const computeHazardPhase = (
  hazard: PlatformSlabHazard,
  beatRowAtHazard: number,
  rowDurationSec: number
): HazardPhase => {
  'worklet';
  const localSec = hazardLocalSecFromBeatRow(hazard, beatRowAtHazard, rowDurationSec);
  const { pressT, pressExtent } = pressExtentAtLocalSec(hazard, localSec);
  return {
    localSec,
    phase01: pressT,
    pressExtent,
  };
};

/** @deprecated Use hazardLocalSecFromBeatRow — kept for tests wrapping legacy API. */
export const hazardAnimLocalSecFromBeatRowGrid = (
  hazard: PlatformSlabHazard,
  beatRowAtHazard: number,
  rowDurationSec: number,
  _totalRows: number
): number => {
  'worklet';
  return hazardAnimLocalSecFromBeatRow(
    hazard,
    beatRowAtHazard,
    rowDurationSec,
    _totalRows
  );
};
