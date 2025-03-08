import { SharedValue, useFrameCallback } from 'react-native-reanimated';
import { ECS } from '../../services-ecs/ecs';
import { ECSState } from '../useECS/useECS';
import { useCallback } from 'react';

export type UseGameLoopArgs = {
  ECS: SharedValue<ECS>;
  ecsState: SharedValue<ECSState>;
  initECS: () => void;
};

export const useGameLoop = ({ ECS, ecsState, initECS }: UseGameLoopArgs) => {
  const onFrame = useCallback(() => {
    if (!ECS.value && ecsState.value === ECSState.NOT_INITIALIZED) {
      initECS();
    }
  }, [ECS, ecsState, initECS]);

  return useFrameCallback(onFrame);
};
