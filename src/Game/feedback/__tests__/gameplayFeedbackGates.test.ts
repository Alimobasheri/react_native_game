import type { GameSessionComponentData } from '@/Game/ecs-components/GameSession';
import { isGameplayJuiceActive } from '../gameplayFeedbackGates';

const baseSession = (): GameSessionComponentData =>
  ({
    phase: 'playing',
    overlayOpacity: 0,
    overlayFadeStartMs: 0,
    tutorialFadeStartMs: 0,
    bestScore: 0,
    gameTitle: 'FLOOD RUSH',
    shopEnabled: false,
    gameplayRaisingSpeed: 1,
    visualRaisingSpeed: 1,
    animTimeSec: 0,
    overlayIntroStartMs: 0,
    speedRampStartMs: 0,
    ctaPressStartMs: 0,
    gameOverOverlayIntroStartMs: 0,
    gameOverOverlayFadeStartMs: 0,
    gameOverRetryPressStartMs: 0,
    gameOverScoreAnimStartMs: 0,
    gameOverFinalScore: 0,
    gameOverIsNewBest: false,
    sessionSeed: 1,
    runAttemptIndex: 1,
    runSeed: 1,
    lifetimeRunCount: 0,
    deathHistory: [],
  }) as GameSessionComponentData;

describe('isGameplayJuiceActive', () => {
  it('is false when master enabled flag is false', () => {
    expect(isGameplayJuiceActive(baseSession(), false, 0, false)).toBe(false);
  });

  it('is false during start_ready', () => {
    const s = baseSession();
    s.phase = 'start_ready';
    expect(isGameplayJuiceActive(s, false, 0, true)).toBe(false);
  });

  it('is false during game_over', () => {
    const s = baseSession();
    s.phase = 'game_over';
    expect(isGameplayJuiceActive(s, false, 0, true)).toBe(false);
  });

  it('is false while tutorial is visible', () => {
    expect(isGameplayJuiceActive(baseSession(), false, 1, true)).toBe(false);
  });

  it('is false during initial phase', () => {
    expect(isGameplayJuiceActive(baseSession(), true, 0, true)).toBe(false);
  });

  it('is false while title overlay is up', () => {
    const s = baseSession();
    s.overlayOpacity = 1;
    expect(isGameplayJuiceActive(s, false, 0, true)).toBe(false);
  });

  it('is true during normal play', () => {
    expect(isGameplayJuiceActive(baseSession(), false, 0, true)).toBe(true);
  });
});
