import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';
import { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';

export const ObstacleRowComponentName = 'ObstacleRow';

export type ObstacleRowComponentData = {
  y: number;
  gaps: number[];
  prevRowEntity: Entity | null;
  /**
   * Which `MappedTemplates` key produced this row (`directed`, `smily`, …). Used for
   * dev logs tied to the row the player is crossing (`Water.centerRowEntity`).
   */
  spawnDiagTemplateName?: string;
  /** Stable branch key from {@link buildObstacleRowGenerationLogKey} at spawn time. */
  spawnDiagBranchKey?: string;
};

export const createObstacleRowComponent = (
  data: ObstacleRowComponentData
): Component<ObstacleRowComponentData> => {
  'worklet';
  return {
    name: ObstacleRowComponentName,
    data,
  };
};
