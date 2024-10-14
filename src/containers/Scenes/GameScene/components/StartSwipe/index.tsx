import { ENTITIES_KEYS } from '@/constants/configs';
import {
  useCanvasDimensions,
  useEntityInstance,
  useTouchHandler,
} from '@/containers/ReactNativeSkiaGameEngine';
import { useFrameEffect } from '@/containers/ReactNativeSkiaGameEngine/hooks/useFrameEffect';
import { State } from '@/Game/Entities/State/State';
import { FC, useEffect, useMemo, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';

export const StartSwipe: FC<{}> = () => {
  const dimensions = useCanvasDimensions();

  const x = useSharedValue<number>(0);
  const y = useSharedValue<number>(0);
  const height = useSharedValue<number>(dimensions.height || 0);
  const width = useSharedValue<number>(dimensions.width || 0);

  const dimensionsRef = useRef(dimensions);
  useEffect(() => {
    dimensionsRef.current = dimensions;
  }, [dimensions]);
  const { entity: gameStateEntity, found } = useEntityInstance<State>({
    label: ENTITIES_KEYS.STATE,
  });

  const touchHandler = useTouchHandler();
  const registered = useRef<false | string>(false);
  const gesture = useMemo(
    () => ({
      gesture: Gesture.Pan()
        .onEnd((event) => {
          if (!found.current) return;
          if (!dimensionsRef.current.height) return;
          if (event.translationY * -1 > dimensionsRef.current.height * 0.2) {
            if (
              gameStateEntity.current &&
              !Array.isArray(gameStateEntity.current)
            ) {
              if (!gameStateEntity.current.data.isRunning) {
                gameStateEntity.current.data.isRunning = true;
              }
            }
          }
        })
        .runOnJS(true),
      rect: { x, y, width, height },
    }),
    []
  );

  useFrameEffect(() => {
    if (registered.current) return;
    if (found.current) {
      registered.current = touchHandler.addGesture(gesture);
    }
  }, []);
  useEffect(() => {
    return () => {
      if (registered.current) {
        touchHandler.removeGesture(registered.current);
      }
    };
  }, []);
  return null;
};
