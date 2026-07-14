import type { EventQueueContextType } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useEventQueue/useEventQueue';
import {
  swimmerLocomotionMode,
  swimmerPhysicsTuning,
} from '@/config/swimmerTuning';
import {
  degreesToRadians,
  getCharacterProfileForSwimmer,
  swimmerKinematicsOnTap,
  swimmerKinematicsUpdate,
} from '@/Game/characters/swimmerKinematicsController';
import {
  applyHyperCasualDrag,
  applyHyperCasualTap,
  buildPinnedEscapeContext,
  computeHybridSplashStrength,
  updateHyperCasualLocomotionTelemetry,
} from '@/Game/characters/swimmerHyperCasualPhysics';
import {
  SwimmerAnticipationDentEventType,
  SwimmerDirectionalSplashEventType,
  SwimmerPivotSplashEventType,
} from '@/Game/characters/swimmerLocomotionEvents';
import {
  sampleApproachRowClearancePx,
  sampleHorizontalClearancePx,
} from '@/Game/characters/swimmerClearance';
import {
  computePinnedCoastDragMultiplier,
  shouldEnablePinnedMomentumCoast,
} from '@/Game/characters/swimmerPinnedLocomotion';
import { updateSwimmerVisualLocomotion } from '@/Game/characters/swimmerVisualLocomotion';
import { MovementState } from '@/Game/characters/characterMovementStates';
import { selectRowsNearSwimmerFromComponentStore } from '@/Game/collision/swimmerBlockCollision';
import { sampleLocalFlowAtXNorm } from '@/Game/water/waterSurfaceProfile';
import type {
  BobbingBuoyancyStep,
  HorizontalLocomotionStep,
  SwimmerFrameContext,
  SwimmerSnapshot,
} from '@/Game/swimmerPhysics/types';

const clamp01 = (value: number): number => {
  'worklet';
  return Math.max(0, Math.min(1, value));
};

/**
 * Tap impulse or pan drag — lateral intent before water current pulls the swimmer.
 *
 * @see docs/game-design/swimmer-physics-flow.md#control-modes
 */
