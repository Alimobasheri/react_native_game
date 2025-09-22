import {
  Canvas,
  Skia,
  SkImage,
  SkPath,
  SkPicture,
  SkRuntimeEffect,
} from '@shopify/react-native-skia';
import {
  FC,
  PropsWithChildren,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { ECSState, useECS } from './hooks-ecs/useECS/useECS';
import { ECSProvider } from './contexts-rntge/ECSContext/ECSProvider';
import { MemoizedContainer } from './components/MemoizedContainer';
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
import { loadImageAssets } from './services-ecs/image-store';
import { AtlasData, ClipAnimationData } from './types-ecs/render';
import { Assets } from './types-ecs/assets';
import { AnimationClipComponentName } from './internal/components/animationClip';
import { SpriteComponentName } from './internal/components/sprite';
import { AnimatorStateComponentName } from './internal/components/animatorState';
import { spriteUpdateSystem } from './internal/systems/animations/spriteUpdateSystem';
import { animatorStateSystem } from './internal/systems/animations/animatorStateSystem';
import { animationClipSystem } from './internal/systems/animations/animationClipSystem';

export interface ReactNativeTurboGameEngineProps {
  componentNames: string[];
  images?: Record<string, any>;
  shaders?: Record<string, string>;
  clipAnimations?: Record<string, ClipAnimationData>;
  atlases?: Record<string, AtlasData>;
}

export const ReactNativeTurboGameEngine: FC<
  PropsWithChildren<ReactNativeTurboGameEngineProps>
> = ({
  componentNames,
  images,
  shaders,
  children,
  clipAnimations,
  atlases,
}) => {
  const setDimensions = useRNTGEStore((state) => state.setDimensions);
  const dimensions = useSharedValue({ width: 0, height: 0 });
  const eventQueue = useEventQueue();
  const { ECS, state, initECS } = useECS({ eventQueue });
  const picture = useSharedValue<SkPicture | null>(null);
  const pictureCache = useSharedValue<Record<number, SkPicture | SkPath>>({});
  const imageCache = useSharedValue<Record<string, SkImage>>({});

  const assets = useSharedValue<Assets>({
    clipAnimations,
    atlases,
  });
  const shaderEffects = useSharedValue<Record<string, SkRuntimeEffect>>({});

  // Compile shaders once on mount
  useLayoutEffect(() => {
    if (shaders) {
      const compiledShaders = Object.fromEntries(
        Object.entries(shaders).map(([key, source]) => {
          const effect = Skia.RuntimeEffect.Make(source);
          if (!effect) {
            // In a real scenario, provide more robust error handling
            console.error(`Failed to compile shader: ${key}`);
            return [key, null];
          }
          return [key, effect];
        })
      );
      //@ts-ignore
      shaderEffects.value = Object.fromEntries(
        Object.entries(compiledShaders).filter(([, effect]) => effect !== null)
      );
    }
  }, [shaders]);

  useEffect(() => {
    loadImageAssets(images ?? {}, (loadedImageCache) => {
      imageCache.value = loadedImageCache;
    });
  }, [images]);

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
    ECS.value.createComponent(SpriteComponentName);
    ECS.value.createComponent(AnimationClipComponentName);
    ECS.value.createComponent(AnimatorStateComponentName);
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
    ECS.value.registerSystem(
      renderSystem(picture, dimensions, pictureCache, imageCache, shaderEffects)
    );
  }, [ECS, picture, dimensions, pictureCache, imageCache, shaderEffects]);

  const onFrame = useCallback(
    (frameInfo: FrameInfo) => {
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
          ECS.value.runSystems({
            ecs: ECS as SharedValue<ECS>,
            eventQueue,
            deltaTime: frameInfo.timeSincePreviousFrame ?? 0,
            assets: assets,
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
