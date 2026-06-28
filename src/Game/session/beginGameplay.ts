import type { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import type { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import { firstDataFromStore, firstEntityFromStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/query';
import {
  GameSessionComponentData,
  GameSessionComponentName,
} from '@/Game/ecs-components/GameSession';
import {
  ObstacleRowComponentData,
  ObstacleRowComponentName,
} from '@/Game/ecs-components/ObstacleRowComponent';
import {
  ObstaclesManagerComponentData,
  ObstaclesManagerComponentName,
} from '@/Game/ecs-components/ObstaclesManager';
import {
  WaterComponentData,
  WaterComponentName,
} from '@/Game/ecs-components/Water';
import { assignBlueprintForNewRun } from '@/Game/path/runBlueprint';
import { resolvePacingRunContext } from '@/Game/path/cyclePersonality';
import {
  appendDeathHistory,
  captureDeathContext,
} from '@/Game/path/deathTelemetry';
import { runProgressionTuning } from '@/config/runProgression';
import {
  TemplateContextComponentData,
  TemplateContextComponentName,
} from '@/Game/ecs-components/TemplateContextComponent';
import { gameSessionTuning } from '@/config/swimmerTuning';

const {
  OVERLAY_FADE_MS,
  OVERLAY_SLIDE_MS,
  SPEED_RAMP_MS,
  GAME_OVER_DIM_FADE_MS,
  GAME_OVER_PANEL_INTRO_MS,
  GAME_OVER_FADE_OUT_MS,
  GAME_OVER_SCORE_ANIM_MS,
  GAME_OVER_RETRY_INTRO_DELAY_MS,
  GAME_OVER_REVIVE_INTRO_DELAY_MS,
} = gameSessionTuning;

export const easeInOutSine = (t: number): number => {
  'worklet';
  return -(Math.cos(Math.PI * t) - 1) / 2;
};

/** Hyper-casual overshoot — decelerates into place with a small bounce. */
export const easeOutBack = (t: number, overshoot = 1.75): number => {
  'worklet';
  const c = Math.max(0, Math.min(1, t));
  const c1 = overshoot + 1;
  return 1 + c1 * Math.pow(c - 1, 3) + overshoot * Math.pow(c - 1, 2);
};

/** Accelerating exit — starts slow then rushes off screen. */
export const easeInQuart = (t: number): number => {
  'worklet';
  const c = Math.max(0, Math.min(1, t));
  return c * c * c * c;
};

/** Ease-out so gameplay speed is reached quickly after tap (avoids a long sluggish crawl). */
export const easeOutCubic = (t: number): number => {
  'worklet';
  const c = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - c, 3);
};

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
  const blueprintAssignment = assignBlueprintForNewRun(session, 'begin');
  ecs.updateComponent<GameSessionComponentData>(
    sessionEntity,
    GameSessionComponentName,
    (s) => {
      s.phase = 'playing';
      s.overlayFadeStartMs = nowMs;
      s.speedRampStartMs = nowMs;
      s.animTimeSec = 0;
      s.runAttemptIndex = blueprintAssignment.runAttemptIndex;
      s.runSeed = blueprintAssignment.runSeed;
      s.runBlueprint = blueprintAssignment.runBlueprint;
    }
  );

  const pacingRunContext = resolvePacingRunContext(
    blueprintAssignment.runBlueprint,
    blueprintAssignment.runAttemptIndex
  );
  const templateEntities = ecs.getEntitiesWithComponents([
    TemplateContextComponentName,
  ]);
  for (let i = 0; i < templateEntities.length; i++) {
    ecs.updateComponent<TemplateContextComponentData>(
      templateEntities[i],
      TemplateContextComponentName,
      (tc) => {
        const ctx = (tc.ctx ?? {}) as Record<string, unknown>;
        ctx.pathRunId = blueprintAssignment.runSeed;
        ctx.baseRunSeed = blueprintAssignment.runSeed;
        ctx.openingArchetype = blueprintAssignment.runBlueprint.openingArchetype;
        ctx.cyclePersonality = blueprintAssignment.runBlueprint.cyclePersonality;
        ctx.climaxPreference = blueprintAssignment.runBlueprint.climaxPreference;
        ctx.pacingRunContext = pacingRunContext;
        tc.ctx = ctx;
        tc.runId = blueprintAssignment.runSeed;
      }
    );
  }

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
      s.overlayIntroStartMs = Date.now();
      s.speedRampStartMs = 0;
      s.ctaPressStartMs = 0;
      s.animTimeSec = 0;
      s.tutorialFadeStartMs = 0;
      // runAttemptIndex / runBlueprint intentionally preserved — variety continues after title return.
    }
  );
};

