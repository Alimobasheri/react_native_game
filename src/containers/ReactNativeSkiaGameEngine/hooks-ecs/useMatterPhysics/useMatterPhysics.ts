import { useCallback, useEffect, useRef } from 'react';
import { runOnUI } from 'react-native-reanimated';
import initMatter from './matter';

export const useMatterPhysics = () => {
  const initPhysics = useCallback(() => {
    'worklet';
    if (typeof global.Matter === 'undefined') {
      initMatter();
    }
    if (typeof global._RNTGE_ === 'undefined') {
      global._RNTGE_ = { physics: { engine: global.Matter.Engine.create() } };
    } else if (typeof global._RNTGE_ !== 'undefined') {
      global._RNTGE_.physics = { engine: global.Matter.Engine.create() };
    }
  }, []);

  return { initPhysics };
};
