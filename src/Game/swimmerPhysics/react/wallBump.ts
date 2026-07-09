import type { EventQueueContextType } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useEventQueue/useEventQueue';
import {
  WaterComponentName,
  type WaterComponentData,
} from '@/Game/ecs-components/Water';
import { bounceDisruptorTuning, swimmerPhysicsTuning } from '@/config/swimmerTuning';
import {
  computeReboundVelocityX,
  shouldDebounceWallBump,
  shouldTriggerBounceDisruptor,
} from '@/Game/characters/swimmerBounceDisruptor';
import { SwimmerWallBumpEventType } from '@/Game/characters/swimmerLocomotionEvents';
import type {
  CollisionResolutionStep,
  ProposeMotionResult,
  SwimmerFrameContext,
  SwimmerSnapshot,
  WallBumpStep,
} from '@/Game/swimmerPhysics/types';

/**
 * Hit a side pillar: velocity dies, optional bounce disruptor + wall splash.
 *
 * @see docs/game-design/swimmer-physics-flow.md#per-frame-pipeline
 */
export const applyWallBump = (
  frame: SwimmerFrameContext,
  swimmer: SwimmerSnapshot,
  proposed: ProposeMotionResult,
  collision: CollisionResolutionStep,
  eventQueue: EventQueueContextType
): WallBumpStep => {
  'worklet';

  let swimmerVelocityX = proposed.velocityX;
  let locomotion = proposed.locomotion;
  let movementBlockedThisFrame = false;

  const appliedDx = collision.finalX - swimmer.centerX;
  const escapedOrMovedFreely =
    Math.abs(proposed.proposedDeltaX) > 0.5 &&
    Math.sign(appliedDx) === Math.sign(proposed.proposedDeltaX) &&
    Math.abs(appliedDx) >= Math.abs(proposed.proposedDeltaX) * 0.25;

  const blockedDir = collision.collisionResult.sideBlockedDirection;

  if (
    !proposed.tapImpulseAppliedThisFrame &&
    !escapedOrMovedFreely &&
    blockedDir !== 0
  ) {
    const movementBlocked =
      Math.sign(proposed.proposedDeltaX) === blockedDir &&
      Math.abs(appliedDx) < Math.abs(proposed.proposedDeltaX) * 0.2;
    if (movementBlocked && Math.sign(swimmerVelocityX) === blockedDir) {
      movementBlockedThisFrame = true;
      const impactSpeed = Math.abs(swimmerVelocityX);
      swimmerVelocityX = 0;

      if (
        shouldTriggerBounceDisruptor(
          movementBlocked,
          collision.isBlockedFromAbove,
          blockedDir
        )
      ) {
        const clearance01 = locomotion.clearance01 ?? 1;
        const reboundScale =
          bounceDisruptorTuning.reboundSpeedScale *
          Math.max(bounceDisruptorTuning.narrowReboundScaleMin, clearance01);
        swimmerVelocityX = computeReboundVelocityX(
          blockedDir,
          swimmerPhysicsTuning.MAX_HORIZONTAL_SPEED,
          reboundScale
        );
        const nowMs = Date.now();
        const lastBumpMs = locomotion.lastWallBumpMs ?? 0;
        if (
          shouldDebounceWallBump(
            nowMs,
            lastBumpMs,
            bounceDisruptorTuning.debounceMs
          )
        ) {
          locomotion.lastWallBumpMs = nowMs;
          locomotion.wallBumpSquashTimer =
            bounceDisruptorTuning.squashDurationSec;
          if (bounceDisruptorTuning.calmnessDip > 0) {
            frame.ecs.updateComponent<WaterComponentData>(
              frame.waterEntity,
              WaterComponentName,
              (water) => {
                'worklet';
                water.calmness = Math.max(
                  0,
                  (water.calmness ?? 0.5) - bounceDisruptorTuning.calmnessDip
                );
              }
            );
          }
          eventQueue.addEvent({
            type: SwimmerWallBumpEventType,
            payload: {
              entityId: swimmer.entity,
              x: collision.finalX,
              y: collision.finalY,
              direction: blockedDir,
              impactSpeed,
            },
          });
        }
      }
    }
  }

  return {
    velocityX: swimmerVelocityX,
    locomotion,
    movementBlockedThisFrame,
  };
};