/** Game over + death history + lifetime run count (UI thread). */
export function recordRunDeathOnGameOver(
  ecs: ECS,
  sessionEntity: Entity,
  finalScore: number
): void {
  'worklet';
  const components = ecs.components;
  const sessionBefore = components[GameSessionComponentName]?.get(
    sessionEntity
  ) as GameSessionComponentData | undefined;
  if (!sessionBefore || sessionBefore.phase === 'game_over') {
    return;
  }

  const floored = Math.floor(finalScore);
  const isNewBest = floored > sessionBefore.bestScore;

  const mgrStore = components[ObstaclesManagerComponentName];
  const mgr = mgrStore
    ? (firstDataFromStore(mgrStore) as ObstaclesManagerComponentData | undefined)
    : undefined;
  const totalRowsGenerated = mgr?.totalRowsGenerated ?? 0;
  const pacingCtx = resolvePacingRunContext(
    sessionBefore.runBlueprint,
    sessionBefore.runAttemptIndex
  );

  const waterStore = components[WaterComponentName];
  let spawnDiagBranchKey: string | undefined;
  if (waterStore) {
    const waterEntity = firstEntityFromStore(waterStore);
    if (typeof waterEntity === 'number') {
      const water = waterStore.get(waterEntity) as WaterComponentData | undefined;
      const centerRow = water?.centerRowEntity;
      const rowStore = components[ObstacleRowComponentName];
      if (typeof centerRow === 'number' && rowStore) {
        const row = rowStore.get(centerRow) as ObstacleRowComponentData | undefined;
        if (typeof row?.spawnDiagBranchKey === 'string') {
          spawnDiagBranchKey = row.spawnDiagBranchKey;
        }
      }
    }
  }

  const deathCtx = captureDeathContext({
    totalRowsGenerated,
    pacingCtx,
    spawnDiagBranchKey,
    finalScore: floored,
  });

  const nowMs = Date.now();
  ecs.updateComponent<GameSessionComponentData>(
    sessionEntity,
    GameSessionComponentName,
    (s) => {
      s.phase = 'game_over';
      s.overlayOpacity = 0;
      s.overlayFadeStartMs = 0;
      s.tutorialFadeStartMs = 0;
      s.gameOverFinalScore = floored;
      s.gameOverIsNewBest = isNewBest;
      s.gameOverOverlayIntroStartMs = nowMs;
      s.gameOverOverlayFadeStartMs = 0;
      s.gameOverRetryPressStartMs = 0;
      s.gameOverScoreAnimStartMs = nowMs;
      s.lifetimeRunCount = (s.lifetimeRunCount ?? 0) + 1;
      s.deathHistory = appendDeathHistory(
        s.deathHistory ?? [],
        deathCtx,
        runProgressionTuning.DEATH_HISTORY_CAP
      );
      s.lastDeathContext = deathCtx;
      if (isNewBest) {
        s.bestScore = floored;
      }
    }
  );
}

export function markGameSessionGameOver(
  ecs: ECS,
  sessionEntity: Entity,
  finalScore: number
): void {
  'worklet';
  recordRunDeathOnGameOver(ecs, sessionEntity, finalScore);
}

export const computeGameOverDimOpacity = (
  session: GameSessionComponentData,
  nowMs: number
): number => {
  'worklet';
  if (session.phase !== 'game_over') return 0;
  if (session.gameOverOverlayFadeStartMs > 0) {
    const t = Math.min(
      1,
      (nowMs - session.gameOverOverlayFadeStartMs) / GAME_OVER_FADE_OUT_MS
    );
    return Math.max(0, 0.52 * (1 - easeInOutSine(t)));
  }
  if (session.gameOverOverlayIntroStartMs <= 0) return 0;
  const t = Math.min(
    1,
    (nowMs - session.gameOverOverlayIntroStartMs) / GAME_OVER_DIM_FADE_MS
  );
  return 0.52 * easeInOutSine(t);
};

