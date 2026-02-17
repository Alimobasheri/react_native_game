import { useCallback } from 'react';
import { createECS, ECSState } from '../../services-ecs/ecs';



export type UseECSReturnValue = {
  initECS: () => void;
};

export const useECS = (): UseECSReturnValue => {

  const initECS = useCallback(() => {
    'worklet';
    global._RNTGE_.ecs = createECS();
    global._RNTGE_.state = ECSState.INITIALIZED;
  }, []);

  return { initECS };
};
