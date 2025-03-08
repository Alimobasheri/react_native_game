import { Body } from 'matter-js';

export const MatterBodyComponentName = 'matterBody';
export type MatterBodyComponentData = Body;

export const createMatterBodyComponent = (body: Body) => {
  return {
    name: MatterBodyComponentName,
    data: body,
  };
};
