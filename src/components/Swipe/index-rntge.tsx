import { FC } from 'react';
import { useAddEntity } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs/useAddEntity/useAddEntity';
import {
  createRenderComponent,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import {
  createPanComponent,
  GestureKinds,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/touch';
import {
  SeaLayerComponentData,
  SeaLayerComponentName,
  WaveSource,
  createWave,
} from '@/Game/ecs-components/SeaLayer';
import { useWindowDimensions } from 'react-native';


const normalize = (
  value: number,
  minInput: number,
  maxInput: number,
  minOutput: number,
  maxOutput: number
) => {
  'worklet';
  return (
    ((value - minInput) / (maxInput - minInput)) * (maxOutput - minOutput) +
    minOutput
  );
};

const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.max(min, Math.min(max, value));
};

const normalizeSwipeData = (
  velocityX: number,
  translationY: number,
  accelerationY: number,
  screenHeight: number,
  screenWidth: number
) => {
  'worklet';
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

  return { waveVelocity, waveFrequency, waveAcceleration, waveAmplitude };
};

// Shared values to track acceleration across gesture updates
let prevVelocityY = 0;
let lastUpdateTime = 0;

export const Swipe: FC<{}> = () => {
const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const components = [
    createRenderComponent({
      shape: {
        type: ShapeTypes.Rectangle,
        width: screenWidth,
        height: screenHeight,
      },
      position: { x: screenWidth / 2, y: screenHeight / 2 },
      visible: true,
      fillColor: 'transparent',
      zIndex: 1, // Low z-index so it doesn't interfere with rendering
    }),
    createPanComponent({
      onPanUpdate: (data) => {
        'worklet';
        // Find SeaLayer entities
        if (!global._RNTGE_.ecs?.value) return;

        const seaLayerEntities =
          global._RNTGE_.ecs.value.getEntitiesWithComponents([
            SeaLayerComponentName,
          ]);

        if (seaLayerEntities.length === 0) return;

        // Use the first SeaLayer entity (assuming there's one main sea)
        const seaEntities = seaLayerEntities.map((entity) =>
          global._RNTGE_.ecs?.value?.components.value[
            SeaLayerComponentName
          ]?.get(entity)
        ) as SeaLayerComponentData[];

        const seaEntityIndex = seaEntities.findIndex(
          (layer, index) => layer.isMainLayer
        );
        const seaEntity = seaEntities[seaEntityIndex];
        if (!seaEntity) return;

        // Calculate acceleration (change in velocity over time)
        const currentTime = Date.now();
        const deltaTime = currentTime - lastUpdateTime;
        const accelerationY =
          deltaTime > 0
            ? (data.gesture.data.velocityY - prevVelocityY) / deltaTime
            : 0;

        prevVelocityY = data.gesture.data.velocityY;
        lastUpdateTime = currentTime;

        const { waveVelocity, waveFrequency, waveAcceleration, waveAmplitude } =
          normalizeSwipeData(
            -1 * data.gesture.data.velocityX,
            Math.abs(data.gesture.data.translationY),
            Math.abs(accelerationY),
            screenHeight,
            screenWidth
          );

        // Update the touch wave (index 1) in the SeaLayer component
        global._RNTGE_.ecs.value.updateComponent(
          seaLayerEntities[seaEntityIndex],
          SeaLayerComponentName,
          (seaLayerComponent: any) => {
            if (
              !seaLayerComponent.waves ||
              seaLayerComponent.waves.length < 2
            ) {
              if (!seaLayerComponent.waves) {
                seaLayerComponent.waves = [];
              }
              while (seaLayerComponent.waves.length < 2) {
                seaLayerComponent.waves.push(
                  createWave({
                    isFlowing: seaLayerComponent.waves.length === 0,
                    x: 0,
                    amplitude: 0,
                    frequency: 0,
                    speed: 0,
                    source:
                      seaLayerComponent.waves.length === 0
                        ? WaveSource.FLOW
                        : WaveSource.TOUCH,
                    dimensions: { width: screenWidth, height: screenHeight },
                  })
                );
              }
            }
            const touchWaveConfig = {
              isFlowing: true,
              x: data.gesture.data.x,
              amplitude: waveAmplitude,
              frequency: waveFrequency,
              speed: waveVelocity,
              time: 0,
              source: WaveSource.TOUCH,
              dimensions: { width: screenWidth, height: screenHeight },
            };

            seaLayerComponent.waves[1] = createWave(touchWaveConfig);
          }
        );
      },
      onPanEnd: (data) => {
        'worklet';
        prevVelocityY = 0;
        lastUpdateTime = 0;
      },
    }),
  ];

  const { entityId } = useAddEntity({ components });

  return null;
};
