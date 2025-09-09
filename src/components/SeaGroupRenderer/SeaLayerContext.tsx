import React, { createContext, useContext, useMemo } from 'react';
import { getSeaConfigDefaults } from '@/constants/configs';
import {
  layerFlowConfigs,
  WATER_GRADIENT_COLORS,
} from '@/constants/waterConfigs';
import { useCanvasDimensions } from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs';
import {
  createWave,
  SeaLayerComponentData,
  WaveSource,
} from '@/Game/ecs-components/SeaLayer';

export interface SeaLayerConfig extends SeaLayerComponentData {
  id: string;
}

export interface SeaLayerContextValue {
  seaLayers: SeaLayerConfig[];
  totalLayers: number;
}

const SeaLayerContext = createContext<SeaLayerContextValue | null>(null);

export const useSeaLayerContext = () => {
  const context = useContext(SeaLayerContext);
  if (!context) {
    throw new Error('useSeaLayerContext must be used within a SeaGroup');
  }
  return context;
};

interface SeaLayerProviderProps {
  children: React.ReactNode;
}

export const SeaLayerProvider: React.FC<SeaLayerProviderProps> = ({
  children,
}) => {
  const { width, height } = useCanvasDimensions();
  const seaBaseConfig = useMemo(() => {
    return getSeaConfigDefaults(width, height);
  }, [width, height]);

  const seaLayers = useMemo(() => {
    const layers: SeaLayerConfig[] = [];
    const {
      x,
      y,
      width,
      height,
      windowHeight,
      windowWidth,
      layersCount = 3,
    } = seaBaseConfig;

    for (let i = 0; i < layersCount; i++) {
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

      layers.push({
        ...layerData,
        id: `sea-layer-${i}`,
      });
    }

    return layers;
  }, [seaBaseConfig]);

  const contextValue = useMemo(
    () => ({
      seaLayers,
      totalLayers: seaLayers.length,
    }),
    [seaLayers]
  );

  return (
    <SeaLayerContext.Provider value={contextValue}>
      {children}
    </SeaLayerContext.Provider>
  );
};
