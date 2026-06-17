import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';
import { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';

export const RunResultComponentName = 'RunResult';

export type RunResultComponentData = {
  /** Final score from the last completed run (set on game over). */
  finalScore: number;
};

export const createRunResultComponent = (
  data: RunResultComponentData
): Component<RunResultComponentData> => {
  'worklet';
  return {
    name: RunResultComponentName,
    data,
  };
};

export const getOrCreateRunResultEntity = (ecs: {
  createEntity: () => Entity;
  addComponent: <T>(entity: Entity, component: Component<T>) => void;
  getEntitiesWithComponents: (requiredComponentNames: string[]) => Entity[];
}): Entity => {
  'worklet';
  const existing = ecs.getEntitiesWithComponents([RunResultComponentName]);
  if (existing.length > 0) return existing[0];

  const entity = ecs.createEntity();
  ecs.addComponent(
    entity,
    createRunResultComponent({
      finalScore: 0,
    })
  );
  return entity;
};
