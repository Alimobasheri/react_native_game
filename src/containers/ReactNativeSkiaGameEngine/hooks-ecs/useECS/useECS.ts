import {
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { createECS, ECS, ECSArgs } from '../../services-ecs/ecs';
import { runOnUI, SharedValue, useSharedValue } from 'react-native-reanimated';

export type UseECSReturnValue = {
  ECS: SharedValue<ECS | null>;
  initECS: () => void;
};

export const useECS = (): UseECSReturnValue => {
  const ECS = useSharedValue<ECS | null>(null);

  const nextEntityId = useSharedValue(0);
  const signatures = useSharedValue({});
  const components = useSharedValue({});

  const initECS = useCallback(() => {
    'worklet';
    ECS.value = createECS({ nextEntityId, components, signatures });
    console.log(ECS);
  }, [ECS, nextEntityId, components, signatures]);

  return { ECS, initECS };
};
