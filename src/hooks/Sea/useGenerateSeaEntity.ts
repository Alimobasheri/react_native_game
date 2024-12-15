import { WATER_GRADIENT_COLORS } from '@/constants/waterConfigs';
import {
  useCanvasDimensions,
  useAddEntity,
} from '@/containers/ReactNativeSkiaGameEngine';
import { Sea } from '@/Game/Entities/Sea/Sea';
import { SeaConfig } from '@/Game/Entities/Sea/types';
import { useMemo } from 'react';

export const useGenerateSeaEntity = () => {
  const dimensions = useCanvasDimensions();
  if (!dimensions.width || !dimensions.height) return null;
  const config: SeaConfig = useMemo(() => {
    if (!dimensions.width || !dimensions.height) return {};
    const width = dimensions.width * 1.2;

    return {
      x: width / 2,
      y: dimensions.height * 0.7,
      width: width,
      height: dimensions.height * 0.3,
      layersCount: 3,
      mainLayerIndex: 1,
      gradientColors: WATER_GRADIENT_COLORS[0],
    };
  }, [dimensions.width, dimensions.height]);
  const seaEntitiy = useAddEntity<Sea>(new Sea(config), {
    label: 'sea',
  });
};
