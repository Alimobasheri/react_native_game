import { ClipAnimationData } from '../types-ecs/render';

export const loadClipAnimationsOnUI = async (
  animations: Record<string, ClipAnimationData>
) => {
  'worklet';
  global._RNTGE_.clipAnimationCache = {
    ...global._RNTGE_.clipAnimationCache,
    ...animations,
  };
};
