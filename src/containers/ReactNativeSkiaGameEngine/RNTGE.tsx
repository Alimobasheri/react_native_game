import { Canvas, Skia, SkPicture } from '@shopify/react-native-skia';
import {
  FC,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ECSState, useECS } from './hooks-ecs/useECS/useECS';
import { ECSProvider } from './contexts-rntge/ECSContext/ECSProvider';
import { MemoizedContainer } from './components/MemoizedContainer';
import {
  runOnJS,
  SharedValue,
  useAnimatedReaction,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { ECS } from './services-ecs/ecs';
import { useEventQueue } from './hooks-ecs/useEventQueue/useEventQueue';
import { EventQueueProvider } from './contexts-rntge/EventQueueContext/EventQueueProvider';
import { PositionComponentName } from './internal/components/position';
import { requestCreateEntity } from './internal/systems/requestCreateEntity';
import { useDerivedMemory } from './hooks-ecs/useDerivedMemory/useDerivedMemory';
import { requestAddSystem } from './internal/systems/requestAddSystem';
import { requestAddMatterBody } from './internal/systems/physics/requestAddMatterBody';
import { useMatterPhysics } from './hooks-ecs/useMatterPhysics/useMatterPhysics';
import { MatterBodyComponentName } from './internal/components/matterBody';
import { updateMatterWorld } from './internal/systems/physics/updateMatterWorld';
import useRNTGEStore from './internal/store';
import { RenderComponentName } from './internal/components/render';
import { RenderEntities } from './components-ecs/RenderEntities.tsx/RenderEntities';
import { renderSystem } from './internal/systems/renderSystem';
import { requestCreateEntityBatch } from './internal/systems/requestCreateEntityBatch';
import { requestAddMatterBodyBatch } from './internal/systems/physics/requestAddMatterBodyBatch';

export interface ReactNativeTurboGameEngineProps {
  componentNames: string[];
}

export const ReactNativeTurboGameEngine: FC<
  PropsWithChildren<ReactNativeTurboGameEngineProps>
> = ({ componentNames, children }) => {
  const setDimensions = useRNTGEStore((state) => state.setDimensions);
  const dimensions = useSharedValue({ width: 0, height: 0 });
  const eventQueue = useEventQueue();
  const { ECS, state, initECS } = useECS({ eventQueue });
  const picture = useSharedValue<SkPicture | null>(null);
  const pictureCache = useSharedValue<Record<number, SkPicture>>({});
  const {
    derivedMemory,
    derivedSystems,
    addDerivedSystem,
    updateDerivedMemory,
  } = useDerivedMemory();
  const [shouldRender, setShouldRender] = useState(false);
  const { initPhysics } = useMatterPhysics();
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
    ECS.value.createComponent(MatterBodyComponentName);
    ECS.value.createComponent(RenderComponentName);
    componentNames.forEach(
      (name) => ECS.value && ECS.value.createComponent(name)
    );
  }, [ECS, componentNames]);

  const registerInternalSystems = useCallback(() => {
    'worklet';
    if (!ECS.value) return;
    ECS.value.registerSystem(requestAddSystem);
    ECS.value.registerSystem(requestCreateEntity);
    ECS.value.registerSystem(requestCreateEntityBatch);
    ECS.value.registerSystem(requestAddMatterBody);
    ECS.value.registerSystem(requestAddMatterBodyBatch);
    ECS.value.registerSystem(updateMatterWorld);
    ECS.value.registerSystem(renderSystem(picture, dimensions, pictureCache));
  }, [ECS, picture, dimensions, pictureCache]);

  const onFrame = useCallback(() => {
    'worklet';
    if (global.gc) global.gc();
    if (eventQueue.nextExternalEvents.value.length > 0) return;
    eventQueue.clearEvents();
    if (state.value !== ECSState.INITIALIZED) {
      initECS();
      initPhysics();
      defineComponents();
      registerInternalSystems();
      return;
    } else {
      if (!!ECS && !!ECS.value) {
        ECS.value.runSystems(ECS as SharedValue<ECS>, eventQueue, 100 / 60);
      }
    }
    eventQueue.callAllAwaitingExternalEvents();
  }, [
    ECS,
    state,
    eventQueue,
    initECS,
    initPhysics,
    defineComponents,
    registerInternalSystems,
  ]);
  useFrameCallback(onFrame);
  return (
    <Canvas
      style={{ flex: 1 }}
      onLayout={({
        nativeEvent: {
          layout: { width, height },
        },
      }) => {
        setDimensions(width, height);
        dimensions.value = { width, height };
      }}
    >
      <ECSProvider
        ecs={ECS}
        addDerivedSystem={addDerivedSystem}
        derivedMemory={derivedMemory}
      >
        <EventQueueProvider eventQueue={eventQueue}>
          {shouldRender && (
            <>
              {children}
              <RenderEntities picture={picture} />
            </>
          )}
        </EventQueueProvider>
      </ECSProvider>
    </Canvas>
  );
};
