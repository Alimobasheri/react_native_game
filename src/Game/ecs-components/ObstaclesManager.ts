import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';
import { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import type {
  StoryLockedProceduralSegment,
  StoryLockedShaftRecipe,
} from '@/Game/ecs-systems/obstacleSystem';

export const ObstaclesManagerComponentName = 'ObstaclesManager';

export type ObstaclesManagerComponentData = {
  /** Scene key this manager belongs to (used when spawning entities). */
  sceneKey: string;
  /**
   * Monotonic count of obstacle rows spawned; drives macro pacing
   * (`getPacingCycleState` / `pacingPhaseAtTotalRows` in `src/Game/path/pacingDirector.ts`).
   */
  totalRowsGenerated?: number;
  /** Last obstacle row generation diagnostic key (dev logging dedupe). */
  lastObstacleRowGenLogKey?: string;
  /** Dev: last `Water.centerRowEntity` used for player-band template logging. */
  lastPlayerDiagCenterRowEntity?: Entity | null;
  /** Accumulated spawn timer in seconds (replaces any global timer). */
  spawnTimerSeconds: number;
  /**
   * When provided, the obstacle system will always use this template name and
   * will never randomly switch templates (storybook/debug use).
   */
  lockedTemplateName?: string;
  /**
   * Storybook: repeat a single deterministic multipath branch (funnel, pinball, …).
   * Only applies when the active template uses `baseMultiPathGetRow` (`directed`, `baseMulti`).
   */
  storyLockedProceduralSegment?: StoryLockedProceduralSegment;
  /**
   * Storybook / device: lock one platform-shaft composer (e.g. composePressIntroShaft).
   * ObstacleSystem reads in Slice 3 — platform-shaft-roadmap.md §7.
   */
  storyLockedShaftRecipe?: StoryLockedShaftRecipe;
  /** Deterministic harmonizer reroll seed for locked shaft recipe. */
  storyLockedShaftSeed?: number;
  /** Difficulty profile 0..1 for locked shaft recipe. */
  storyLockedShaftDifficulty?: number;
  /** When true, repeat the same shaft segment on template rollover (Slice 3). */
  storyLockShaftLoop?: boolean;
  templateInfo?: {
    currentTemplateName: string;
    currentTempalteTotalRow: number;
    currentRowIndex: number;
    lastRowEntity: Entity | null;
    /**
     * Entity holding the active template context (`TemplateContext` component).
     * This allows templates to keep state across row generations.
     */
    templateContextEntity?: Entity | null;
  }
};

export const createObstaclesManagerComponent = (
  data: ObstaclesManagerComponentData
): Component<ObstaclesManagerComponentData> => {
  'worklet';
  return {
    name: ObstaclesManagerComponentName,
    data,
  };
};

