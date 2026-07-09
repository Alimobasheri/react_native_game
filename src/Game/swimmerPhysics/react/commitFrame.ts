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
  gameOver: GameOverStep
): void => {
  'worklet';

  const swimmerAngle = collision.visualAngleRad;
  const blockedDir = collision.collisionResult.sideBlockedDirection;

  ecs.updateComponent<RenderComponentData>(
    swimmer.entity,
    RenderComponentName,
    (render) => {
      'worklet';
      render.position = { x: collision.finalX, y: collision.finalY };
      render.angle = swimmerAngle;
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
    }
  );
};
