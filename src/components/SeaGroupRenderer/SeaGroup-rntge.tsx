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
  process: ({ entities, components, deltaTime }) => {
    'worklet';
    entities.forEach((entity) => {
      const seaLayerComponent: SeaLayerComponentData =
        components[SeaLayerComponentName].get(entity);
      if (!seaLayerComponent) return;

      seaLayerComponent.waves.forEach((wave) => {
        if (!wave.isFlowing) return;
        wave.time += deltaTime / 100;
      });
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
