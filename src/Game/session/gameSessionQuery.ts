import type { ComponentStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/component';
import { firstDataFromStore, firstEntityFromStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/query';
import {
  GameSessionComponentData,
  GameSessionComponentName,
  GameSessionPhase,
} from '@/Game/ecs-components/GameSession';
import {
  resolvePacingRunContext,
  type PacingRunContext,
} from '@/Game/path/cyclePersonality';

export const getGameSessionEntity = (
  components: Record<string, ComponentStore<unknown>>
): number | undefined => {
  'worklet';
  return firstEntityFromStore(components[GameSessionComponentName]);
};

export const getGameSession = (
  components: Record<string, ComponentStore<unknown>>
): GameSessionComponentData | undefined => {
  'worklet';
  return firstDataFromStore(
    components[GameSessionComponentName]
  ) as GameSessionComponentData | undefined;
};

/** Same pacing context ObstacleSystem uses for macro phase boundaries. */
export const getPacingRunContextFromComponents = (
  components: Record<string, ComponentStore<unknown>>
): PacingRunContext | undefined => {
  'worklet';
  const session = getGameSession(components);
  return resolvePacingRunContext(
    session?.runBlueprint,
    session?.runAttemptIndex ?? 0
  );
};

export const isStartReady = (
  session: GameSessionComponentData | undefined
): boolean => {
  'worklet';
  if (!session) return true;
  return session.phase === 'start_ready';
};

export const isPlayingPhase = (
  session: GameSessionComponentData | undefined
): boolean => {
  'worklet';
  return session?.phase === 'playing';
};

export const isGameOverPhase = (
  session: GameSessionComponentData | undefined
): boolean => {
  'worklet';
  return session?.phase === 'game_over';
};

export type GameSessionPhaseCheck = GameSessionPhase;
