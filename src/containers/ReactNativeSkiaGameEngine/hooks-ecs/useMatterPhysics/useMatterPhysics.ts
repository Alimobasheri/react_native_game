import initMatter from 'matter-js-reanimated';
import { useCallback, useEffect, useRef } from 'react';

export const useMatterPhysics = () => {
  const initPhysics = useCallback(() => {
    'worklet';
    if (typeof global.MatterReanimated === 'undefined') {
      initMatter();
    }
    if (typeof global._RNTGE_ === 'undefined') {
      global._RNTGE_ = {
        physics: { engine: global.MatterReanimated.Engine.create() },
      };
    } else if (typeof global._RNTGE_ !== 'undefined') {
      global._RNTGE_.physics = {
        engine: global.MatterReanimated.Engine.create(),
      };
    }
  }, []);

  return { initPhysics };
};
