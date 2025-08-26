import { Component } from '@/containers/ReactNativeSkiaGameEngine/index-rntge';

export const StarComponentName = 'star';
export type StarComponentData = {
  cx: number;
  cy: number;
  radius: number;
  color: string;
};

export type StarComponent = Component<StarComponentData>;

export type StarInitialArgs = {
  cx: number;
  cy: number;
  radius: number;
  color: string;
};

export const createStarComponentJS = (
  initial: StarInitialArgs = { cx: 0, cy: 0, radius: 0, color: '#fff' }
): StarComponent => {
  return { name: StarComponentName, data: initial };
};

export const createStarComponent = (
  initial: StarInitialArgs = { cx: 0, cy: 0, radius: 0, color: '#fff' }
): StarComponent => {
  'worklet';
  return { name: StarComponentName, data: initial };
};
