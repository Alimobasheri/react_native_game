import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';

export const updateMatterWorld: System = {
  process: () => {
    'worklet';
    if (
      typeof global.MatterReanimated === 'undefined' ||
      typeof global._RNTGE_ === 'undefined'
    )
      return;
    global.MatterReanimated.Engine.update(global._RNTGE_.physics.engine);
  },
};
