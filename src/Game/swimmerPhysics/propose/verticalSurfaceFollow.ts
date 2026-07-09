import { isGameOverPhase } from '@/Game/session/gameSessionQuery';
import { swimmerPhysicsTuning } from '@/config/swimmerTuning';
import {
  computeFinalSurfaceUv,
  computeGapFollowMaskAtX,
} from '@/Game/water/waterSurfaceProfile';
import type {
  BobbingBuoyancyStep,
  HorizontalLocomotionStep,
  SwimmerFrameContext,
  SwimmerSnapshot,
  VerticalSurfaceStep,
  WaterAdvectionStep,
} from '@/Game/swimmerPhysics/types';

const clamp01 = (value: number): number => {
  'worklet';
  return Math.max(0, Math.min(1, value));
};

/**
 * Buoyancy step + shader-matched surface Y — swimmer rides the visible wave at proposed X.
 *
 * @see docs/game-design/swimmer-physics-flow.md#water-surface-lock
 */
export const integrateVerticalAndSurfaceFollow = (
  frame: SwimmerFrameContext,
  swimmer: SwimmerSnapshot,
  buoyancy: BobbingBuoyancyStep,
  horizontal: HorizontalLocomotionStep,
  advection: WaterAdvectionStep
): VerticalSurfaceStep => {
  'worklet';

  const { centerX, centerY, wasPinnedFromAbove, waterSpeed } = swimmer;
  const { container, containerTop, startReady, deltaSeconds, blockHeight, profileBase, session } =
    frame;
  const { depth, buoyancySpeed, bobbingOffsetY, swimmerVisualHeight } = buoyancy;

  const proposedDeltaX = advection.velocityX * deltaSeconds;
  const containerUVX = clamp01(
    (centerX + proposedDeltaX - (container.centerX - container.width / 2)) /
      Math.max(0.0001, container.width)
  );

  let targetY = centerY;
  const rowDeltaY =
    startReady || isGameOverPhase(session) ? 0 : waterSpeed * deltaSeconds;
  const maxVerticalStepPx =
    blockHeight * swimmerPhysicsTuning.MAX_VERTICAL_STEP_BLOCK_FRACTION;

  if (!startReady && !wasPinnedFromAbove) {
    if (depth > 0) {
      const maxRise = Math.min(buoyancySpeed * deltaSeconds, maxVerticalStepPx);
      targetY -= maxRise;
    } else if (depth < 0 && buoyancySpeed > 0) {
      const maxFall = Math.min(buoyancySpeed * deltaSeconds, maxVerticalStepPx);
      targetY += maxFall;
    }
  }

  const gapFollowMask = computeGapFollowMaskAtX(profileBase, containerUVX);
  const finalSurfaceNorm = computeFinalSurfaceUv({
    ...profileBase,
    xNorm: containerUVX,
  });
  const curveSurfaceY =
    containerTop + (1 - finalSurfaceNorm) * container.height;
  const targetFloatCenterY =
    curveSurfaceY +
    swimmerVisualHeight * swimmerPhysicsTuning.SURFACE_SUBMERGENCE_RATIO +
    bobbingOffsetY * swimmerPhysicsTuning.SURFACE_BOB_BLEND;
  const surfaceDepth = targetY - curveSurfaceY;
  const canFollowCurve =
    !swimmer.component.isCollidingWithObstacle &&
    !swimmer.component.isPinnedFromAbove &&
    gapFollowMask > 0.15 &&
    surfaceDepth > -swimmerVisualHeight &&
    surfaceDepth < swimmerVisualHeight * 2.1;

  if (canFollowCurve) {
    const followStep = startReady
      ? 1
      : 1 -
        Math.exp(
          -swimmerPhysicsTuning.SURFACE_FOLLOW_RESPONSE_PER_SECOND * deltaSeconds
        );
    targetY += (targetFloatCenterY - targetY) * followStep;
  }

  return {
    targetY,
    curveSurfaceY,
    proposedDeltaX,
    containerUVX,
    rowDeltaY,
    maxVerticalStepPx,
  };
};
