import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';
import type { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';

export const PendulumHazardHeadComponentName = 'PendulumHazardHead';

export type PendulumHazardHeadComponentData = {
  leadEntityId: Entity;
  hazardId: string;
};

export type CreatePendulumHazardHeadArgs = {
  leadEntityId: Entity;
  hazardId: string;
};

export const createPendulumHazardHeadComponent = (
  args: CreatePendulumHazardHeadArgs
): Component<PendulumHazardHeadComponentData> => {
  'worklet';
  return {
    name: PendulumHazardHeadComponentName,
    data: {
      leadEntityId: args.leadEntityId,
      hazardId: args.hazardId,
    },
  };
};
