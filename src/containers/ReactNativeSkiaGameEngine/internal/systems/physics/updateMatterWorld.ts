import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';

export const updateMatterWorld: System = {
  process: () => {
    'worklet';
    if (
      typeof global.MatterReanimated === 'undefined' ||
      typeof global._RNTGE_ === 'undefined' ||
      !global._RNTGE_.physics
    ) {
      return;
    }

    const world = global._RNTGE_.physics.engine.world;
    const bodyCount = world.bodies?.length ?? 0;
    if (bodyCount === 0) {
      return;
    }

    global.MatterReanimated.Engine.update(global._RNTGE_.physics.engine);
  },
};
