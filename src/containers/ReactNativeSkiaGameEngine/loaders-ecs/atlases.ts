import { AtlasData } from '../types-ecs/render';

export type LoadedAtlas = {
  type: 'atlas';
  name: string;
  data: AtlasData;
};

export const loadAtlasesOnUI = async (atlases: Record<string, AtlasData>) => {
  'worklet';
  global._RNTGE_.atlasCache = {
    ...global._RNTGE_.atlasCache,
    ...atlases,
  };
};
