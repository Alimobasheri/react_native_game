import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';
import { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';

export const ObstaclesManagerComponentName = 'ObstaclesManager';

export type ObstaclesManagerComponentData = {
  /** Scene key this manager belongs to (used when spawning entities). */
  sceneKey: string;
  /** Accumulated spawn timer in seconds (replaces any global timer). */
  spawnTimerSeconds: number;
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

