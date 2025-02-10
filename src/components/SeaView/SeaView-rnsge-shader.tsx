import { Sea } from '@/Game/Entities/Sea/Sea';
import createWaveShader, {
  useWaveShaderUniforms,
} from '@/Shaders/WaveShader/waveShader';
import { ENTITIES_KEYS } from '@/constants/configs';
import {
  Entity,
  useCanvasDimensions,
  useEntityInstance,
} from '@/containers/ReactNativeSkiaGameEngine';
import { useFrameEffect } from '@/containers/ReactNativeSkiaGameEngine/hooks/useFrameEffect';
import { Fill, Shader, SkPath } from '@shopify/react-native-skia';
import { Skia, LinearGradient } from '@shopify/react-native-skia';
import { FC, useMemo, useState } from 'react';
import {
  makeMutable,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
export interface ISeaViewProps {
  entityId: string;
  layerIndex: number;
}
export const SeaViewShader: FC<ISeaViewProps> = (props) => {
  const dimensions = useCanvasDimensions();
  const time = useSharedValue(0);

  const { entity: seaEntityInstance } = useEntityInstance<Sea>({
    label: ENTITIES_KEYS.SEA,
  }) as { entity: React.MutableRefObject<Entity<Sea>> };

  const [layer, setLayer] = useState(
    seaEntityInstance.current.data.layers[props.layerIndex]
  );

  const dynamicWave = useMemo(() => {
    return {
      x: layer.waves?.[1].x,
      amplitude: layer.waves?.[1].amplitude,
      frequency: layer.waves?.[1].frequency,
      speed: layer.waves?.[1].speed,
      time: layer.waves?.[1].time,
    };
  }, [layer.waves?.[1]]);

  // const wavePath = useSharedValue<SkPath>(Skia.Path.Make());

  // const linearGradientMemo = useMemo(() => {
  //   if (!gradientColors) return null;
  //   return (
  //     <LinearGradient
  //       colors={gradientColors || []}
  //       start={{ x: 0, y: 1 }}
  //       end={{ x: 1, y: 1 }}
  //     />
  //   );
  // }, [gradientColors]);

  useFrameEffect((delta) => {
    time.value = time.value + delta / 100;
  }, []);

  const source = useMemo(() => createWaveShader()!, []);

  const dynamicWaveX = useDerivedValue(() => {
    if (!dynamicWave?.x) return 0;
    return dynamicWave.x.value;
  }, [dynamicWave?.x]);

  const dynamicWaveUniformValue = useDerivedValue<
    [number, number, number, number]
  >(() => {
    if (!dynamicWave) return [0, 0, 0, 0];
    return [
      dynamicWave.amplitude.value,
      dynamicWave.frequency.value,
      dynamicWave.speed.value,
      dynamicWave.time.value,
    ];
  }, [
    dynamicWave?.amplitude,
    dynamicWave?.frequency,
    dynamicWave?.speed,
    dynamicWave?.time,
  ]);

  const uniforms = useWaveShaderUniforms({
    dimensions,
    frequency: layer.waves[0].frequency,
    amplitude: layer.waves[0].amplitude,
    speed: layer.waves[0].speed,
    time: layer.waves[0].time,
    dynamicWaveX,
    dynamicWaveUniformValue,
    height: layer.height,
    heightOffset: (props.layerIndex * layer.height) / (dimensions.height || 1),
    heightOffsetFreq: 0.5,
    heightOffsetAmp: 0.0,
    waterColor: [28, 163, 236],
  });

  if (!source) {
    return null;
  }

  return (
    <Fill blendMode={'multiply'}>
      <Shader source={source} uniforms={uniforms} />
    </Fill>
  );
};
