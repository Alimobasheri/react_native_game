import { ENTITIES_KEYS } from '@/constants/configs';
import {
  useCanvasDimensions,
  useEntityInstance,
  useEntityMemoizedValue,
  useTouchHandler,
} from '@/containers/ReactNativeSkiaGameEngine';
import { useFrameEffect } from '@/containers/ReactNativeSkiaGameEngine/hooks/useFrameEffect';
import { State } from '@/Game/Entities/State/State';
import { FC, useCallback, useEffect, useMemo, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnUI, SharedValue, useSharedValue } from 'react-native-reanimated';

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

  const isRunning = useEntityMemoizedValue<State, SharedValue<boolean>>(
    { label: ENTITIES_KEYS.STATE },
    '_isRunning'
  ) as SharedValue<boolean>;

  const isHomeScene = useEntityMemoizedValue<State, SharedValue<boolean>>(
    { label: ENTITIES_KEYS.STATE },
    '_isHomeScene'
  ) as SharedValue<boolean>;

  const touchHandler = useTouchHandler();
  const registered = useRef<false | string>(false);
  const updateStateOnUI = useCallback(() => {
    'worklet';
    if (isHomeScene.value) {
      isHomeScene.value = false;
      isRunning.value = true;
    }
  }, [isHomeScene, isRunning]);
  const gesture = useMemo(
    () => ({
      gesture: Gesture.Pan().onEnd((event) => {
        if (!dimensionsRef.current.height) return;
        if (event.translationY * -1 > dimensionsRef.current.height * 0.2) {
          updateStateOnUI();
        }
      }),
      rect: { x, y, width, height },
    }),
    []
  );

  useFrameEffect(() => {
    if (registered.current) return;
    registered.current = touchHandler.addGesture(gesture);
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
