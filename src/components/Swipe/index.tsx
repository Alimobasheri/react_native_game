import { ENTITIES_KEYS } from "@/constants/configs";
import {
  MAXIMUM_INITIAL_AMPLITUDE,
  MAXIMUM_INITIAL_FREQUENCY,
  MINIMUM_INITIAL_FREQUENCY,
} from "@/constants/waterConfigs";
import {
  Entity,
  useEntityInstance,
  useTouchHandler,
} from "@/containers/ReactNativeSkiaGameEngine";
import { useFrameEffect } from "@/containers/ReactNativeSkiaGameEngine/hooks/useFrameEffect";
import { Sea } from "@/Game/Entities/Sea/Sea";
import { WaveSource } from "@/Game/Entities/Sea/types";
import { FC, useMemo, useRef } from "react";
import { Gesture } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

export const Swipe: FC<{}> = () => {
  const { entity: seaEntityInstance, found } = useEntityInstance<Sea>({
    label: ENTITIES_KEYS.SEA,
  });
  const registered = useRef(false);
  const prevAcceleration = useRef(0);
  const currentAcceleration = useRef(0);
  const touchHandler = useTouchHandler();
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .onChange((event) => {
          prevAcceleration.current = currentAcceleration.current;
          currentAcceleration.current = event.velocityY;
        })
        .onEnd((event) => {
          if (!found.current) return;
          const amplitude = Math.min(
            -event.translationY,
            MAXIMUM_INITIAL_AMPLITUDE
          );
          const frequency = Math.min(
            MAXIMUM_INITIAL_FREQUENCY,
            Math.max(
              MINIMUM_INITIAL_FREQUENCY,
              Math.abs(event.velocityY / 100000)
            )
          );
          seaEntityInstance.current?.data.initiateWave({
            x: event.x,
            amplitude,
            frequency,
            phase: 0,
            time: 0,
            speed: Math.max(1, Math.abs(event.velocityY / 1000)),
            initialForce: Math.abs(currentAcceleration.current / 20),
            source: WaveSource.TOUCH,
            layerIndex: seaEntityInstance.current.data.mainLayerIndex,
          });
          currentAcceleration.current = 0;
        })
        .runOnJS(true),
    []
  );

  useFrameEffect(() => {
    if (registered.current) return;
    if (found.current) {
      touchHandler.addGesture(gesture);
      registered.current = true;
    }
  }, []);
  return null;
};
