import { useCanvasDimensions } from '@/containers/ReactNativeSkiaGameEngine';
import { SeaConfig } from '@/Game/Entities/Sea/types';
import { useMemo } from 'react';
import {
  SharedValue,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';

export interface IUseGenerateSeaLayerArgs {
  totalWidth: SharedValue<number>;
  totalHeight: SharedValue<number>;
  seaWidth: SharedValue<number>;
  seaHeight: SharedValue<number>;
  seaY: SharedValue<number>;
  seaX: SharedValue<number>;
  layersCount: SharedValue<number>;
  layerIndex: number;
  initialFlowAmplitude: number;
  initialFlowFrequency: number;
}

export const useGenerateSeaLayer = ({
  totalWidth,
  totalHeight,
  seaWidth,
  seaHeight,
  seaX,
  seaY,
  layersCount,
  layerIndex,
  initialFlowAmplitude,
  initialFlowFrequency,
}: IUseGenerateSeaLayerArgs): SeaConfig => {
  const dimensions = useCanvasDimensions();

  const x = useDerivedValue(() => seaX.value, [seaX.value]);
  const y = useDerivedValue(
    () =>
      seaY.value +
      seaHeight.value -
      (seaHeight.value / layersCount.value) * layerIndex,
    [seaY.value, seaHeight.value, layersCount.value, layerIndex]
  );
  const height = useDerivedValue(
    () => seaHeight.value / layersCount.value,
    [seaHeight.value, layersCount.value]
  );
  const windowWidth = useSharedValue(0);
  const windowHeight = useSharedValue(0);
  const flowAmplitude = useSharedValue(initialFlowAmplitude);
  const flowFrequency = useSharedValue(initialFlowFrequency);

  return {
    x,
    y,
    width: seaWidth,
    height,
    windowWidth,
    windowHeight,
    flowAmplitude,
    flowFrequency,
  };
};
