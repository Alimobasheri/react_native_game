import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';

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
  /** Epoch ms when overlay fade began; 0 = not fading. */
  overlayFadeStartMs: number;
  /** Epoch ms when water speed ramp began; 0 = not ramping. */
  speedRampStartMs: number;
  /** CTA press squash animation start; 0 = idle. */
  ctaPressStartMs: number;
};

export const createGameSessionComponent = (
  data: Partial<GameSessionComponentData> & {
    gameplayRaisingSpeed: number;
    visualRaisingSpeed: number;
  }
): Component<GameSessionComponentData> => {
  'worklet';
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
      speedRampStartMs: data.speedRampStartMs ?? 0,
      ctaPressStartMs: data.ctaPressStartMs ?? 0,
    },
  };
};
