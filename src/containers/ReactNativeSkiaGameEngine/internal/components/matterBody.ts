import { IBodyDefinition } from 'matter-js';

export const MatterBodyComponentName = 'matterBody';
export type MatterBodyComponentData = IBodyDefinition;

export const createMatterBodyComponent = (options: IBodyDefinition) => {
  'worklet';
  return {
    name: MatterBodyComponentName,
    data: options,
  };
};
