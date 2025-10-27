import { Canvas, SkPath, SkPicture } from '@shopify/react-native-skia';
import { FC, PropsWithChildren, useCallback, useState } from 'react';
import { ECSState, useECS } from './hooks-ecs/useECS/useECS';
import {
  FrameInfo,
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
import { AtlasData, ClipAnimationData } from './types-ecs/render';
import { Assets } from './types-ecs/assets';
import { AnimationClipComponentName } from './internal/components/animationClip';
import { SpriteComponentName } from './internal/components/sprite';
import { AnimatorStateComponentName } from './internal/components/animatorState';
import { spriteUpdateSystem } from './internal/systems/animations/spriteUpdateSystem';
import { animatorStateSystem } from './internal/systems/animations/animatorStateSystem';
import { animationClipSystem } from './internal/systems/animations/animationClipSystem';
import { registerSceneSystem } from './internal/systems/scene/registerSceneSystem';
import { sceneStateSystem } from './internal/systems/scene/sceneStateSystem';
import { assetPreloadSystem } from './internal/systems/scene/assetPreloadSystem';
import { Scene } from './components-rntge/Scene/Scene';
import { SceneComponentName } from './internal/components/scene';
import { TextComponentName } from './internal/components/text';
import { TouchComponentName } from './internal/components/touch';
import { touchSystem } from './internal/systems/touchSystem';
import { TouchOverlay } from './components-rntge/Input/TouchOverlay';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

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
  const pictureCache = useSharedValue<Record<number, SkPicture | SkPath>>({});

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
    ECS.value.createComponent(SceneComponentName);
    ECS.value.createComponent(PositionComponentName);
    ECS.value.createComponent(TouchComponentName);
    ECS.value.createComponent(MatterBodyComponentName);
    ECS.value.createComponent(SpriteComponentName);
    ECS.value.createComponent(AnimationClipComponentName);
    ECS.value.createComponent(AnimatorStateComponentName);
    ECS.value.createComponent(TextComponentName);
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
    ECS.value.registerSystem(animationClipSystem);
    ECS.value.registerSystem(spriteUpdateSystem);
    ECS.value.registerSystem(animatorStateSystem);
    ECS.value.registerSystem(updateMatterWorld);
    ECS.value.registerSystem(registerSceneSystem);
    ECS.value.registerSystem(sceneStateSystem);
    ECS.value.registerSystem(assetPreloadSystem);
    ECS.value.registerSystem(touchSystem);
    ECS.value.registerSystem(renderSystem(picture, dimensions, pictureCache));
  }, [ECS, picture, dimensions, pictureCache]);

  const onFrame = useCallback(
    (frameInfo: FrameInfo) => {
      'worklet';
      if (global.gc) global.gc();
      if (eventQueue.nextExternalEvents.value.length > 0) return;
      eventQueue.clearEvents();
      if (state.value !== ECSState.INITIALIZED) {
        global._RNTGE_ = {
          physics: undefined,
          imageCache: {},
          shaderCache: {},
          atlasCache: {},
          clipAnimationCache: {},
          fontCache: {},
          textCache: {},
          TouchState: {
            activePointers: new Map<
              number,
              { entityId: number | null; captured: boolean }
            >(),
          },
        };
        initECS();
        initPhysics();
        defineComponents();
        registerInternalSystems();
        return;
      } else {
        if (!!ECS && !!ECS.value) {
          ECS.value.runSystems({
            ecs: ECS as SharedValue<ECS>,
            eventQueue,
            deltaTime: frameInfo.timeSincePreviousFrame ?? 0,
          });
        }
      }
      eventQueue.callAllAwaitingExternalEvents();
    },
    [
      ECS,
      state,
      eventQueue,
      initECS,
      initPhysics,
      defineComponents,
      registerInternalSystems,
    ]
  );
  useFrameCallback(onFrame);
  return (
    <>
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
        <EventQueueProvider eventQueue={eventQueue}>
          {shouldRender && (
            <>
              <Scene name="Root">{children}</Scene>
              <RenderEntities picture={picture as SharedValue<SkPicture>} />
            </>
          )}
        </EventQueueProvider>
      </Canvas>
      <GestureHandlerRootView style={StyleSheet.absoluteFill}>
        <TouchOverlay eventQueue={eventQueue} />
      </GestureHandlerRootView>
    </>
  );
};
