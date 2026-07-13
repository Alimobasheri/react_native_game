import type { EventQueueContextType } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useEventQueue/useEventQueue';
import { swimmerPhysicsTuning } from '@/config/swimmerTuning';
import {
  buildPinnedEscapeContext,
  computePinnedEscapeMinSlidePx,
} from '@/Game/characters/swimmerHyperCasualPhysics';
import { SwimmerPinnedSplashEventType } from '@/Game/characters/swimmerLocomotionEvents';
import {
  resolvePinnedTapSlide,
  resolveSwimmerAgainstRows,
  samplePinnedPressSlabSurfaceVelocityX,
  selectRowsNearSwimmerFromComponentStore,
} from '@/Game/collision/swimmerBlockCollision';
import type {
  CollisionResolutionStep,
  ProposeMotionResult,
  SwimmerFrameContext,
  SwimmerSnapshot,
} from '@/Game/swimmerPhysics/types';

/**
 * Sweep proposed motion against obstacle rows — pin, side block, ceiling carry.
 *
 * @see docs/game-design/swimmer-physics-flow.md#per-frame-pipeline
 */
export const resolveSwimmerCollision = (
  frame: SwimmerFrameContext,
  swimmer: SwimmerSnapshot,
  proposed: ProposeMotionResult,
  eventQueue: EventQueueContextType
): CollisionResolutionStep => {
  'worklet';

  const { centerX, centerY, wasPinnedFromAbove } = swimmer;
  const { container, blockDimensions, obstacleRowStore, rowHeight } = frame;
  const {
    colliderExtents,
    navColliderExtents,
    proposedDeltaX,
    targetY,
    rowDeltaY,
    maxVerticalStepPx,
    velocityX,
    kinematicsAngleRad,
    tapImpulseAppliedThisFrame,
    tapDirectionThisFrame,
    columnWidth,
  } = proposed;

  const collisionHalfWidth = colliderExtents.halfWidth;
  const collisionHalfHeight = colliderExtents.halfHeight;
  const proposedDeltaY = targetY - centerY;

  const visualAngleRad = swimmer.component.useColumnControl
    ? kinematicsAngleRad
    : (() => {
      const fullTiltSpeed =
        swimmerPhysicsTuning.MAX_HORIZONTAL_SPEED *
        swimmerPhysicsTuning.FULL_TILT_SPEED_FRACTION;
      const tiltNormalized = Math.max(
        -1,
        Math.min(1, velocityX / fullTiltSpeed)
      );
      return tiltNormalized * swimmerPhysicsTuning.MAX_TILT_RADIANS;
    })();

  const collisionAngleRad = swimmer.component.useColumnControl
    ? wasPinnedFromAbove && proposed.pinnedMomentumCoast
      ? proposed.kinematicsAngleRad
      : 0
    : visualAngleRad;

  const verticalSweepPx =
    Math.abs(proposedDeltaY) + rowDeltaY + maxVerticalStepPx;
  const minX =
    swimmer.component.containerCenterX -
    swimmer.component.containerWidth / 2 +
    collisionHalfWidth;
  const maxX =
    swimmer.component.containerCenterX +
    swimmer.component.containerWidth / 2 -
    collisionHalfWidth;

  const nearbyRows = selectRowsNearSwimmerFromComponentStore(
    obstacleRowStore,
    centerY,
    collisionHalfHeight,
    rowHeight,
    verticalSweepPx
  );

  const pinnedSlabSurfaceVelocityX = wasPinnedFromAbove
    ? samplePinnedPressSlabSurfaceVelocityX(
        centerX,
        centerY,
        collisionHalfWidth,
        collisionHalfHeight,
        nearbyRows
      )
    : 0;
  const slabDeltaX = pinnedSlabSurfaceVelocityX * frame.deltaSeconds;

  const collisionReleaseHalfWidth = wasPinnedFromAbove
    ? navColliderExtents.halfWidth
    : undefined;
  const collisionReleaseHalfHeight = wasPinnedFromAbove
    ? navColliderExtents.halfHeight
    : undefined;

  const motionInput = {
    x: centerX,
    y: centerY,
    halfWidth: collisionHalfWidth,
    halfHeight: collisionHalfHeight,
    releaseHalfWidth: collisionReleaseHalfWidth,
    releaseHalfHeight: collisionReleaseHalfHeight,
    pinAnchorX: centerX,
    pinnedCeilingMinX: swimmer.component.pinnedCeilingMinX,
    pinnedCeilingMaxX: swimmer.component.pinnedCeilingMaxX,
    pinnedMomentumCoast: wasPinnedFromAbove && proposed.pinnedMomentumCoast,
    angle: collisionAngleRad,
    deltaX: proposedDeltaX + slabDeltaX,
    deltaY: proposedDeltaY,
    rowDeltaY,
    rows: nearbyRows,
    container: {
      centerX: container.centerX,
      width: container.width,
    },
    blockSize: {
      width: blockDimensions.width,
      height: blockDimensions.height,
    },
    minX,
    maxX,
    kinematicHorizontal: true,
  };

  const collisionResult = resolveSwimmerAgainstRows(motionInput);

  let finalX = collisionResult.x;
  const finalY = collisionResult.y;
  const isBlockedFromAbove = collisionResult.isPinnedFromAbove;
  const isCollidingWithObstacle = collisionResult.isColliding;

  if (!wasPinnedFromAbove && isBlockedFromAbove) {
    eventQueue.addEvent({
      type: SwimmerPinnedSplashEventType,
      payload: {
        entityId: swimmer.entity,
        x: finalX,
        y: finalY,
        impactSpeed: Math.abs(velocityX),
      },
    });
  }

  if (
    wasPinnedFromAbove &&
    tapImpulseAppliedThisFrame &&
    tapDirectionThisFrame !== 0
  ) {
    const tapSlideDirection = tapDirectionThisFrame;
    const pinnedEscapeBounds = buildPinnedEscapeContext(
      centerX,
      columnWidth,
      container.centerX,
      container.width,
      swimmer.component.pinnedCeilingMinX,
      swimmer.component.pinnedCeilingMaxX
    );
    const minPinnedSlidePx = computePinnedEscapeMinSlidePx(
      centerX,
      tapSlideDirection,
      pinnedEscapeBounds.ceilingMinX,
      pinnedEscapeBounds.ceilingMaxX,
      columnWidth
    );
    const visibleNudgePx =
      columnWidth * swimmerPhysicsTuning.PINNED_TAP_VISIBLE_NUDGE_COLUMN_FRACTION;

    const slideResult = resolvePinnedTapSlide({
      primaryResult: collisionResult,
      motion: motionInput,
      swimmerStartX: centerX,
      proposedDeltaX,
      tapDirection: tapSlideDirection,
      navHalfWidth: navColliderExtents.halfWidth,
      navHalfHeight: navColliderExtents.halfHeight,
      columnWidth,
      minPinnedSlidePx,
      visibleNudgePx,
      collisionAngleRad,
    });
    finalX = slideResult.x;
  }

  const committedSlabSurfaceVelocityX =
    wasPinnedFromAbove || isBlockedFromAbove
      ? samplePinnedPressSlabSurfaceVelocityX(
          finalX,
          finalY,
          collisionHalfWidth,
          collisionHalfHeight,
          nearbyRows
        )
      : 0;

  return {
    finalX,
    finalY,
    visualAngleRad,
    collisionAngleRad,
    collisionResult,
    isBlockedFromAbove,
    isCollidingWithObstacle,
    proposedDeltaY,
    nearbyRows,
    minX,
    maxX,
    pinnedSlabSurfaceVelocityX: committedSlabSurfaceVelocityX,
  };
};
