import { Canvas, SkPath, SkPicture } from '@shopify/react-native-skia';
import {
  FC,
  PropsWithChildren,
  useCallback,
  useLayoutEffect,
  useState,
} from 'react';
import { useECS } from './hooks-ecs/useECS/useECS';
import {
  FrameInfo,
  SharedValue,
  useDerivedValue,
  useAnimatedReaction,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { ECSState } from './services-ecs/ecs';
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
import {
  TouchComponentName,
  TapComponentName,
  PanComponentName,
  LongPressComponentName,
} from './internal/components/touch';
import { KeyboardComponentName } from './internal/components/keyboard';
import { touchSystem } from './internal/systems/touchSystem';
import { keyboardSystem } from './internal/systems/keyboardSystem';
import { TouchOverlay } from './components-rntge/Input/TouchOverlay';
import { useKeyboardInput } from './hooks/useKeyboardInput/useKeyboardInput';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets as useRNSafeAreaInsets } from 'react-native-safe-area-context';
import { loadSceneSystem } from './internal/systems/scene/loadSceneSystem';
import { unLoadSceneSystem } from './internal/systems/scene/unloadSceneSystem';
import { requestRemoveEntity } from './internal/systems/requestRemoveEntity';
import { requestRemoveEntityBatch } from './internal/systems/requestRemoveEntityBatch';
import { MemoizedContainer } from './components/MemoizedContainer';

export interface ReactNativeTurboGameEngineProps {
  componentNames: string[];
}

export const ReactNativeTurboGameEngine: FC<
  PropsWithChildren<ReactNativeTurboGameEngineProps>
