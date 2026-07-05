import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';
import type { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';

export const HazardBandMemberComponentName = 'HazardBandMember';

export type HazardBandMemberComponentData = {
  modifierId: string;
  leadEntityId: Entity;
};

export const createHazardBandMemberComponent = (
  modifierId: string,
  leadEntityId: Entity
): Component<HazardBandMemberComponentData> => {
  'worklet';
  return {
    name: HazardBandMemberComponentName,
    data: {
      modifierId,
      leadEntityId,
    },
  };
};
