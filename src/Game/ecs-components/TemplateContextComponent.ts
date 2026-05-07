import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';
import { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import { TemplateCtx } from '@/Game/ecs-systems/obstacleSystem';

export const TemplateContextComponentName = 'TemplateContext';

export type TemplateContextComponentData = {
  /** Which template this ctx belongs to (active template). */
  templateName: string;
  /** Arbitrary, template-owned state. Mutated in place by templates. */
  ctx: TemplateCtx;
  /** Monotonic id to distinguish template selections/runs if needed. */
  runId: number;
};

export const createTemplateContextComponent = (
  data: TemplateContextComponentData
): Component<TemplateContextComponentData> => {
  'worklet';
  return {
    name: TemplateContextComponentName,
    data,
  };
};

export const getOrCreateTemplateContextEntity = (ecs: {
  createEntity: () => Entity;
  addComponent: <T>(entity: Entity, component: Component<T>) => void;
  getEntitiesWithComponents: (requiredComponentNames: string[]) => Entity[];
}): Entity => {
  'worklet';
  const existing = ecs.getEntitiesWithComponents([TemplateContextComponentName]);
  if (existing.length > 0) return existing[0];

  const entity = ecs.createEntity();
  ecs.addComponent(
    entity,
    createTemplateContextComponent({
      templateName: '',
      ctx: {},
      runId: 0,
    })
  );
  return entity;
};

