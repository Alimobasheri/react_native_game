import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';
import { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';

export const ObstacleRowComponentName = 'ObstacleRow';

export type ObstacleRowComponentData = {
  y: number;
  gaps: number[];
  /** World X centers of solid block columns; immutable after spawn. */
  solidColumnCentersX: readonly number[];
  /** Beat row index within platform-shaft segment (template rowIndex). */
  beatRowIndex?: number;
  /** Increments each platformShaftIntro segment init — loop-safe hazard identity. */
  shaftSegmentEpoch?: number;
  /** Runtime override from hazard band merge pass; falls back to gaps. */
  effectiveGaps?: number[];
  /** Runtime solid centers matching effectiveGaps when press is active. */
  effectiveSolidColumnCentersX?: readonly number[];
  prevRowEntity: Entity | null;
  /**
   * Which `MappedTemplates` key produced this row (`directed`, `smily`, …). Used for
   * dev logs tied to the row the player is crossing (`Water.centerRowEntity`).
   */
  spawnDiagTemplateName?: string;
  /** Stable branch key from {@link buildObstacleRowGenerationLogKey} at spawn time. */
  spawnDiagBranchKey?: string;
  /** ECS entity for gap-edge foam blobs once this row enters the water surface. */
  foamEntityId?: number;
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
