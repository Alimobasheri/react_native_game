import { Canvas } from '@shopify/react-native-skia';
import { FC, PropsWithChildren, useCallback, useMemo, useState } from 'react';
import { ECSState, useECS } from './hooks-ecs/useECS/useECS';
import { ECSProvider } from './contexts-rntge/ECSContext/ECSProvider';
import { MemoizedContainer } from './components/MemoizedContainer';
import {
  runOnJS,
  SharedValue,
  useAnimatedReaction,
  useFrameCallback,
} from 'react-native-reanimated';
import { ECS } from './services-ecs/ecs';
import { useEventQueue } from './hooks-ecs/useEventQueue/useEventQueue';
import { EventQueueProvider } from './contexts-rntge/EventQueueContext/EventQueueProvider';
import { PositionComponentName } from './internal/components/position';
import { requestCreateEntity } from './internal/systems/requestCreateEntity';

export const ReactNativeTurboGameEngine: FC<PropsWithChildren<{}>> = ({
  children,
}) => {
  const eventQueue = useEventQueue();
  const { ECS, state, initECS } = useECS({ eventQueue });
  const [shouldRender, setShouldRender] = useState(false);
  useAnimatedReaction(
    () => state.value,
    (state) => {
      if (shouldRender !== (state === ECSState.INITIALIZED)) {
        runOnJS(setShouldRender)(true);
      }
    }
  );

  const defineComponents = useCallback(() => {
    'worklet';
    if (!ECS.value) return;
    ECS.value.createComponent(PositionComponentName);
    ECS.value.createComponent('Velocity');
    ECS.value.createComponent('health');
  }, [ECS]);

  const registerInternalSystems = useCallback(() => {
    'worklet';
    if (!ECS.value) return;
    ECS.value.registerSystem(requestCreateEntity);
  }, [ECS]);

  const onFrame = useCallback(() => {
    'worklet';
    eventQueue.clearEvents();
    if (state.value !== ECSState.INITIALIZED) {
      initECS();
      defineComponents();
      registerInternalSystems();
      return;
    } else {
      if (!!ECS && !!ECS.value) {
        ECS.value.runSystems(ECS as SharedValue<ECS>, eventQueue, 100 / 60);
      }
    }
  }, [ECS]);
  useFrameCallback(onFrame);
  return (
    <Canvas style={{ flex: 1 }}>
      <ECSProvider ecs={ECS}>
        <EventQueueProvider eventQueue={eventQueue}>
          <MemoizedContainer>{shouldRender && children}</MemoizedContainer>
        </EventQueueProvider>
      </ECSProvider>
    </Canvas>
  );
};
