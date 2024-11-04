import {
  FC,
  forwardRef,
  memo,
  PropsWithChildren,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import {
  useEntities,
  useGameLoop,
  useSystems,
  useTouchService,
  useDispatcher,
  UseGameLoopOptions,
  useAnimations,
} from './hooks';
import { RNSGEContext } from './context';
import { MemoizedContainer } from './components/MemoizedContainer';
import { Canvas } from '@shopify/react-native-skia';
import {
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { OnEventListeners } from './types/Events';
import { SceneProvider } from './components/Scene/provider';
import { TouchDOM } from './components/TouchDOM/TouchDOM';
import { useCreateCamera } from './hooks/useCreateCamera';

/**
 * This is the handle for the `ReactNativeSkiaGameEngine` component. Use this to control the game engine.
 * @interface RNSGEHandle
 * @property {() => void} start - start the game engine
 * @property {() => void} stop - stop the game engine
 */
export interface RNSGEHandle {
  start: () => void;
  stop: () => void;
}

/**
 * Props for the `ReactNativeSkiaGameEngine` component
 * @property {OnEventListeners} onEventListeners - The event listeners to be registered
 * @property {UseGameLoopOptions} gameLoopOptions - Options for controlling the Game Loop
 * @property {ReactNode} children - The game components
 */
interface RNSGEProps extends PropsWithChildren {
  onEventListeners: OnEventListeners;
  gameLoopOptions?: UseGameLoopOptions;
}

export const ReactNativeSkiaGameEngine = memo(
  forwardRef<RNSGEHandle, RNSGEProps>(
    ({ children, onEventListeners = {}, gameLoopOptions }: RNSGEProps, ref) => {
      const entities = useEntities();
      const systems = useSystems();
      const dispatcher = useDispatcher();
      const touchService = useTouchService();
      const animations = useAnimations();
      const { frames, start, stop } = useGameLoop(
        entities,
        systems,
        dispatcher,
        animations,
        onEventListeners,
        gameLoopOptions
      );
      const [dimensions, setDimensions] = useState<{
        width: number | null;
        height: number | null;
      }>({ width: null, height: null });
      const value = useMemo(
        () => ({
          entities: entities,
          systems: systems,
          frames: frames,
          animations: animations,
          dispatcher,
          touchService,
          dimensions,
        }),
        [touchService.gestures, dimensions]
      );

      useImperativeHandle(ref, () => ({
        start,
        stop,
      }));

      return (
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Canvas
            style={{ flex: 1 }}
            onLayout={({
              nativeEvent: {
                layout: { width, height },
              },
            }) => setDimensions({ width, height })}
          >
            <RNSGEContext.Provider value={value}>
              <SceneProvider>
                {dimensions.width !== null && dimensions.height !== null && (
                  <MemoizedContainer>{children}</MemoizedContainer>
                )}
              </SceneProvider>
            </RNSGEContext.Provider>
          </Canvas>
          <TouchDOM gestures={touchService.gestures} />
        </GestureHandlerRootView>
      );
    }
  )
);
