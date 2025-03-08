import { useCallback, useRef } from 'react';
import { createECS, ECS } from '../../services-ecs/ecs';
import { runOnJS, SharedValue, useSharedValue } from 'react-native-reanimated';
import { System } from '../../services-ecs/system';
import { EventQueueContextType } from '../useEventQueue/useEventQueue';

export enum ECSState {
  INITIALIZED = 'INITIALIZED',
  NOT_INITIALIZED = 'NOT_INITIALIZED',
}

export type UseECSArgs = {
  eventQueue: EventQueueContextType;
};

export type UseECSReturnValue = {
  ECS: SharedValue<ECS | null>;
  state: SharedValue<ECSState>;
  initECS: () => void;
};

export const useECS = ({ eventQueue }: UseECSArgs): UseECSReturnValue => {
  const ECS = useSharedValue<ECS | null>(null);

  const state = useSharedValue(ECSState.NOT_INITIALIZED);

  const nextEntityId = useSharedValue(0);
  const signatures = useSharedValue({});
  const components = useSharedValue({});
  const systems = useSharedValue<System[]>([]);

  const jsSystems = useRef<System[]>([]);

  const initECS = useCallback(() => {
    'worklet';
    ECS.value = createECS({
      nextEntityId,
      components,
      signatures,
      systems,
      eventQueue,
      jsSystems,
    });
    state.value = ECSState.INITIALIZED;
  }, [
    ECS,
    nextEntityId,
    components,
    signatures,
    systems,
    jsSystems,
    eventQueue,
  ]);

  return { ECS, state, initECS };
};
