import { Sea } from '@/Game/Entities/Sea/Sea';
import createWaveShader, {
  useWaveShaderUniforms,
} from '@/Shaders/WaveShader/waveShader';
import { ENTITIES_KEYS } from '@/constants/configs';
import {
  useCanvasDimensions,
  useEntityInstance,
  useEntityValue,
} from '@/containers/ReactNativeSkiaGameEngine';
import { useEntityMemoizedValue } from '@/containers/ReactNativeSkiaGameEngine/hooks/useEntityMemoizedValue';
import { useFrameEffect } from '@/containers/ReactNativeSkiaGameEngine/hooks/useFrameEffect';
import { Fill, Shader, SkPath } from '@shopify/react-native-skia';
import { Skia, LinearGradient } from '@shopify/react-native-skia';
import { FC, useMemo } from 'react';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';
export interface ISeaViewProps {
  entityId: string;
  layerIndex: number;
}
export const SeaViewShader: FC<ISeaViewProps> = (props) => {
  const dimensions = useCanvasDimensions();
  const time = useSharedValue(0);

  const { entity: seaEntityInstance, found } = useEntityInstance<Sea>({
    label: ENTITIES_KEYS.SEA,
  });
  const { height, gradientColors, amplitude, frequency, speed } =
    useEntityMemoizedValue<Sea, any>(seaEntityInstance.current?.id, 'layers', {
      processor: (layers: Sea['layers'] | undefined) => {
        const layer = layers?.[props.layerIndex];
        if (!layer) return {};
        if (layer) {
          return {
            height: layer.height,
            gradientColors: layer.gradientColors,
            amplitude: layer.waves[0].amplitude,
            frequency: layer.waves[0].frequency,
            speed: layer.waves[0].speed,
          };
        }
      },
    });

  const flowTime = useEntityValue<Sea, number>(
    seaEntityInstance.current?.id,
    'layers',
    {
      processor: (layers: Sea['layers'] | undefined) => {
        const layer = layers?.[props.layerIndex];
        if (!layer) return 1;
        if (layer) return layer.waves[0]?.time ?? 0;
      },
    }
  );

  const dynamicWaveX = useEntityValue<Sea, number>(
    seaEntityInstance.current?.id,
    'layers',
    {
      processor: (layers: Sea['layers'] | undefined) => {
        const layer = layers?.[props.layerIndex];
        if (!layer) return 1;
        if (layer) return layer.waves[1]?.x ?? 0;
      },
    }
  );

  const dynamicWaveAmplitude = useEntityValue<Sea, number>(
    seaEntityInstance.current?.id,
    'layers',
    {
      processor: (layers: Sea['layers'] | undefined) => {
        const layer = layers?.[props.layerIndex];
        if (!layer) return 1;
        if (layer) return layer.waves[1]?.amplitude ?? 0;
      },
    }
  );

  const dynamicWaveFrequency = useEntityValue<Sea, number>(
    seaEntityInstance.current?.id,
    'layers',
    {
      processor: (layers: Sea['layers'] | undefined) => {
        const layer = layers?.[props.layerIndex];
        if (!layer) return 1;
        if (layer) return layer.waves[1]?.frequency ?? 1;
      },
    }
  );

  const dynamicWaveSpeed = useEntityValue<Sea, number>(
    seaEntityInstance.current?.id,
    'layers',
    {
      processor: (layers: Sea['layers'] | undefined) => {
        const layer = layers?.[props.layerIndex];
        if (!layer) return 1;
        if (layer) return layer.waves[1]?.speed ?? 1;
      },
    }
  );

  const dynamicWaveTime = useEntityValue<Sea, number>(
    seaEntityInstance.current?.id,
    'layers',
    {
      processor: (layers: Sea['layers'] | undefined) => {
        const layer = layers?.[props.layerIndex];
        if (!layer) return 1;
        if (layer) return layer.waves[1]?.time ?? 1;
      },
    }
  );

  const dynamicWaveUniformValue = useDerivedValue(() => {
    return [
      dynamicWaveAmplitude.value,
      dynamicWaveFrequency.value,
      dynamicWaveSpeed.value,
      dynamicWaveTime.value,
    ];
  }, [
    dynamicWaveAmplitude,
    dynamicWaveFrequency,
    dynamicWaveSpeed,
    dynamicWaveTime,
  ]);

  const wavePath = useSharedValue<SkPath>(Skia.Path.Make());

  const linearGradientMemo = useMemo(() => {
    if (!gradientColors) return null;
    return (
      <LinearGradient
        colors={gradientColors || []}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 1 }}
      />
    );
  }, [gradientColors]);

  useFrameEffect((delta) => {
    time.value = time.value + delta / 100;
  }, []);

  const source = useMemo(() => createWaveShader()!, []);

  const uniforms = useWaveShaderUniforms(
    dimensions,
    flowTime,
    height,
    (props.layerIndex * height) / dimensions.height,
    frequency,
    speed,
    amplitude,
    dynamicWaveX,
    dynamicWaveUniformValue,
    0.5,
    0.0,
    [28, 163, 236]
  );

  if (!source) {
    return null;
  }

  return (
    <Fill blendMode={'multiply'}>
      <Shader source={source} uniforms={uniforms} />
    </Fill>
  );
};