> = ({ componentNames, children }) => {
  const setDimensions = useRNTGEStore((state) => state.setDimensions);
  const storeDimensions = useRNTGEStore((state) => state.dimensions);
  const setSafeAreaInsets = useRNTGEStore((state) => state.setSafeAreaInsets);
  const dimensions = useSharedValue({ width: 0, height: 0 });
  const safeAreaInsets = useSharedValue({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });
  const rnSafeAreaInsets = useRNSafeAreaInsets();

  useLayoutEffect(() => {
    safeAreaInsets.value = {
      top: rnSafeAreaInsets.top,
      bottom: rnSafeAreaInsets.bottom,
      left: rnSafeAreaInsets.left,
      right: rnSafeAreaInsets.right,
    };
    setSafeAreaInsets(
      rnSafeAreaInsets.top,
      rnSafeAreaInsets.bottom,
      rnSafeAreaInsets.left,
      rnSafeAreaInsets.right
    );
  }, [
    rnSafeAreaInsets.top,
    rnSafeAreaInsets.bottom,
    rnSafeAreaInsets.left,
    rnSafeAreaInsets.right,
    safeAreaInsets,
    setSafeAreaInsets,
  ]);
  useDerivedValue(() => {
    'worklet';
    if (
      dimensions.value.width !== storeDimensions.width &&
      dimensions.value.height !== storeDimensions.height
    )
      scheduleOnRN(
        setDimensions,
        dimensions.value.width,
        dimensions.value.height
      );
  });
  const eventQueue = useEventQueue();
  useKeyboardInput(eventQueue);
  const { initECS } = useECS();
  // const picture = useSharedValue<SkPicture | null>(null);
  // const pictureCache = useSharedValue<Record<number, SkPicture | SkPath>>({});

  const [shouldRender, setShouldRender] = useState(false);
  const { initPhysics } = useMatterPhysics();

  const defineComponents = useCallback(() => {
    'worklet';
    if (!global._RNTGE_.ecs) return;
    global._RNTGE_.ecs.createComponent(SceneComponentName);
    global._RNTGE_.ecs.createComponent(PositionComponentName);
    global._RNTGE_.ecs.createComponent(TouchComponentName);
    global._RNTGE_.ecs.createComponent(TapComponentName);
    global._RNTGE_.ecs.createComponent(PanComponentName);
    global._RNTGE_.ecs.createComponent(LongPressComponentName);
    global._RNTGE_.ecs.createComponent(KeyboardComponentName);
    global._RNTGE_.ecs.createComponent(MatterBodyComponentName);
    global._RNTGE_.ecs.createComponent(SpriteComponentName);
    global._RNTGE_.ecs.createComponent(AnimationClipComponentName);
    global._RNTGE_.ecs.createComponent(AnimatorStateComponentName);
    global._RNTGE_.ecs.createComponent(TextComponentName);
    global._RNTGE_.ecs.createComponent(RenderComponentName);
    componentNames.forEach(
      (name) => global._RNTGE_.ecs && global._RNTGE_.ecs.createComponent(name)
    );
  }, [componentNames]);

  const registerInternalSystems = useCallback(() => {
    'worklet';
    if (!global._RNTGE_.ecs) return;
    global._RNTGE_.ecs.registerSystem(requestAddSystem);
    global._RNTGE_.ecs.registerSystem(requestCreateEntity);
    global._RNTGE_.ecs.registerSystem(requestCreateEntityBatch);
    global._RNTGE_.ecs.registerSystem(requestRemoveEntity);
    global._RNTGE_.ecs.registerSystem(requestRemoveEntityBatch);
    global._RNTGE_.ecs.registerSystem(requestAddMatterBody);
    global._RNTGE_.ecs.registerSystem(requestAddMatterBodyBatch);
    global._RNTGE_.ecs.registerSystem(animationClipSystem);
    global._RNTGE_.ecs.registerSystem(spriteUpdateSystem);
    global._RNTGE_.ecs.registerSystem(animatorStateSystem);
    global._RNTGE_.ecs.registerSystem(updateMatterWorld);
    global._RNTGE_.ecs.registerSystem(registerSceneSystem);
    global._RNTGE_.ecs.registerSystem(sceneStateSystem);
    global._RNTGE_.ecs.registerSystem(loadSceneSystem);
    global._RNTGE_.ecs.registerSystem(unLoadSceneSystem);
    global._RNTGE_.ecs.registerSystem(assetPreloadSystem);
    global._RNTGE_.ecs.registerSystem(touchSystem);
    global._RNTGE_.ecs.registerSystem(keyboardSystem);
    global._RNTGE_.ecs.registerSystem(renderSystem);
  }, []);

  const onFrame = useCallback(
    (frameInfo: FrameInfo) => {
      'worklet';
      if (global.gc) global.gc();
      if (
        global._RNTGE_?.eventQueue &&
        global._RNTGE_.eventQueue.nextExternalEvents.length > 0
      )
        return;
      eventQueue.clearEvents();
      if (shouldRender !== (global?._RNTGE_?.state === ECSState.INITIALIZED)) {
        scheduleOnRN(setShouldRender, true);
      }
      if (!global._RNTGE_) {
        global._RNTGE_ = {
          physics: undefined,
          imageCache: {},
          shaderCache: {},
          atlasCache: {},
          clipAnimationCache: {},
          fontCache: {},
          textCache: {},
          TouchState: {
            pan: {
              activePointers: new Map<
                number,
                { entityId: number | null; captured: boolean }
              >(),
            },
            tap: {},
            longPress: {},
          },
          ecs: null,
          eventQueue: {
            eventStore: [],
            nextEvents: [],
            nextExternalEvents: [],
          },
          state: ECSState.NOT_INITIALIZED,
          picture: null,
          pictureCache: {},
          _pictureDisposeQueue: [],
          _pictureDisposeReady: [],
        };
        initECS();
        initPhysics();
        defineComponents();
        registerInternalSystems();
        return;
      } else {
        if (!!global._RNTGE_.ecs) {
          global._RNTGE_.ecs.runSystems({
            eventQueue,
            deltaTime: frameInfo.timeSincePreviousFrame ?? 0,
            dimensions,
            safeAreaInsets,
          });
        }
      }
      eventQueue.callAllAwaitingExternalEvents();
    },
    [
      eventQueue,
      dimensions,
      safeAreaInsets,
      initECS,
      initPhysics,
      defineComponents,
      registerInternalSystems,
    ]
  );
  useFrameCallback(onFrame);
  return (
    <>
      <Canvas style={{ flex: 1 }} onSize={dimensions}>
        {shouldRender && (
          <>
            <RenderEntities />
          </>
        )}
      </Canvas>
      <EventQueueProvider eventQueue={eventQueue}>
        <MemoizedContainer>
          {shouldRender && <Scene name="Root">{children}</Scene>}
        </MemoizedContainer>
      </EventQueueProvider>
      <GestureHandlerRootView style={StyleSheet.absoluteFill}>
        <TouchOverlay eventQueue={eventQueue} />
      </GestureHandlerRootView>
    </>
  );
};
