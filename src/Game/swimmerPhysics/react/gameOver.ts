import type { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import type { SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { ScoreComponentName } from '@/Game/ecs-components/Score';
import {
  getOrCreateRunResultEntity,
  RunResultComponentName,
  type RunResultComponentData,
} from '@/Game/ecs-components/RunResult';
import {
  GameSessionComponentName,
  type GameSessionComponentData,
} from '@/Game/ecs-components/GameSession';
import { getGameSessionEntity } from '@/Game/session/gameSessionQuery';
import { markGameSessionGameOver } from '@/Game/session/beginGameplay';
import { persistRunFinishedRunBridge } from '@/Game/persistence/persistRunFinishedRunBridge';
import { getSwimmerColliderExtents } from '@/Game/characters/swimmerCollider';
import { isPinnedBodyFullyOffScreen } from '@/Game/characters/pinnedVisualLayout';
import { swimmerDeformationTuning } from '@/config/swimmerDeformationTuning';
import { swimmerVisualTuning } from '@/config/swimmerVisualTuning';
import type {
  CollisionResolutionStep,
  GameOverStep,
  ProposeMotionResult,
  SwimmerFrameContext,
  SwimmerSnapshot,
} from '@/Game/swimmerPhysics/types';

const dispatchGameOver = (
  ecs: ECS,
  components: Record<string, unknown>
): GameOverStep => {
  'worklet';
  let finalScore = 0;
  const scoreStore = components[ScoreComponentName] as
    | { forEach: (fn: (entity: number, data: { score: number }) => void) => void }
    | undefined;
  scoreStore?.forEach((_entity, scoreData) => {
    finalScore = Math.max(finalScore, Math.floor(scoreData.score));
  });

  const runResultEntity = getOrCreateRunResultEntity(ecs);
  ecs.updateComponent<RunResultComponentData>(
    runResultEntity,
    RunResultComponentName,
    (runResult) => {
      runResult.finalScore = finalScore;
    }
  );

  const sessionEntity = getGameSessionEntity(components as never);
  if (typeof sessionEntity === 'number') {
    const sessionBefore = (
      components[GameSessionComponentName] as {
        get: (entity: number) => GameSessionComponentData | undefined;
      }
    )?.get(sessionEntity);
    const flooredScore = Math.floor(finalScore);
    const isNewBest =
      !!sessionBefore && flooredScore > (sessionBefore.bestScore ?? 0);
    markGameSessionGameOver(ecs, sessionEntity, finalScore);
    scheduleOnRN(persistRunFinishedRunBridge, flooredScore, isNewBest);
  }

  return { shouldDispatchGameOver: true };
};

/**
 * Pinned body top past the screen bottom — run ends, score persists on RN thread.
 *
 * @see docs/game-design/swimmer-physics-flow.md#per-frame-pipeline
 */
export const evaluateGameOver = (
  frame: SwimmerFrameContext,
  swimmer: SwimmerSnapshot,
  proposed: ProposeMotionResult,
  collision: CollisionResolutionStep,
  dimensions: SharedValue<{ width: number; height: number }>,
  ecs: ECS,
  components: Record<string, unknown>
): GameOverStep => {
  'worklet';

  if (swimmer.component.disableGameOver === true) {
    return { shouldDispatchGameOver: false };
  }

  if (swimmer.component.gameOverDispatched) {
    return { shouldDispatchGameOver: false };
  }

  const contactHalfH = getSwimmerColliderExtents(
    proposed.columnWidth,
    true
  ).halfHeight;
  const contactHalfW = getSwimmerColliderExtents(
    proposed.columnWidth,
    true
  ).halfWidth;
  const meshBaseHeight =
    swimmer.component.meshBaseHeight ??
    proposed.columnWidth *
      swimmerVisualTuning.VISUAL_WIDTH_COLUMN_RATIO *
      swimmerVisualTuning.VISUAL_HEIGHT_TO_WIDTH_RATIO;
  const bodyScaleY =
    swimmer.component.locomotion.meshScaleY ??
    swimmerDeformationTuning.PINNED_SCALE_Y;

  if (swimmer.component.pendulumKnockbackActive === true) {
    const screenW = dimensions.value.width;
    const screenH = dimensions.value.height;
    const launchedOffHorizontal =
      collision.finalX + contactHalfW < 0 ||
      collision.finalX - contactHalfW > screenW;
    const launchedOffBottom = isPinnedBodyFullyOffScreen(
      collision.finalY,
      contactHalfH,
      meshBaseHeight,
      bodyScaleY,
      screenH
    );
    const slammedIntoWall =
      collision.collisionResult.isSideBlocked &&
      (swimmer.component.plungeOverrideFramesRemaining ?? 0) > 0;

    if (launchedOffHorizontal || launchedOffBottom || slammedIntoWall) {
      return dispatchGameOver(ecs, components);
    }
  }

  if (!collision.isBlockedFromAbove) {
    return { shouldDispatchGameOver: false };
  }

  const shouldDie = isPinnedBodyFullyOffScreen(
    collision.finalY,
    contactHalfH,
    meshBaseHeight,
    bodyScaleY,
    dimensions.value.height
  );

  if (!shouldDie) {
    return { shouldDispatchGameOver: false };
  }

  return dispatchGameOver(ecs, components);
};
