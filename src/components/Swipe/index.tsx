import { ENTITIES_KEYS } from "@/constants/configs";
import {
  MAXIMUM_INITIAL_AMPLITUDE,
  MAXIMUM_INITIAL_FREQUENCY,
  MINIMUM_INITIAL_FREQUENCY,
} from "@/constants/waterConfigs";
import {
  Entity,
  useCanvasDimensions,
  useEntityInstance,
  useTouchHandler,
} from "@/containers/ReactNativeSkiaGameEngine";
import { useFrameEffect } from "@/containers/ReactNativeSkiaGameEngine/hooks/useFrameEffect";
import { Sea } from "@/Game/Entities/Sea/Sea";
import { WaveSource } from "@/Game/Entities/Sea/types";
import { FC, useEffect, useMemo, useRef } from "react";
import { Gesture } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

const normalize = (
  value: number,
  minInput: number,
  maxInput: number,
  minOutput: number,
  maxOutput: number
) => {
  return (
    ((value - minInput) / (maxInput - minInput)) * (maxOutput - minOutput) +
    minOutput
  );
};

const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, value));
};

const normalizeSwipeData = (
  velocityY: number,
  translationY: number,
  accelerationY: number,
  screenHeight: number
) => {
  // Define a typical maximum for velocityY to handle fast swipes
  const typicalMaxVelocityY = screenHeight * 10; // Adjust as needed for typical fast swipe

  const maxAccY = screenHeight * 8;

  // Normalizing velocityY based on a typical maximum value for fast swipes
  const normalizedVelocityY = normalize(
    velocityY,
    0,
    typicalMaxVelocityY,
    0,
    1
  );
  // Normalizing translationY based on screen height
  const normalizedTranslationY = normalize(
    translationY,
    0,
    screenHeight * 0.8,
    0,
    1
  );

  const normalizedAccelerationY = normalize(accelerationY, 0, maxAccY, 0, 1);

  // Clamping the values to ensure they stay within the desired range
  const clampedVelocityY = clamp(normalizedVelocityY, 0, 1);
  const clampedTranslationY = clamp(normalizedTranslationY, 0, 1);
  const clampedAccelerationY = clamp(normalizedAccelerationY, 0, 1);

  // Mapping the normalized values to the desired output range for wave parameters
  const waveVelocity = normalize(clampedVelocityY, 0, 1, 0.0, 0.2);
  const waveFrequency = normalize(clampedVelocityY, 0, 1, 0, 12);
  const waveAcceleration = normalize(clampedAccelerationY, 0, 1, 0, 0.01);
  const waveAmplitude = normalize(clampedTranslationY, 0, 1, 0, 10);

  console.log(`Wave Velocity: ${waveVelocity}`);
  console.log(`Wave Frequency: ${waveFrequency}`);
  console.log(`Wave Acceleration: ${waveAcceleration}`);
  console.log(`Wave Acceleration: ${waveAmplitude}`);

  return { waveVelocity, waveFrequency, waveAcceleration, waveAmplitude };
};

export const Swipe: FC<{}> = () => {
  const dimensions = useCanvasDimensions();
  const dimensionsRef = useRef(dimensions);
  useEffect(() => {
    dimensionsRef.current = dimensions;
  }, [dimensions]);
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
              Math.abs(-event.velocityY / 100)
            )
          );
          const {
            waveVelocity,
            waveFrequency,
            waveAcceleration,
            waveAmplitude,
          } = normalizeSwipeData(
            Math.abs(event.velocityY),
            Math.abs(event.translationY),
            Math.abs(currentAcceleration.current),
            dimensionsRef.current.height || 1
          );
          seaEntityInstance.current?.data.initiateWave({
            x: event.x,
            amplitude: waveAmplitude,
            frequency: waveFrequency,
            phase: 0,
            time: 0,
            speed: waveVelocity,
            initialForce: waveAcceleration,
            source: WaveSource.TOUCH,
            layerIndex: seaEntityInstance.current.data.mainLayerIndex,
            dimensions: dimensionsRef.current,
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
