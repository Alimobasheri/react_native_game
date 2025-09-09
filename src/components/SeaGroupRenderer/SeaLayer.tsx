import React, { useMemo } from 'react';
import { useAddEntity } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs';
import {
  createRenderComponent,
  RenderComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import {
  createSeaLayerComponent,
  SeaLayerComponentName,
} from '@/Game/ecs-components/SeaLayer';
import { useSeaLayerContext } from './SeaLayerContext';

interface SeaLayerProps {
  index: number;
}

export const SeaLayer: React.FC<SeaLayerProps> = ({ index }) => {
  const { seaLayers } = useSeaLayerContext();
  const layerConfig = seaLayers[index];

  if (!layerConfig) {
    console.warn(`SeaLayer: No configuration found for index ${index}`);
    return null;
  }

  const seaLayerEntity = useMemo(
    () => [
      createSeaLayerComponent(layerConfig),
      createRenderComponent({
        shape: {
          type: 'rectangle',
          width: layerConfig.windowWidth,
          height: layerConfig.windowHeight,
        },
        fillColor: layerConfig.gradientColors[0],
        visible: true,
        position: {
          x: layerConfig.windowWidth / 2,
          y: layerConfig.windowHeight / 2,
        },
        shader: {
          key: 'sea',
          uniforms: {
            iTime: 0,
            height: layerConfig.height,
            heightOffset:
              0.3 +
              (layerConfig.layerIndex * layerConfig.height) /
                layerConfig.windowHeight,
            frequency: layerConfig.waves[0].frequency,
            amplitude: layerConfig.waves[0].amplitude,
            speed: layerConfig.waves[0].speed,
            dynamicWaveX: layerConfig.waves[1].x,
            dynamicWave: [
              layerConfig.waves[1].amplitude,
              layerConfig.waves[1].frequency,
              layerConfig.waves[1].speed,
              layerConfig.waves[1].time,
            ],
            heightOffsetFreq: 0.5,
            heightOffsetAmp: 0.0,
            waterColor: [28, 163, 236].map((c) => c / 255),
            canvasSize: [
              layerConfig.windowWidth || 0,
              layerConfig.windowHeight || 0,
            ],
          },
        },
      }),
    ],
    [layerConfig]
  );

  useAddEntity({ components: seaLayerEntity });

  return null;
};
