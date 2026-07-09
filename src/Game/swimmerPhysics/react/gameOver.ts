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
import type {
  CollisionResolutionStep,
  GameOverStep,
  ProposeMotionResult,
  SwimmerFrameContext,
  SwimmerSnapshot,
} from '@/Game/swimmerPhysics/types';

/**
 * Pinned past the bottom edge — run ends, score persists on RN thread.
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

  const navColliderExtents = getSwimmerColliderExtents(proposed.columnWidth, false);
  const swimmerBottomY = collision.finalY + navColliderExtents.halfHeight;
  const pinnedPastContainerBottom =
    collision.isBlockedFromAbove && swimmerBottomY > frame.containerBottom;
  const pinnedPastScreenBottom =
    collision.isBlockedFromAbove &&
    collision.finalY > dimensions.value.height - 8;

  if (
    !(pinnedPastContainerBottom || pinnedPastScreenBottom) ||
    swimmer.component.gameOverDispatched
  ) {
    return { shouldDispatchGameOver: false };
  }

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
