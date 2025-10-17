import { ClipAnimationData } from '../types-ecs/render';

export type LoadedClipAnimation = {
  type: 'animation';
  name: string;
  data: ClipAnimationData;
};

export const loadClipAnimationsOnUI = async (
  animations: Record<string, ClipAnimationData>
) => {
  'worklet';
  global._RNTGE_.clipAnimationCache = {
    ...global._RNTGE_.clipAnimationCache,
    ...animations,
  };
};
