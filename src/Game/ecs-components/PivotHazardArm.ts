import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';
import type { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';

export const PivotHazardArmComponentName = 'PivotHazardArm';

export type PivotHazardArmComponentData = {
  leadEntityId: Entity;
  hazardId: string;
  armIndex: number;
  armCount: number;
};

export type CreatePivotHazardArmArgs = {
  leadEntityId: Entity;
  hazardId: string;
  armIndex: number;
  armCount: number;
};

export const createPivotHazardArmComponent = (
  args: CreatePivotHazardArmArgs
): Component<PivotHazardArmComponentData> => {
  'worklet';
  return {
    name: PivotHazardArmComponentName,
    data: {
      leadEntityId: args.leadEntityId,
      hazardId: args.hazardId,
      armIndex: args.armIndex,
      armCount: args.armCount,
    },
  };
};
