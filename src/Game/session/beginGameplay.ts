import type { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import type { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import {
  GameSessionComponentData,
  GameSessionComponentName,
} from '@/Game/ecs-components/GameSession';

const OVERLAY_FADE_MS = 240;
const SPEED_RAMP_MS = 600;

/** Single entry to transition from start_ready → playing. */
export const beginGameplay = (
  ecs: ECS,
  sessionEntity: Entity
): void => {
  'worklet';
  const session = ecs.components[GameSessionComponentName]?.get(
    sessionEntity
  ) as GameSessionComponentData | undefined;
  if (!session || session.phase !== 'start_ready') {
    return;
  }

  const nowMs = Date.now();
  ecs.updateComponent<GameSessionComponentData>(
    sessionEntity,
    GameSessionComponentName,
    (s) => {
      s.phase = 'playing';
      s.overlayFadeStartMs = nowMs;
      s.speedRampStartMs = nowMs;
    }
  );

  // TODO: audio hook — start_button_press, game_start_splash
};

export const resetGameSessionToStartReady = (
  ecs: ECS,
  sessionEntity: Entity
): void => {
  'worklet';
  ecs.updateComponent<GameSessionComponentData>(
    sessionEntity,
    GameSessionComponentName,
    (s) => {
      s.phase = 'start_ready';
      s.overlayOpacity = 1;
      s.overlayFadeStartMs = 0;
      s.speedRampStartMs = 0;
      s.ctaPressStartMs = 0;
      s.animTimeSec = 0;
    }
  );
};

export const markGameSessionGameOver = (
  ecs: ECS,
  sessionEntity: Entity
): void => {
  'worklet';
  ecs.updateComponent<GameSessionComponentData>(
    sessionEntity,
    GameSessionComponentName,
    (s) => {
      s.phase = 'game_over';
      s.overlayOpacity = 0;
      s.overlayFadeStartMs = 0;
    }
  );
};

export const easeInOutSine = (t: number): number => {
  'worklet';
  return -(Math.cos(Math.PI * t) - 1) / 2;
};

export const computeOverlayOpacity = (
  session: GameSessionComponentData,
  nowMs: number
): number => {
  'worklet';
  if (session.phase === 'game_over') return 0;
  if (session.phase === 'start_ready' && session.overlayFadeStartMs <= 0) {
    return 1;
  }
  if (session.overlayFadeStartMs <= 0) return session.overlayOpacity;
  const t = Math.min(1, (nowMs - session.overlayFadeStartMs) / OVERLAY_FADE_MS);
  return Math.max(0, 1 - easeInOutSine(t));
};

export const computeSpeedRampMultiplier = (
  session: GameSessionComponentData,
  nowMs: number
): number => {
  'worklet';
  if (session.speedRampStartMs <= 0) return 0;
  const t = Math.min(1, (nowMs - session.speedRampStartMs) / SPEED_RAMP_MS);
  return easeInOutSine(t);
};

export const computeRaisingSpeedForSession = (
  session: GameSessionComponentData,
  nowMs: number
): number => {
  'worklet';
  if (session.phase === 'start_ready') {
    return session.visualRaisingSpeed;
  }
  if (session.phase === 'playing' && session.speedRampStartMs > 0) {
    const ramp = computeSpeedRampMultiplier(session, nowMs);
    return (
      session.visualRaisingSpeed +
      (session.gameplayRaisingSpeed - session.visualRaisingSpeed) * ramp
    );
  }
  return session.gameplayRaisingSpeed;
};
