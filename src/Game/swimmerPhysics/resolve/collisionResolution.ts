import type { ComponentStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/component';
import type { EventQueueContextType } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useEventQueue/useEventQueue';
import { swimmerPhysicsTuning } from '@/config/swimmerTuning';
import {
  buildPinnedEscapeContext,
  computePinnedEscapeMinSlidePx,
} from '@/Game/characters/swimmerHyperCasualPhysics';
import { SwimmerPinnedSplashEventType } from '@/Game/characters/swimmerLocomotionEvents';
import {
  collectPivotArmSolidsNearSwimmer,
  collectPendulumHeadSolidsNearSwimmer,
  collectPistonHeadSolidsNearSwimmer,
  lateralShoveFromArmImpact,
  resolvePinnedTapSlide,
  resolveSwimmerAgainstRows,
  samplePinnedPressSlabSurfaceVelocityX,
  selectRowsNearSwimmerFromComponentStore,
} from '@/Game/collision/swimmerBlockCollision';
import { resolvePendulumHeadStrike } from '@/Game/swimmerPhysics/react/pendulumStrike';
import {
  pistonStillOverlapping,
  resolvePistonHeadStrike,
} from '@/Game/swimmerPhysics/react/pistonStrike';
import {
  HazardBandLeadComponentData,
  HazardBandLeadComponentName,
} from '@/Game/ecs-components/HazardBandLead';
import { LAYOUT_CONSTANTS } from '@/Layout';
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

  const leftX =
    container.centerX - container.width / 2;
  const leadStore = frame.components[HazardBandLeadComponentName] as
    | ComponentStore<HazardBandLeadComponentData>
    | undefined;
  const extraSolids = collectPivotArmSolidsNearSwimmer(
    leadStore,
    obstacleRowStore,
    centerY,
    collisionHalfHeight,
    rowHeight,
    leftX,
    blockDimensions.width,
    blockDimensions.height,
    LAYOUT_CONSTANTS.COLUMNS
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
    extraSolids,
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
  let finalY = collisionResult.y;

  const pendulumSolids =
    (swimmer.component.plungeOverrideFramesRemaining ?? 0) > 0
      ? []
      : collectPendulumHeadSolidsNearSwimmer(
          leadStore,
          frame.components,
          obstacleRowStore,
          centerY,
          collisionHalfHeight,
          rowHeight,
          leftX,
          blockDimensions.width,
          blockDimensions.height,
          LAYOUT_CONSTANTS.COLUMNS
        );

  const pendulumStrike = resolvePendulumHeadStrike(
    finalX,
    finalY,
    collisionHalfWidth,
    collisionHalfHeight,
    pendulumSolids,
    frame.deltaSeconds
  );

  if (pendulumStrike.struck) {
    finalX += pendulumStrike.knockbackDeltaX;
    finalY += pendulumStrike.knockbackDeltaY;
  }

  const raisingSpeed = frame.water.raisingSpeed ?? 0;
  const rowDurationSec =
    raisingSpeed > 0 ? blockDimensions.height / raisingSpeed : 0.1;
  const pistonSolids = collectPistonHeadSolidsNearSwimmer(
    leadStore,
    obstacleRowStore,
    centerY,
    collisionHalfHeight,
    rowHeight,
    leftX,
    blockDimensions.width,
    blockDimensions.height,
    rowDurationSec
  );

  // During recovery we still collect solids for separation latch, but skip new strikes.
  const allowNewPistonStrike =
    (swimmer.component.pistonBounceRecoverySecRemaining ?? 0) <= 0.001 &&
    (swimmer.component.plungeOverrideFramesRemaining ?? 0) <= 0;

  const pistonStrike = allowNewPistonStrike
    ? resolvePistonHeadStrike({
        swimmerX: finalX,
        swimmerY: finalY,
        swimmerStartX: centerX,
        swimmerStartY: centerY,
        swimmerHalfWidth: collisionHalfWidth,
        swimmerHalfHeight: collisionHalfHeight,
        velocityX,
        pistonSolids,
        activeContactHazardId: swimmer.component.pistonContactHazardId,
        deltaSeconds: frame.deltaSeconds,
      })
    : {
        struck: false,
        impulseVelocityX: 0,
        impulseVelocityY: 0,
        knockbackDeltaX: 0,
        knockbackDeltaY: 0,
        bounceRecoverySec: 0,
        hazardId: swimmer.component.pistonContactHazardId ?? '',
        forceAngleRad: 0,
      };

  if (pistonStrike.struck) {
    const preBounceX = finalX;
    const preBounceY = finalY;
    finalX += pistonStrike.knockbackDeltaX;
    finalY += pistonStrike.knockbackDeltaY;
    // Re-sweep against rows so bounce cannot tunnel through orange walls.
    const wallSafe = resolveSwimmerAgainstRows({
      x: preBounceX,
      y: preBounceY,
      halfWidth: collisionHalfWidth,
      halfHeight: collisionHalfHeight,
      angle: collisionAngleRad,
      deltaX: finalX - preBounceX,
      deltaY: finalY - preBounceY,
      rowDeltaY: 0,
      rows: nearbyRows,
      extraSolids: [],
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
    });
    finalX = wallSafe.x;
    finalY = wallSafe.y;
  }

  let pistonContactHazardId = swimmer.component.pistonContactHazardId;
  if (pistonStrike.struck) {
    pistonContactHazardId = pistonStrike.hazardId;
  } else if (pistonContactHazardId) {
    if (
      !pistonStillOverlapping(
        finalX,
        finalY,
        collisionHalfWidth,
        collisionHalfHeight,
        pistonContactHazardId,
        pistonSolids
      )
    ) {
      pistonContactHazardId = undefined;
    }
  }

  if (extraSolids.length > 0) {
    let shoveX = 0;
    for (let i = 0; i < extraSolids.length; i++) {
      shoveX += lateralShoveFromArmImpact(
        finalX,
        finalY,
        extraSolids[i],
        frame.deltaSeconds
      );
    }
    if (shoveX !== 0) {
      finalX = Math.max(minX, Math.min(maxX, finalX + shoveX));
    }
  }

  const isBlockedFromAbove =
    pendulumStrike.bypassPinState || pistonStrike.struck
      ? false
      : collisionResult.isPinnedFromAbove;
  const isCollidingWithObstacle =
    collisionResult.isColliding ||
    pendulumStrike.struck ||
    pistonStrike.struck;

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

  const strikeVisualAngle = pendulumStrike.struck
    ? pendulumStrike.forceAngleRad
    : pistonStrike.struck
      ? pistonStrike.forceAngleRad
      : visualAngleRad;

  return {
    finalX,
    finalY,
    visualAngleRad: strikeVisualAngle,
    collisionAngleRad,
    collisionResult,
    isBlockedFromAbove,
    isCollidingWithObstacle,
    proposedDeltaY,
    nearbyRows,
    minX,
    maxX,
    pinnedSlabSurfaceVelocityX: committedSlabSurfaceVelocityX,
    pendulumStrike,
    pistonStrike,
    pistonContactHazardId,
  };
};