export const applyHorizontalLocomotion = (
  frame: SwimmerFrameContext,
  swimmer: SwimmerSnapshot,
  buoyancy: BobbingBuoyancyStep,
  eventQueue: EventQueueContextType
): HorizontalLocomotionStep => {
  'worklet';

  const { component, centerX, centerY, normalizedSpeed, wasPinnedFromAbove } = swimmer;
  const { container, water, startReady, deltaSeconds, obstacleWidth, obstacleRowStore, rowHeight } =
    frame;

  let swimmerVelocityX = component.velocityX ?? 0;
  let locomotion = component.locomotion;
  let kinematicsAngleRad = 0;
  let tapImpulseAppliedThisFrame = false;
  let tapDirectionThisFrame: -1 | 0 | 1 = 0;
  let preDragVelocityX = component.velocityX ?? 0;
  let pinnedMomentumCoast = false;

  const containerLeftX = container.centerX - container.width / 2;
  const currentUVX = clamp01(
    (centerX - containerLeftX) / Math.max(0.0001, container.width)
  );

  const fallbackStart = water.currentGapStartNorm ?? 1 / 6;
  const fallbackEnd = water.currentGapEndNorm ?? 5 / 6;
  const gapCurr01 = water.gapRangesCurr01 ?? [
    fallbackStart,
    fallbackEnd,
    0,
    0,
  ] as [number, number, number, number];
  const gapCurr23 = water.gapRangesCurr23 ?? [0, 0, 0, 0];
  const gapPrev01 = water.gapRangesPrev01 ?? [
    fallbackStart,
    fallbackEnd,
    0,
    0,
  ] as [number, number, number, number];
  const gapPrev23 = water.gapRangesPrev23 ?? [0, 0, 0, 0];

  const localFlow = sampleLocalFlowAtXNorm(
    currentUVX,
    water.gapBlend ?? 1,
    gapCurr01,
    gapCurr23,
    gapPrev01,
    gapPrev23,
    water.flowPerRange,
    water.flowVelocity ?? water.forceDirection ?? 0
  );
  const localFlowVelocityNorm = Math.max(-1, Math.min(1, localFlow));
  const surgeNorm = Math.max(
    0,
    Math.min(1, water.surgeEnergy ?? water.surgePhase ?? 0)
  );
  const waterCurrentVelocityX =
    localFlowVelocityNorm *
    swimmerPhysicsTuning.MAX_WATER_CURRENT_SPEED *
    (1 + swimmerPhysicsTuning.WATER_CURRENT_SURGE_BOOST * surgeNorm);

  if (component.useColumnControl) {
    const profile = getCharacterProfileForSwimmer(locomotion.profileId);
    const navColliderWidth = buoyancy.navColliderExtents.halfWidth * 2;
    const collisionHalfHeight = buoyancy.colliderExtents.halfHeight;

    const clearanceRows = selectRowsNearSwimmerFromComponentStore(
      obstacleRowStore,
      centerY,
      collisionHalfHeight,
      rowHeight
    );
    const clearanceContainer = {
      centerX: container.centerX,
      width: container.width,
    };
    const visualClearancePx = sampleHorizontalClearancePx(
      centerX,
      clearanceRows,
      clearanceContainer
    );
    const tapClearancePx = sampleApproachRowClearancePx(
      centerX,
      centerY,
      clearanceRows,
      clearanceContainer
    );

    const pendingTapDirection = locomotion.pendingTapDirection ?? 0;
    const hasPendingTap = pendingTapDirection === -1 || pendingTapDirection === 1;
    const preAngleDeg =
      locomotion.visualAngleDeg ?? locomotion.currentAngleDeg ?? 0;
    const preDragVelocityX = swimmerVelocityX;
    // Free swim: always full hyper-casual drag. Only while pinned, angle softens it.
    const pinnedCoastDragMultiplier = wasPinnedFromAbove
      ? computePinnedCoastDragMultiplier(preAngleDeg)
      : 1;
    pinnedMomentumCoast =
      wasPinnedFromAbove &&
      shouldEnablePinnedMomentumCoast(preAngleDeg, preDragVelocityX);

    if (swimmerLocomotionMode === 'hybrid') {
      swimmerVelocityX = applyHyperCasualDrag(
        swimmerVelocityX,
        normalizedSpeed,
        profile,
        deltaSeconds,
        undefined,
        pinnedCoastDragMultiplier
      );
    } else if (!hasPendingTap) {
      swimmerVelocityX = swimmerKinematicsUpdate(
        profile,
        locomotion,
        swimmerVelocityX,
        deltaSeconds
      );
    }

    if (hasPendingTap) {
      tapImpulseAppliedThisFrame = true;
      tapDirectionThisFrame = pendingTapDirection;

      if (swimmerLocomotionMode === 'hybrid') {
        const streakMultiplier = locomotion.pendingTapMultiplier ?? 1;
        const pinnedEscape = wasPinnedFromAbove
          ? buildPinnedEscapeContext(
            centerX,
            buoyancy.columnWidth,
            container.centerX,
            container.width,
            component.pinnedCeilingMinX,
            component.pinnedCeilingMaxX
          )
          : undefined;
        const tapResult = applyHyperCasualTap(
          profile,
          locomotion,
          swimmerVelocityX,
          pendingTapDirection,
          buoyancy.columnWidth,
          normalizedSpeed,
          streakMultiplier,
          waterCurrentVelocityX,
          tapClearancePx,
          navColliderWidth,
          pinnedEscape
        );
        swimmerVelocityX = tapResult.velocityX;
        locomotion.pendingTapMultiplier = 1;

        if (tapResult.isSoftReverseTap) {
          eventQueue.addEvent({
            type: SwimmerPivotSplashEventType,
            payload: {
              entityId: swimmer.entity,
              prefabKey: profile.splashFxPrefabKey,
              impactSpeed: Math.abs(swimmerVelocityX),
              x: centerX,
              y: centerY,
              direction: pendingTapDirection,
            },
          });
        } else {
          eventQueue.addEvent({
            type: SwimmerAnticipationDentEventType,
            payload: {
              entityId: swimmer.entity,
              x: centerX,
              y: centerY,
              direction: pendingTapDirection,
            },
          });
          eventQueue.addEvent({
            type: SwimmerDirectionalSplashEventType,
            payload: {
              entityId: swimmer.entity,
              x: centerX,
              y: centerY,
              direction: pendingTapDirection,
              tier: tapResult.visualStrokeTier,
              strength: computeHybridSplashStrength(
                tapResult.visualStrokeTier,
                tapResult.streakMultiplier
              ),
            },
          });
        }
      } else {
        const prevMovementState = locomotion.movementState;
        swimmerVelocityX = swimmerKinematicsOnTap(
          profile,
          locomotion,
          swimmerVelocityX,
          pendingTapDirection,
          (prefabKey, impactSpeed) => {
            eventQueue.addEvent({
              type: SwimmerPivotSplashEventType,
              payload: {
                entityId: swimmer.entity,
                prefabKey,
                impactSpeed,
                x: centerX,
                y: centerY,
                direction: pendingTapDirection,
              },
            });
          }
        );
        if (
          locomotion.movementState === MovementState.ANTICIPATION &&
          prevMovementState !== MovementState.PIVOT_BRAKE
        ) {
          eventQueue.addEvent({
            type: SwimmerAnticipationDentEventType,
            payload: {
              entityId: swimmer.entity,
              x: centerX,
              y: centerY,
              direction: pendingTapDirection,
            },
          });
          eventQueue.addEvent({
            type: SwimmerDirectionalSplashEventType,
            payload: {
              entityId: swimmer.entity,
              x: centerX,
              y: centerY,
              direction: pendingTapDirection,
              tier: locomotion.currentTier,
              strength: Math.min(1.35, 0.75 + locomotion.currentTier * 0.12),
            },
          });
        }
      }
      locomotion.pendingTapDirection = 0;
    }

    if (swimmerLocomotionMode === 'hybrid') {
      updateHyperCasualLocomotionTelemetry(locomotion, swimmerVelocityX);
    }

    updateSwimmerVisualLocomotion(
      profile,
      locomotion,
      swimmerVelocityX,
      visualClearancePx,
      obstacleWidth,
      deltaSeconds,
      startReady,
      normalizedSpeed,
      wasPinnedFromAbove,
      tapDirectionThisFrame
    );
    kinematicsAngleRad = degreesToRadians(
      locomotion.visualAngleDeg ?? locomotion.currentAngleDeg
    );
  } else {
    const baseDrag = 0.9;
    const extraDrag = 0.25 * normalizedSpeed;
    const drag = Math.max(0, Math.min(1, baseDrag - extraDrag));
    swimmerVelocityX *= drag;
  }

  return {
    velocityX: swimmerVelocityX,
    locomotion,
    kinematicsAngleRad,
    tapImpulseAppliedThisFrame,
    tapDirectionThisFrame,
    waterCurrentVelocityX,
    preDragVelocityX,
    pinnedMomentumCoast,
  };
};