export const computeGameOverPanelIntroT = (
  session: GameSessionComponentData,
  nowMs: number
): number => {
  'worklet';
  if (session.phase !== 'game_over') return 0;
  if (session.gameOverOverlayFadeStartMs > 0) {
    const t = Math.min(
      1,
      (nowMs - session.gameOverOverlayFadeStartMs) / GAME_OVER_FADE_OUT_MS
    );
    return Math.max(0, 1 - easeInOutSine(t));
  }
  if (session.gameOverOverlayIntroStartMs <= 0) return 0;
  const elapsed = nowMs - session.gameOverOverlayIntroStartMs - 80;
  if (elapsed <= 0) return 0;
  return Math.min(1, elapsed / GAME_OVER_PANEL_INTRO_MS);
};

export const computeGameOverPanelScale = (introT: number): number => {
  'worklet';
  if (introT <= 0) return 0.9;
  const eased = easeOutBack(introT, 1.35);
  if (eased > 1) {
    return 1 + (eased - 1) * 0.35;
  }
  return 0.9 + (1 - 0.9) * eased;
};

export const computeGameOverScoreDisplay = (
  session: GameSessionComponentData,
  nowMs: number
): number => {
  'worklet';
  if (session.phase !== 'game_over') return 0;
  const target = session.gameOverFinalScore;
  if (session.gameOverScoreAnimStartMs <= 0) return target;
  const t = Math.min(
    1,
    (nowMs - session.gameOverScoreAnimStartMs) / GAME_OVER_SCORE_ANIM_MS
  );
  return Math.floor(target * easeOutCubic(t));
};

export const computeGameOverRetryIntroT = (
  session: GameSessionComponentData,
  nowMs: number
): number => {
  'worklet';
  if (session.phase !== 'game_over') return 0;
  if (session.gameOverOverlayFadeStartMs > 0) {
    const t = Math.min(
      1,
      (nowMs - session.gameOverOverlayFadeStartMs) / GAME_OVER_FADE_OUT_MS
    );
    return Math.max(0, 1 - easeInOutSine(t));
  }
  if (session.gameOverOverlayIntroStartMs <= 0) return 0;
  const elapsed =
    nowMs -
    session.gameOverOverlayIntroStartMs -
    GAME_OVER_RETRY_INTRO_DELAY_MS;
  if (elapsed <= 0) return 0;
  return Math.min(1, elapsed / 220);
};

export const computeGameOverReviveIntroT = (
  session: GameSessionComponentData,
  nowMs: number
): number => {
  'worklet';
  if (session.phase !== 'game_over') return 0;
  if (session.gameOverOverlayFadeStartMs > 0) {
    const t = Math.min(
      1,
      (nowMs - session.gameOverOverlayFadeStartMs) / GAME_OVER_FADE_OUT_MS
    );
    return Math.max(0, 1 - easeInOutSine(t));
  }
  if (session.gameOverOverlayIntroStartMs <= 0) return 0;
  const elapsed =
    nowMs -
    session.gameOverOverlayIntroStartMs -
    GAME_OVER_REVIVE_INTRO_DELAY_MS;
  if (elapsed <= 0) return 0;
  return Math.min(1, elapsed / 220);
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

export const computeOverlayDismissT = (
  session: GameSessionComponentData,
  nowMs: number
): number => {
  'worklet';
  if (session.overlayFadeStartMs <= 0) return 0;
  return Math.min(1, (nowMs - session.overlayFadeStartMs) / OVERLAY_SLIDE_MS);
};

export const computeOverlayOpacity = (
  session: GameSessionComponentData,
  nowMs: number
): number => {
  'worklet';
  if (session.phase === 'game_over') return 0;
  if (session.phase === 'start_ready') return 1;
  if (session.overlayFadeStartMs <= 0) return session.overlayOpacity;
  return computeOverlayDismissT(session, nowMs) >= 1 ? 0 : 1;
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
