import { Sea } from "@/Game/Entities/Sea/Sea";
import { ISea, SurfacePointMap } from "@/Game/Entities/Sea/types";
import createWaveShader, {
  createLayerConfig,
  useWaveShaderUniforms,
} from "@/Shaders/WaveShader/waveShader";
import { ENTITIES_KEYS } from "@/constants/configs";
import { EntityRendererProps } from "@/constants/views";
import { WATER_GRADIENT_COLORS } from "@/constants/waterConfigs";
import {
  useCanvasDimensions,
  useEntityInstance,
} from "@/containers/ReactNativeSkiaGameEngine";
import { useEntityMemoizedValue } from "@/containers/ReactNativeSkiaGameEngine/hooks/useEntityMemoizedValue";
import { useFrameEffect } from "@/containers/ReactNativeSkiaGameEngine/hooks/useFrameEffect";
import { useReRenderCount } from "@/hooks/useReRenderCount";
import {
  CornerPathEffect,
  DiscretePathEffect,
  Fill,
  Group,
  Paint,
  Path,
  rect,
  Shader,
  SkPath,
  TileMode,
} from "@shopify/react-native-skia";
import { Skia, vec, LinearGradient } from "@shopify/react-native-skia";
import { FC, useCallback, useEffect, useLayoutEffect, useMemo } from "react";
import { useWindowDimensions } from "react-native";
import {
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
const WHITE_CAP_THRESHOLD = 50;
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
  const { height, width, startingX, startingY, layers, gradientColors } =
    useEntityMemoizedValue<Sea, any>(seaEntityInstance.current?.id, "layers", {
      processor: (layers: Sea["layers"] | undefined) => {
        const layer = layers?.[props.layerIndex];
        if (!layer) return {};
        if (layer) {
          return {
            height: layer.height,
            width: layer.width,
            startingX: layer.startingX,
            startingY: layer.startingY - 20,
            gradientColors: layer.gradientColors,
          };
        }
      },
    });
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

  const freq = 7.0;

  const uniforms = useWaveShaderUniforms(
    dimensions,
    time,
    height,
    (props.layerIndex * height) / dimensions.height,
    freq,
    0.05,
    0.4,
    freq,
    0.05 * (props.layerIndex === 0 ? 1 : props.layerIndex === 1 ? 0.8 : 0.5),
    0.2,
    freq,
    0.05,
    0.4,
    0.5,
    0.02,
    [28, 163, 236]
  );

  if (!source) {
    return null;
  }

  return (
    <Fill blendMode={"multiply"}>
      <Shader source={source} uniforms={uniforms} />
    </Fill>
  );
};
