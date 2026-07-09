import { LAYOUT_CONSTANTS } from '@/Layout';
import { getSwimmerColliderExtents } from '@/Game/characters/swimmerCollider';
import { swimmerVisualTuning } from '@/config/swimmerVisualTuning';
import type {
  BobbingBuoyancyStep,
  SwimmerFrameContext,
  SwimmerSnapshot,
} from '@/Game/swimmerPhysics/types';

/**
 * Sin bob on the surface + upward push when submerged — player feels buoyant, not floaty-ice.
 *
 * @see docs/game-design/swimmer-physics-flow.md#per-frame-pipeline
 */
export const computeBobbingAndBuoyancy = (
  frame: SwimmerFrameContext,
  swimmer: SwimmerSnapshot
): BobbingBuoyancyStep => {
  'worklet';

  const { component, centerY, normalizedSpeed } = swimmer;
  const { container, water, startReady, deltaSeconds } = frame;

  const baseAmplitude = startReady
    ? swimmerVisualTuning.START_READY_BOB_PX
    : 3;
  const extraAmplitude = startReady ? 0 : 3;
  const amplitude = baseAmplitude + extraAmplitude * normalizedSpeed;

  const baseFrequency = startReady
    ? swimmerVisualTuning.START_READY_BOB_FREQUENCY_HZ
    : 0.25;
  const extraFrequency = startReady ? 0 : 0.35;
  const frequency = baseFrequency + extraFrequency * normalizedSpeed;

  let bobbingPhase = component.bobbingPhase ?? 0;
  bobbingPhase += 2 * Math.PI * frequency * deltaSeconds;
  if (bobbingPhase > Math.PI * 2) {
    bobbingPhase -= Math.PI * 2;
  }

  const raw = Math.sin(bobbingPhase);
  const downwardMultiplier = startReady ? 1 : 1.3;
  const upwardMultiplier = startReady ? 1 : 0.5;
  const scaled = raw < 0 ? raw * downwardMultiplier : raw * upwardMultiplier;
  const bias = startReady ? 0 : amplitude * 0.3;
  const bobbingOffsetY = scaled * amplitude - bias;

  const depth = centerY - container.waterSurfaceY;
  let buoyancySpeed = 0;

  const swimmerVisualWidth =
    component.meshBaseWidth ??
    (container.width / LAYOUT_CONSTANTS.COLUMNS) *
      swimmerVisualTuning.VISUAL_WIDTH_COLUMN_RATIO;
  const swimmerVisualHeight =
    component.meshBaseHeight ??
    swimmerVisualWidth * swimmerVisualTuning.VISUAL_HEIGHT_TO_WIDTH_RATIO;
  const columnWidth = container.width / LAYOUT_CONSTANTS.COLUMNS;
  const swimmerHeightForBuoyancy = swimmerVisualHeight;

  const waterSpeed = water.raisingSpeed ?? 0;

  if (depth > 0) {
    const depthFactor = Math.min(depth / (swimmerHeightForBuoyancy * 1.5), 2);
    const waterFactor = 0.6 + waterSpeed / 80;
    buoyancySpeed = 220 * waterFactor * depthFactor;
  } else {
    const heightAbove = -depth;
    if (heightAbove > 0) {
      const settleFactor = Math.min(
        heightAbove / (swimmerHeightForBuoyancy * 1.5),
        1.5
      );
      buoyancySpeed = 80 * (0.3 + normalizedSpeed) * settleFactor;
    }
  }

  const navColliderExtents = getSwimmerColliderExtents(columnWidth, false);
  const pinnedColliderExtents = getSwimmerColliderExtents(columnWidth, true);
  const colliderExtents = swimmer.wasPinnedFromAbove
    ? pinnedColliderExtents
    : navColliderExtents;

  return {
    bobbingPhase,
    bobbingOffsetY,
    depth,
    buoyancySpeed,
    swimmerVisualHeight,
    swimmerVisualWidth,
    columnWidth,
    navColliderExtents,
    pinnedColliderExtents,
    colliderExtents,
  };
};
