import { Component } from '../../services-ecs/component';

export const PositionComponentName = 'position';
export type PositionComponentData = { x: number; y: number };

export type PositionComponent = Component<PositionComponentData>;

export type PositionInitialArgs = { x: number; y: number };

export const createPositionComponentJS = (
  initial: PositionInitialArgs = { x: 0, y: 0 }
): PositionComponent => {
  return { name: PositionComponentName, data: initial };
};

export const createPositionComponent = (
  initial: PositionInitialArgs = { x: 0, y: 0 }
): PositionComponent => {
  'worklet';
  return { name: PositionComponentName, data: initial };
};
