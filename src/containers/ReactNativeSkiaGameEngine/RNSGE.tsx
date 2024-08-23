import { FC, memo, PropsWithChildren, useMemo, useState } from 'react';
import {
  useEntities,
  useGameLoop,
  useSystems,
  useTouchService,
  useDispatcher,
} from './hooks';
import { RNSGEContext } from './context';
import { MemoizedContainer } from './components/MemoizedContainer';
import { Canvas } from '@shopify/react-native-skia';
import {
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

export const ReactNativeSkiaGameEngine: FC<PropsWithChildren> = memo(
  ({ children }) => {
    const entities = useEntities();
    const systems = useSystems();
    const dispatcher = useDispatcher();
    const touchService = useTouchService();
    const { frames } = useGameLoop(entities, systems, dispatcher);
    const [dimensions, setDimensions] = useState<{
      width: number | null;
      height: number | null;
    }>({ width: null, height: null });
    const value = useMemo(
      () => ({
        entities: entities,
        systems: systems,
        frames: frames,
        dispatcher,
        touchService,
        dimensions,
      }),
      [touchService.gestures, dimensions]
    );
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GestureDetector gesture={touchService.gestures}>
          <Canvas
            style={{ flex: 1 }}
            onLayout={({
              nativeEvent: {
                layout: { width, height },
              },
            }) => setDimensions({ width, height })}
          >
            <RNSGEContext.Provider value={value}>
              {dimensions.width !== null && dimensions.height !== null && (
                <MemoizedContainer>{children}</MemoizedContainer>
              )}
            </RNSGEContext.Provider>
          </Canvas>
        </GestureDetector>
      </GestureHandlerRootView>
    );
  }
);
