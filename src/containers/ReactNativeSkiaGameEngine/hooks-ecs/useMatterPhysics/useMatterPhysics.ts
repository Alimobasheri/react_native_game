import initMatter from 'matter-js-reanimated';
import { useCallback, useEffect, useRef } from 'react';

export const useMatterPhysics = () => {
  const initPhysics = useCallback(() => {
    'worklet';
    if (typeof global.MatterReanimated === 'undefined') {
      initMatter();
    }
    const engine = global.MatterReanimated.Engine.create();
    // Arcade physics: disable gravity globally.
    engine.gravity.x = 0;
    engine.gravity.y = 0;
    engine.gravity.scale = 0;
    if (typeof global._RNTGE_ === 'undefined') {
      // RNTGE.tsx will initialize the rest of the global caches; we only ensure physics exists.
      global._RNTGE_ = {} as any;
    }
    global._RNTGE_.physics = { engine };
  }, []);

  return { initPhysics };
};
