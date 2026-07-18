import type { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import {
  RenderComponentName,
  type RenderComponentData,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import {
  SwimmerComponentName,
  type SwimmerComponentData,
} from '@/Game/ecs-components/Swimmer';
import { swimmerVisualTuning } from '@/config/swimmerVisualTuning';
import type {
  CollisionResolutionStep,
  GameOverStep,
  ProposeMotionResult,
  SwimmerSnapshot,
  WallBumpStep,
} from '@/Game/swimmerPhysics/types';

/**
 * Start overlay: idle bob at center X — no collision, swimmer waits to tap.
 *
 * @see docs/game-design/swimmer-physics-flow.md#game-phases
 */
export const commitStartReadyPose = (
  ecs: ECS,
  swimmer: SwimmerSnapshot,
  proposed: ProposeMotionResult
): void => {
  'worklet';

  const idleAngle =
    (Math.sin(proposed.bobbingPhase * 0.85) *
      swimmerVisualTuning.START_READY_ROLL_DEG *
      Math.PI) /
    180;

  ecs.updateComponent<RenderComponentData>(
    swimmer.entity,
    RenderComponentName,
    (render) => {
      render.position = { x: swimmer.centerX, y: proposed.targetY };
      render.angle = idleAngle;
    }
  );

  ecs.updateComponent<SwimmerComponentData>(
    swimmer.entity,
    SwimmerComponentName,
    (swimmerData) => {
      swimmerData.y = proposed.targetY;
      swimmerData.waterSurfaceY = proposed.curveSurfaceY;
      swimmerData.bobbingPhase = proposed.bobbingPhase;
      swimmerData.locomotion.pendingTapDirection = 0;
      swimmerData.angle = idleAngle;
    }
  );
};

/**
 * Single writer for gameplay swimmer + render position after resolve/react.
 *
 * @see docs/game-design/swimmer-physics-flow.md#per-frame-pipeline
 */
export const commitSwimmerGameplayState = (
  ecs: ECS,
  swimmer: SwimmerSnapshot,
  proposed: ProposeMotionResult,
  collision: CollisionResolutionStep,
  wallBump: WallBumpStep,
  gameOver: GameOverStep,
  deltaSeconds = 1 / 60
): void => {
  'worklet';

  const swimmerAngle = collision.visualAngleRad;
  const blockedDir = collision.collisionResult.sideBlockedDirection;
  const strike = collision.pendulumStrike;
  const pistonStrike = collision.pistonStrike;
  const dt = Math.max(0.001, deltaSeconds);

  ecs.updateComponent<RenderComponentData>(
    swimmer.entity,
    RenderComponentName,
    (render) => {
      'worklet';
      render.position = { x: collision.finalX, y: collision.finalY };
      render.angle = swimmerAngle;
      // PS-TODO-012: apply 3-frame squash (scaleX 0.6, scaleY 1.2) when pistonStrike.struck.
    }
  );

  ecs.updateComponent<SwimmerComponentData>(
    swimmer.entity,
    SwimmerComponentName,
    (swimmerData) => {
      'worklet';
      swimmerData.velocityX = wallBump.velocityX;
      swimmerData.x = collision.finalX;
      swimmerData.y = collision.finalY;
      swimmerData.waterSurfaceY = proposed.curveSurfaceY;
      swimmerData.isCollidingWithObstacle = collision.isCollidingWithObstacle;
      swimmerData.isPinnedFromAbove = collision.isBlockedFromAbove;
      swimmerData.ceilingBrushThisFrame =
        collision.collisionResult.ceilingBrushContact;
      swimmerData.pinnedCeilingMinX = collision.isBlockedFromAbove
        ? collision.collisionResult.pinnedCeilingMinX
        : undefined;
      swimmerData.pinnedCeilingMaxX = collision.isBlockedFromAbove
        ? collision.collisionResult.pinnedCeilingMaxX
        : undefined;
      swimmerData.isSideBlocked = collision.collisionResult.isSideBlocked;
      swimmerData.movementBlockedThisFrame = wallBump.movementBlockedThisFrame;
      swimmerData.sideBlockedDirection = blockedDir;
      swimmerData.isInInitialPhase = swimmer.component.isInInitialPhase;
      swimmerData.column = swimmer.component.column;
      swimmerData.useColumnControl = swimmer.component.useColumnControl;
      swimmerData.bobbingPhase = proposed.bobbingPhase;
      swimmerData.locomotion = wallBump.locomotion;
      swimmerData.gameOverDispatched =
        swimmer.component.gameOverDispatched || gameOver.shouldDispatchGameOver;
      swimmerData.angle = swimmerAngle;
      swimmerData.pistonContactHazardId = collision.pistonContactHazardId;

      if (strike?.struck) {
        swimmerData.velocityX = strike.impulseVelocityX;
        swimmerData.fallingVelocityY = strike.impulseVelocityY;
        swimmerData.plungeOverrideFramesRemaining = strike.knockbackOverrideFrames;
        swimmerData.pendulumKnockbackActive = strike.triggerGameOverOnHit;
        swimmerData.pendulumForceAngleRad = strike.forceAngleRad;
      } else if ((swimmerData.plungeOverrideFramesRemaining ?? 0) > 0) {
        swimmerData.plungeOverrideFramesRemaining =
          (swimmerData.plungeOverrideFramesRemaining ?? 0) - 1;
      } else if (swimmerData.pendulumKnockbackActive) {
        swimmerData.pendulumKnockbackActive = false;
        swimmerData.pendulumForceAngleRad = undefined;
      }

      // PS-TODO-009: dispatch bounce audio/haptic event when pistonStrike.struck.
      if (pistonStrike?.struck) {
        swimmerData.velocityX = pistonStrike.impulseVelocityX;
        swimmerData.fallingVelocityY = pistonStrike.impulseVelocityY;
        swimmerData.pistonBounceRecoverySecRemaining =
          pistonStrike.bounceRecoverySec;
        swimmerData.pistonContactHazardId = pistonStrike.hazardId;
      } else if ((swimmerData.pistonBounceRecoverySecRemaining ?? 0) > 0) {
        // Time-based decay — same duration at 60Hz and 120Hz.
        swimmerData.pistonBounceRecoverySecRemaining = Math.max(
          0,
          (swimmerData.pistonBounceRecoverySecRemaining ?? 0) - dt
        );
      }
    }
  );
};
