import type { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import type { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import {
  GameSessionComponentData,
  GameSessionComponentName,
} from '@/Game/ecs-components/GameSession';
import { gameSessionTuning } from '@/config/swimmerTuning';

const { OVERLAY_FADE_MS, SPEED_RAMP_MS } = gameSessionTuning;

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
      s.animTimeSec = 0;
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
      s.tutorialFadeStartMs = 0;
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
      s.tutorialFadeStartMs = 0;
    }
  );
};

/** Fade out the tap-left/right tutorial after the player's first steer tap. */
export const dismissTutorial = (
  ecs: ECS,
  sessionEntity: Entity
): void => {
  'worklet';
  const session = ecs.components[GameSessionComponentName]?.get(
    sessionEntity
  ) as GameSessionComponentData | undefined;
  if (
    !session ||
    session.phase !== 'playing' ||
    session.tutorialFadeStartMs > 0
  ) {
    return;
  }

  ecs.updateComponent<GameSessionComponentData>(
    sessionEntity,
    GameSessionComponentName,
    (s) => {
      s.tutorialFadeStartMs = Date.now();
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

export const computeTutorialOpacity = (
  session: GameSessionComponentData,
  nowMs: number
): number => {
  'worklet';
  if (session.phase === 'game_over') return 0;
  if (session.phase === 'start_ready') return 0;
  if (session.phase === 'playing') {
    if (session.tutorialFadeStartMs <= 0) return 1;
    const t = Math.min(
      1,
      (nowMs - session.tutorialFadeStartMs) / OVERLAY_FADE_MS
    );
    return Math.max(0, 1 - easeInOutSine(t));
  }
  return 0;
};

/** Ease-out so gameplay speed is reached quickly after tap (avoids a long sluggish crawl). */
export const easeOutCubic = (t: number): number => {
  'worklet';
  const c = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - c, 3);
};

export const computeSpeedRampMultiplier = (
  session: GameSessionComponentData,
  nowMs: number
): number => {
  'worklet';
  if (session.speedRampStartMs <= 0) return 0;
  const t = Math.min(1, (nowMs - session.speedRampStartMs) / SPEED_RAMP_MS);
  return easeOutCubic(t);
};

export const isSessionSpeedRampActive = (
  session: GameSessionComponentData,
  nowMs: number
): boolean => {
  'worklet';
  return (
    session.phase === 'playing' &&
    session.speedRampStartMs > 0 &&
    computeSpeedRampMultiplier(session, nowMs) < 1
  );
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
