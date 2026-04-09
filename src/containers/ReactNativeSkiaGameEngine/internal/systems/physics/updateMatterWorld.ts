import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';

export const updateMatterWorld: System = {
  process: () => {
    'worklet';
    const now = Date.now()
    if (
      typeof global.MatterReanimated === 'undefined' ||
      typeof global._RNTGE_ === 'undefined' ||
      !global._RNTGE_.physics
    )
      return;
    global.MatterReanimated.Engine.update(global._RNTGE_.physics.engine);
  },
};
