import { platformShaftTuning } from '@/config/platformShaftTuning';
import type { PlatformSlabHazard } from '@/Game/path/platformShaft/types';
import { pressExtentAtLocalSec } from '@/Game/hazards/platformPressMotion';

const clampSigned = (value: number, absMax: number): number => {
  'worklet';
  return Math.max(-absMax, Math.min(absMax, value));
};

export type PlatformFlowInput = {
  hazard: PlatformSlabHazard;
  localSec: number;
  prevLocalSec: number;
  gapWidthCols: number;
  rowSpan: number;
  maxRowSpan: number;
};

export type PlatformFlowVelocityInput = {
  pressVelocity: number;
  gapWidthCols: number;
  rowSpan: number;
  maxRowSpan: number;
  pressDirection: 'left' | 'right';
};

/** Lateral flow norm from press extent velocity (PS-007) — preferred runtime API. */
export const flowNormFromPressVelocity = (input: PlatformFlowVelocityInput): number => {
  'worklet';
  const t = platformShaftTuning;
  const { pressVelocity, gapWidthCols, rowSpan, maxRowSpan, pressDirection } = input;
  if (Math.abs(pressVelocity) < 0.001) {
    return 0;
  }
  const heightFactor = maxRowSpan > 0 ? rowSpan / maxRowSpan : 1;
  const tightnessFactor = 1 / Math.max(1, gapWidthCols);
  const intoWater = pressDirection === 'right' ? 1 : -1;
  const velocityFactor = Math.min(1, Math.abs(pressVelocity));
  const flowNorm =
    intoWater * heightFactor * tightnessFactor * velocityFactor * t.FLOW_BASE_GAIN;
  return clampSigned(flowNorm, t.FLOW_MAX_NORM);
};

/** Lateral flow norm from active platform press (PS-007). */
export const flowNormFromPlatformPress = (input: PlatformFlowInput): number => {
  'worklet';
  const { hazard, localSec, prevLocalSec, gapWidthCols, rowSpan, maxRowSpan } =
    input;
  if (localSec <= 0) {
    return 0;
  }
  const curr = pressExtentAtLocalSec(hazard, localSec);
  const prev = pressExtentAtLocalSec(hazard, Math.max(0, prevLocalSec));
  const dt = Math.max(0.001, localSec - prevLocalSec);
  const pressVelocity = (curr.pressExtent - prev.pressExtent) / dt;
  const pressDir =
    hazard.params.pressDirection ?? (hazard.side === 'left' ? 'right' : 'left');
  return flowNormFromPressVelocity({
    pressVelocity,
    gapWidthCols,
    rowSpan,
    maxRowSpan,
    pressDirection: pressDir,
  });
};
