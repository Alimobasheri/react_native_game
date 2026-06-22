import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';
import { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import type { BlockFoamContact } from '@/Game/visual/blockFoamContacts';

export const BlockFoamComponentName = 'BlockFoam';

export type BlockFoamComponentData = {
  rowEntityId: Entity;
  foamAge: number;
  contacts: BlockFoamContact[];
  rowLength: number;
  blockWidth: number;
  blockHeight: number;
  rowCenterX: number;
  /**
   * Frozen row-local Y of flat water contact at spawn (not shader wave crest).
   * Bubbles grow upward from this line for the row's lifetime.
   */
  contactLocalY: number;
};

export const createBlockFoamComponent = (
  data: BlockFoamComponentData
): Component<BlockFoamComponentData> => {
  'worklet';
  return {
    name: BlockFoamComponentName,
    data,
  };
};
