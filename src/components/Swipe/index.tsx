import { ENTITIES_KEYS } from '@/constants/configs';
import {
  MAXIMUM_INITIAL_AMPLITUDE,
  MAXIMUM_INITIAL_FREQUENCY,
  MINIMUM_INITIAL_FREQUENCY,
} from '@/constants/waterConfigs';
import {
  Entity,
  useCanvasDimensions,
  useEntityInstance,
  useEntityMemoizedValue,
  useTouchHandler,
} from '@/containers/ReactNativeSkiaGameEngine';
import { useFrameEffect } from '@/containers/ReactNativeSkiaGameEngine/hooks/useFrameEffect';
import { Sea } from '@/Game/Entities/Sea/Sea';
import { WaveSource } from '@/Game/Entities/Sea/types';
import { State } from '@/Game/Entities/State/State';
import { IWave } from '@/Game/Entities/Wave/types';
import {
  FC,
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  Gesture,
  GestureStateChangeEvent,
  GestureUpdateEvent,
  PanGestureChangeEventPayload,
  PanGestureHandlerEventPayload,
} from 'react-native-gesture-handler';
import {
  runOnJS,
  runOnUI,
  SharedValue,
  useAnimatedReaction,
  useSharedValue,
} from 'react-native-reanimated';

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
  velocityX: number,
  translationY: number,
  accelerationY: number,
  screenHeight: number,
  screenWidth: number
) => {
  // Define a typical maximum for velocityY to handle fast swipes
  const typicalMaxVelocityX = screenWidth * 10; // Adjust as needed for typical fast swipe

  const maxAccY = screenHeight * 8;

  // Normalizing velocityY based on a typical maximum value for fast swipes
  const normalizedVelocityX = normalize(
    velocityX,
    -typicalMaxVelocityX,
    typicalMaxVelocityX,
    -1,
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
  const clampedVelocityX = clamp(normalizedVelocityX, -1, 1);
  const clampedTranslationY = clamp(normalizedTranslationY, 0, 1);
  const clampedAccelerationY = clamp(normalizedAccelerationY, 0, 1);

  // Mapping the normalized values to the desired output range for wave parameters
  const waveVelocity = normalize(clampedVelocityX, -1, 1, -0.5, 0.5);
  const waveFrequency = normalize(clampedVelocityX, 0, 1, 0, 20);
  const waveAcceleration = normalize(clampedAccelerationY, 0, 1, 0, 0.01);
  const waveAmplitude = normalize(clampedTranslationY, 0, 1, 0, 20);

  // console.log(`Wave Velocity: ${waveVelocity}`);
  // console.log(`Wave Frequency: ${waveFrequency}`);
  // console.log(`Wave Acceleration: ${waveAcceleration}`);
  // console.log(`Wave Amplitude: ${waveAmplitude}`);

  return { waveVelocity, waveFrequency, waveAcceleration, waveAmplitude };
};

export const Swipe: FC<{}> = () => {
  const dimensions = useCanvasDimensions();
  const dimensionsRef = useRef(dimensions);

  const hasInitiatedWave = useRef<false | IWave>(false);

  const x = useSharedValue<number>(0);
  const y = useSharedValue<number>(0);
  const width = useSharedValue<number>(dimensions.width || 0);
  const height = useSharedValue<number>(dimensions.height || 0);

  useEffect(() => {
    dimensionsRef.current = dimensions;
  }, [dimensions]);
  const { entity: seaEntityInstance } = useEntityInstance<Sea>({
    label: ENTITIES_KEYS.SEA,
  }) as {
    entity: MutableRefObject<Entity<Sea>>;
  };

  const isRunning = useEntityMemoizedValue<State, SharedValue<boolean>>(
    { label: ENTITIES_KEYS.STATE },
    '_isRunning'
  ) as SharedValue<boolean>;
  const registered = useSharedValue<false | string>(false);
  const prevAcceleration = useSharedValue(0);
  const currentAcceleration = useSharedValue(0);
  const lastChangeTime = useSharedValue(0);
  const touchHandler = useTouchHandler();

  const lerp = useCallback(
    (a: SharedValue<number>, b: number, t: number): number => {
      'worklet';
      return a.value + (b - a.value) * t;
    },
    []
  );

  const addForce = useCallback(
    (
      {
        amplitude,
        frequency,
        speed,
        maxAmplitude,
        time,
        lastForceTime,
        forceSmoothingFactor,
      }: Partial<IWave>,
      newAmplitude: number,
      newFrequency: number,
      newSpeed: number,
      currentTime: number
    ) => {
      'worklet';
      if (
        !amplitude ||
        !frequency ||
        !speed ||
        !forceSmoothingFactor ||
        !maxAmplitude ||
        !time ||
        !lastForceTime
      )
        return;
      // Smoothly blend new values with current values
      amplitude.value = lerp(amplitude, newAmplitude, forceSmoothingFactor);
      frequency.value = lerp(frequency, newFrequency, forceSmoothingFactor);
      speed.value = lerp(speed, newSpeed, forceSmoothingFactor);

      // Keep max amplitude in sync with latest force
      maxAmplitude.value = Math.max(maxAmplitude.value, newAmplitude);

      // Update last force application time
      lastForceTime.value = time.value;
    },
    []
  );

  const initWave = useCallback(
    (
      event: GestureUpdateEvent<
        PanGestureHandlerEventPayload & PanGestureChangeEventPayload
      >,
      currentAccelerationValue: number
    ) => {
      const now = global.nativePerformanceNow();
      const { waveVelocity, waveFrequency, waveAcceleration, waveAmplitude } =
        normalizeSwipeData(
          -1 * event.velocityX,
          Math.abs(event.translationY),
          Math.abs(currentAccelerationValue),
          dimensionsRef.current.height || 1,
          dimensionsRef.current.width || 1
        );
      if (hasInitiatedWave.current) {
        const {
          amplitude,
          frequency,
          speed,
          time,
          lastForceTime,
          maxAmplitude,
          forceSmoothingFactor,
        } = hasInitiatedWave.current;
        runOnUI(addForce)(
          {
            amplitude,
            frequency,
            speed,
            maxAmplitude,
            time,
            lastForceTime,
            forceSmoothingFactor,
          },
          waveAmplitude,
          waveFrequency,
          waveVelocity,
          now
        );
      } else {
        hasInitiatedWave.current = seaEntityInstance.current?.data.initiateWave(
          {
            x: event.x,
            amplitude: waveAmplitude,
            frequency: waveFrequency,
            phase: 0,
            time: 0,
            speed: waveVelocity,
            source: WaveSource.TOUCH,
            layerIndex: seaEntityInstance.current.data.mainLayerIndex,
          }
        );
      }
    },
    [seaEntityInstance, normalizeSwipeData]
  );

  const onEnd = useCallback(() => {
    hasInitiatedWave.current = false;
  }, [hasInitiatedWave]);
  const gesture = useMemo(
    () => ({
      gesture: Gesture.Pan()
        .onChange((event) => {
          if (!isRunning.value) return;
          prevAcceleration.value = currentAcceleration.value;
          currentAcceleration.value = event.velocityY - prevAcceleration.value;
          runOnJS(initWave)(event, currentAcceleration.value);
        })
        .onEnd((event) => {
          if (!isRunning.value) return;
          currentAcceleration.value = 0;
          runOnJS(onEnd)();
        }),
      rect: {
        x,
        y,
        width,
        height,
      },
    }),
    []
  );

  const setGesture = useCallback(() => {
    registered.value = touchHandler.addGesture(gesture);
  }, [touchHandler, gesture]);

  const removeGesture = useCallback(() => {
    'worklet';
    if (registered.value) runOnJS(touchHandler.removeGesture)(registered.value);
  }, [touchHandler]);

  useAnimatedReaction(
    () => isRunning.value,
    (isRunning) => {
      if (isRunning && !registered.value) {
        runOnJS(setGesture)();
      }
    }
  );

  useEffect(() => {
    return () => {
      runOnUI(removeGesture)();
    };
  }, []);
  return null;
};
