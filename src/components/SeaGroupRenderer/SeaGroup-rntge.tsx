import { getSeaConfigDefaults } from '@/constants/configs';
import {
  layerFlowConfigs,
  WATER_GRADIENT_COLORS,
} from '@/constants/waterConfigs';
import {
  useCanvasDimensions,
  useAddEntityBatch,
  useAddSystem,
} from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs';
import {
  createRenderComponent,
  RenderComponentData,
  RenderComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';
import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  createSeaLayerComponent,
  createWave,
  SeaLayerComponentData,
  SeaLayerComponentName,
  WaveSource,
} from '@/Game/ecs-components/SeaLayer';
import { FC, useMemo } from 'react';

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

const seaLayerShaderSystem: System = {
  requiredComponents: [SeaLayerComponentName, RenderComponentName],
  process: (entities, components, e, d, ecs) => {
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
          uniforms.height = seaLayerComponent.height;
          uniforms.heightOffset =
            (seaLayerComponent.layerIndex * seaLayerComponent.height) /
            (seaLayerComponent.windowHeight || 1);
          uniforms.frequency = seaLayerComponent.waves[0].frequency;
          uniforms.amplitude = seaLayerComponent.waves[0].amplitude;
          uniforms.speed = seaLayerComponent.waves[0].speed;
          uniforms.dynamicWaveX = seaLayerComponent.waves[1].x;

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

const updateWaveSystem: System = {
  requiredComponents: [SeaLayerComponentName],
  process: (entities, components, e, deltaTime) => {
    'worklet';
    entities.forEach((entity) => {
      const seaLayerComponent: SeaLayerComponentData =
        components[SeaLayerComponentName].get(entity);
      if (!seaLayerComponent) return;

      seaLayerComponent.waves.forEach((wave) => {
        if (!wave.isFlowing) return;
        wave.time += deltaTime / 100;
        // if(wave.source === WaveSource.FLOW) return
        // wave.x += wave.speed * (deltaTime / 1000);
        // if (wave.x > wave.dimensions.width) {
        //   wave.x = wave.x - wave.dimensions.width;
        // }
      });
    });
  },
};

export const SeaGroup: FC = () => {
  const { width, height } = useCanvasDimensions();
  const seaBaseConfig = useMemo(() => {
    return getSeaConfigDefaults(width, height);
  }, [width, height]);

  const seaLayerComponentsBatch = useMemo(() => {
    const layers: SeaLayerComponentData[] = [];
    const {
      x,
      y,
      width,
      height,
      windowHeight,
      windowWidth,
      layersCount = 3,
    } = seaBaseConfig;
    for (let i = 0; i < (seaBaseConfig.layersCount ?? 3); i++) {
      const gradientColors =
        WATER_GRADIENT_COLORS[i % WATER_GRADIENT_COLORS.length];
      const flowConfig = layerFlowConfigs[i];

      const layerY = y + height - (height / layersCount) * i;
      const startingX = x;
      const startingY = layerY - height / 2;

      const layerData: SeaLayerComponentData = {
        x: x,
        y: layerY,
        width: width,
        height: height / layersCount,
        gradientColors,
        flowAmplitude: flowConfig.flowAmplitude,
        flowFrequency: flowConfig.flowFrequency,
        flowSpeed: flowConfig.flowSpeed,
        windowWidth: windowWidth,
        windowHeight: windowHeight,
        layerIndex: i,
        startingX,
        startingY,
        waves: [],
      };

      const staticWave = createWave({
        isFlowing: true,
        dimensions: { width, height },
        x: startingX,
        amplitude: flowConfig.flowAmplitude,
        frequency: flowConfig.flowFrequency,
        speed: flowConfig.flowSpeed,
        source: WaveSource.FLOW,
      });

      const touchWave = createWave({
        isFlowing: false,
        dimensions: { width, height },
        x: 0,
        amplitude: 0,
        frequency: 0,
        speed: 0,
        source: WaveSource.TOUCH,
      });

      layerData.waves.push(staticWave);
      layerData.waves.push(touchWave);

      layers.push(layerData);
    }
    return layers;
  }, []);

  const seaLayerEntitiesBatch: Component<any>[][] = useMemo(() => {
    return seaLayerComponentsBatch.map((layerData, index) => [
      createSeaLayerComponent(layerData),
      createRenderComponent({
        shape: {
          type: 'rectangle',
          width: layerData.width,
          height: layerData.height,
        },
        fillColor: layerData.gradientColors[0],
        visible: true,
        position: { x: layerData.x, y: layerData.y },
        shader: {
          key: 'sea',
          uniforms: {
            iTime: 0,
            height,
            heightOffset:
              (index * layerData.height) / (layerData.windowHeight || 1),
            frequency: layerData.waves[0].frequency,
            amplitude: layerData.waves[0].amplitude,
            speed: layerData.waves[0].speed,
            dynamicWaveX: layerData.waves[1].x,
            dynamicWave: [
              layerData.waves[1].amplitude,
              layerData.waves[1].frequency,
              layerData.waves[1].speed,
              layerData.waves[1].time,
            ],
            heightOffsetFreq: 0.5,
            heightOffsetAmp: 0.0,
            waterColor: [28, 163, 236].map((c) => c / 255),
            canvasSize: [
              layerData.windowWidth || 0,
              layerData.windowHeight || 0,
            ],
          },
        },
      }),
    ]);
  }, [seaLayerComponentsBatch]);

  useAddEntityBatch({ batch: seaLayerEntitiesBatch });

  useAddSystem({ system: updateWaveSystem });
  useAddSystem({ system: seaLayerShaderSystem });

  return null;
};
