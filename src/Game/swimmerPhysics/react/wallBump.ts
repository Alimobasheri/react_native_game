import type { EventQueueContextType } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useEventQueue/useEventQueue';
import { blendPinnedSlabSurfaceVelocityX } from '@/Game/characters/swimmerPinnedLocomotion';
import { logSwimmerPinnedDebug } from '@/Game/debug/swimmerPinnedDebug';
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
  _eventQueue: EventQueueContextType
): WallBumpStep => {
  'worklet';

  let swimmerVelocityX = proposed.velocityX;
  let locomotion = proposed.locomotion;
  let movementBlockedThisFrame = false;

  if (
    (swimmer.wasPinnedFromAbove || collision.isBlockedFromAbove) &&
    collision.pinnedSlabSurfaceVelocityX !== 0
  ) {
    swimmerVelocityX = blendPinnedSlabSurfaceVelocityX(
      swimmerVelocityX,
      collision.pinnedSlabSurfaceVelocityX,
      frame.deltaSeconds
    );
  }

  if (swimmer.wasPinnedFromAbove || collision.isBlockedFromAbove) {
    const angleDeg =
      proposed.locomotion.visualAngleDeg ??
      proposed.locomotion.currentAngleDeg ??
      0;
    logSwimmerPinnedDebug(
      `[PIN] ang=${angleDeg.toFixed(0)} vx=${swimmerVelocityX.toFixed(0)} ` +
        `dx=${(collision.finalX - swimmer.centerX).toFixed(1)} ` +
        `coast=${proposed.pinnedMomentumCoast ? 1 : 0} ` +
        `slab=${collision.pinnedSlabSurfaceVelocityX.toFixed(0)} ` +
        `side=${collision.collisionResult.sideBlockedDirection}`
    );
  }

  const appliedDx = collision.finalX - swimmer.centerX;
  const escapedOrMovedFreely =
    Math.abs(proposed.proposedDeltaX) > 0.5 &&
    Math.sign(appliedDx) === Math.sign(proposed.proposedDeltaX) &&
    Math.abs(appliedDx) >= Math.abs(proposed.proposedDeltaX) * 0.25;

  const blockedDir = collision.collisionResult.sideBlockedDirection;

  if (
    !proposed.pinnedMomentumCoast &&
    !proposed.tapImpulseAppliedThisFrame &&
    !escapedOrMovedFreely &&
    blockedDir !== 0
  ) {
    const movementBlocked =
      Math.sign(proposed.proposedDeltaX) === blockedDir &&
      Math.abs(appliedDx) < Math.abs(proposed.proposedDeltaX) * 0.2;
    if (movementBlocked && Math.sign(swimmerVelocityX) === blockedDir) {
      movementBlockedThisFrame = true;
    }
  }

  return {
    velocityX: swimmerVelocityX,
    locomotion,
    movementBlockedThisFrame,
  };
};
