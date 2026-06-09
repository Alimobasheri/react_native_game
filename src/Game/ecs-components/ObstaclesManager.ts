import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';
import { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';

export const ObstaclesManagerComponentName = 'ObstaclesManager';

export type ObstaclesManagerComponentData = {
  /** Scene key this manager belongs to (used when spawning entities). */
  sceneKey: string;
  /**
   * Monotonic count of obstacle rows spawned; drives `PacingDirector` phase (55-row cycle).
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

