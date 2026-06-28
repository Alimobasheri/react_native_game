import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';
import type { RunBlueprint } from '@/Game/path/runBlueprint';

export const GameSessionComponentName = 'GameSession';

export type GameSessionPhase = 'start_ready' | 'playing' | 'game_over';

export type GameSessionComponentData = {
  phase: GameSessionPhase;
  /** 1 = fully visible overlay, 0 = hidden. */
  overlayOpacity: number;
  gameTitle: string;
  bestScore: number;
  shopEnabled: boolean;
  gameplayRaisingSpeed: number;
  visualRaisingSpeed: number;
  /** Accumulated animation time in seconds (overlay loops). */
  animTimeSec: number;
  /** Epoch ms when title/CTA slide-out began; 0 = idle. */
  overlayFadeStartMs: number;
  /** Epoch ms when title/CTA slide-in began; 0 = skip intro. */
  overlayIntroStartMs: number;
  /** Epoch ms when water speed ramp began; 0 = not ramping. */
  speedRampStartMs: number;
  /** CTA press squash animation start; 0 = idle. */
  ctaPressStartMs: number;
  /** Epoch ms when tutorial fade began; 0 = tutorial still visible during play. */
  tutorialFadeStartMs: number;
  /** Epoch ms when game-over dim/panel intro began; 0 = hidden. */
  gameOverOverlayIntroStartMs: number;
  /** Epoch ms when game-over overlay fade-out began (retry); 0 = idle. */
  gameOverOverlayFadeStartMs: number;
  /** Retry button press squash; 0 = idle. */
  gameOverRetryPressStartMs: number;
  /** Score count-up on game-over panel; 0 = idle. */
  gameOverScoreAnimStartMs: number;
  /** Final run score shown on the game-over panel. */
  gameOverFinalScore: number;
  /** True when the last run beat the stored best score. */
  gameOverIsNewBest: boolean;
  /** u32 master seed for this app session — set once at entity create. */
  sessionSeed: number;
  /** 0 = never started; 1 = first run of session. */
  runAttemptIndex: number;
  /** Master seed for current run (mirrors runBlueprint.runSeed). */
  runSeed: number;
  /** Per-run identity roll — Phase 2+ consumes for generator routing. */
  runBlueprint: RunBlueprint | undefined;
};

export const createGameSessionComponent = (
  data: Partial<GameSessionComponentData> & {
    gameplayRaisingSpeed: number;
    visualRaisingSpeed: number;
  }
): Component<GameSessionComponentData> => {
  'worklet';
  const sessionSeed =
    (data.sessionSeed ?? data.overlayIntroStartMs ?? Date.now()) >>> 0;
  return {
    name: GameSessionComponentName,
    data: {
      phase: data.phase ?? 'start_ready',
      overlayOpacity: data.overlayOpacity ?? 1,
      gameTitle: data.gameTitle ?? 'FLOOD RUSH',
      bestScore: data.bestScore ?? 0,
      shopEnabled: data.shopEnabled ?? false,
      gameplayRaisingSpeed: data.gameplayRaisingSpeed,
      visualRaisingSpeed: data.visualRaisingSpeed,
      animTimeSec: data.animTimeSec ?? 0,
      overlayFadeStartMs: data.overlayFadeStartMs ?? 0,
      overlayIntroStartMs: data.overlayIntroStartMs ?? 0,
      speedRampStartMs: data.speedRampStartMs ?? 0,
      ctaPressStartMs: data.ctaPressStartMs ?? 0,
      tutorialFadeStartMs: data.tutorialFadeStartMs ?? 0,
      gameOverOverlayIntroStartMs: data.gameOverOverlayIntroStartMs ?? 0,
      gameOverOverlayFadeStartMs: data.gameOverOverlayFadeStartMs ?? 0,
      gameOverRetryPressStartMs: data.gameOverRetryPressStartMs ?? 0,
      gameOverScoreAnimStartMs: data.gameOverScoreAnimStartMs ?? 0,
      gameOverFinalScore: data.gameOverFinalScore ?? 0,
      gameOverIsNewBest: data.gameOverIsNewBest ?? false,
      sessionSeed,
      runAttemptIndex: data.runAttemptIndex ?? 0,
      runSeed: data.runSeed ?? 0,
      runBlueprint: data.runBlueprint,
    },
  };
};
