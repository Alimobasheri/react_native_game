import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  RenderComponentData,
  RenderComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import {
  SeaLayerComponentData,
  SeaLayerComponentName,
  WaveSource,
} from '@/Game/ecs-components/SeaLayer';
import { FC } from 'react';
import { useAddSystem } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs';
import { SeaLayerProvider } from './SeaLayerContext';
import { SeaLayer } from './SeaLayer';
import { WAVE_DECAY_CONFIG } from '@/constants/waveConfigs';

interface SeaLayerShaderInfoUniforms {
  iTime: number;
  height: number;
  heightOffset: number;
  frequency: number;
  amplitude: number;
  speed: number;
  heightOffsetFreq: number;
  heightOffsetAmp: number;
  dynamicWaveX: number;
  dynamicWave: [number, number, number, number];
  waterColor: [number, number, number];
  canvasSize: [number, number];
}

export const seaLayerShaderSystem: System = {
  requiredComponents: [SeaLayerComponentName, RenderComponentName],
  process: ({ entities, components, ecs }) => {
    'worklet';
    entities.forEach((entity) => {
      const seaLayerComponent: SeaLayerComponentData =
        components[SeaLayerComponentName].get(entity);
      const renderData: RenderComponentData =
        components[RenderComponentName].get(entity);

      if (!seaLayerComponent || !renderData) return;

      ecs.value.updateComponent<RenderComponentData>(
        entity,
        RenderComponentName,
        (renderComponent) => {
          // The 'recipe' gives us a mutable reference.
          // No new objects are created here. We are just setting properties.
          if (!renderComponent.shader) return;

          const uniforms = renderComponent.shader.uniforms;

          uniforms.iTime = seaLayerComponent.waves[0].time;
          uniforms.height =
            seaLayerComponent.height / seaLayerComponent.windowHeight;
          uniforms.heightOffset =
            0.5 +
            (seaLayerComponent.layerIndex * seaLayerComponent.height) /
              seaLayerComponent.windowHeight;
          uniforms.frequency = seaLayerComponent.waves[0].frequency;
          uniforms.amplitude = seaLayerComponent.waves[0].amplitude;
          uniforms.speed = seaLayerComponent.waves[0].speed;
          const entityCenterX =
            renderComponent.position?.x ?? seaLayerComponent.windowWidth / 2;
          const offset = entityCenterX - seaLayerComponent.windowWidth / 2;
          uniforms.dynamicWaveX =
            seaLayerComponent.waves[1].x - seaLayerComponent.windowWidth / 2;

          const dynamicWave = uniforms.dynamicWave as number[];
          dynamicWave[0] = seaLayerComponent.waves[1].amplitude;
          dynamicWave[1] = seaLayerComponent.waves[1].frequency;
          dynamicWave[2] = seaLayerComponent.waves[1].speed;
          dynamicWave[3] = seaLayerComponent.waves[1].time;

          const canvasSize = uniforms.canvasSize as number[];
          canvasSize[0] = seaLayerComponent.windowWidth || 0;
          canvasSize[1] = seaLayerComponent.windowHeight || 0;
        }
      );
    });
  },
};

export const updateWaveSystem: System = {
  requiredComponents: [SeaLayerComponentName],
  process: ({ entities, components, deltaTime, ecs }) => {
    'worklet';
    entities.forEach((entity) => {
      const seaLayerComponent: SeaLayerComponentData =
        components[SeaLayerComponentName].get(entity);
      if (!seaLayerComponent) return;

      // Update time for all flowing waves
      seaLayerComponent.waves.forEach((wave) => {
        if (!wave.isFlowing) return;
        wave.time += deltaTime / 100;
      });

      // Decay touch waves (index 1) towards flow wave values
      if (seaLayerComponent.waves.length > 1) {
        const touchWave = seaLayerComponent.waves[1];
        if (touchWave.source === WaveSource.TOUCH && touchWave.isFlowing) {
          const flowAmplitude = seaLayerComponent.flowAmplitude;
          const flowFrequency = seaLayerComponent.flowFrequency;
          const flowSpeed = seaLayerComponent.flowSpeed;

          // Convert deltaTime to seconds for decay calculations
          const deltaSeconds = deltaTime / 1000;

          // Calculate decayed values using config
          const amplitudeDiff = touchWave.amplitude - flowAmplitude;
          const newAmplitude =
            flowAmplitude +
            amplitudeDiff *
              Math.pow(WAVE_DECAY_CONFIG.amplitudeDecayRate, deltaSeconds);

          const frequencyDiff = touchWave.frequency - flowFrequency;
          const newFrequency =
            flowFrequency +
            frequencyDiff *
              Math.pow(WAVE_DECAY_CONFIG.frequencyDecayRate, deltaSeconds);

          const speedDiff = touchWave.speed - flowSpeed;
          const newSpeed =
            flowSpeed +
            speedDiff *
              Math.pow(WAVE_DECAY_CONFIG.speedDecayRate, deltaSeconds);

          // Check if wave should be removed based on config thresholds
          const amplitudeCloseToFlow =
            Math.abs(newAmplitude - flowAmplitude) <
            flowAmplitude * WAVE_DECAY_CONFIG.amplitudeProximityThreshold;

          const shouldRemove =
            (newAmplitude <= WAVE_DECAY_CONFIG.minAmplitudeThreshold ||
              amplitudeCloseToFlow) &&
            Math.abs(newFrequency - flowFrequency) <
              WAVE_DECAY_CONFIG.frequencyProximityThreshold &&
            Math.abs(newSpeed - flowSpeed) <
              WAVE_DECAY_CONFIG.speedProximityThreshold;

          // Apply decay or remove wave through ECS update
          ecs.value.updateComponent<SeaLayerComponentData>(
            entity,
            SeaLayerComponentName,
            (component) => {
              if (component.waves.length > 1) {
                const wave = component.waves[1];
                if (shouldRemove) {
                  // Reset touch wave to inactive state
                  wave.isFlowing = false;
                  wave.amplitude = 0;
                  wave.frequency = 0;
                  wave.speed = 0;
                  wave.time = 0;
                } else {
                  // Apply decay
                  wave.amplitude = newAmplitude;
                  wave.frequency = newFrequency;
                  wave.speed = newSpeed;
                }
              }
            }
          );
        }
      }
    });
  },
};

interface SeaGroupProps {
  children: React.ReactNode;
}

export const SeaGroup: FC<SeaGroupProps> = ({ children }) => {
  useAddSystem({ system: updateWaveSystem });
  useAddSystem({ system: seaLayerShaderSystem });

  return (
    <SeaLayerProvider>
      <SeaLayer index={2} />
      {children}
      <SeaLayer index={1} />
      <SeaLayer index={0} />
    </SeaLayerProvider>
  );
};
