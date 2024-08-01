import { Sea } from "@/Game/Entities/Sea/Sea";
import { ISea, SurfacePointMap } from "@/Game/Entities/Sea/types";
import { EntityRendererProps } from "@/constants/views";
import { WATER_GRADIENT_COLORS } from "@/constants/waterConfigs";
import { useEntityInstance } from "@/containers/ReactNativeSkiaGameEngine";
import { useEntityMemoizedValue } from "@/containers/ReactNativeSkiaGameEngine/hooks/useEntityMemoizedValue";
import { useFrameEffect } from "@/containers/ReactNativeSkiaGameEngine/hooks/useFrameEffect";
import { useReRenderCount } from "@/hooks/useReRenderCount";
import {
  CornerPathEffect,
  DiscretePathEffect,
  Group,
  Paint,
  Path,
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
export const SeaView: FC<ISeaViewProps> = (props) => {
  const { entity: seaEntityInstance, found } = useEntityInstance<Sea>(
    props.entityId
  );
  const { height, width, startingX, startingY, layers, gradientColors } =
    useEntityMemoizedValue<Sea, any>(props.entityId, "layers", {
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

  useFrameEffect(
    () => {
      if (!found.current) return;
      const createWavePath = () => {
        const combinedWavePath = Skia.Path.Make();
        if (
          !seaEntityInstance.current?.data.layers[props.layerIndex]
            .getWaterSurfaceAndMaxHeightAtPoint
        )
          return combinedWavePath;

        const endingX = startingX + width;
        const endingY = startingY + height * 3;
        combinedWavePath.moveTo(startingX, startingY); // Start the path at the left edge of the screen
        const whiteCaps = [];

        let lastpy = startingY;
        for (let x = startingX; x < endingX; x++) {
          let pointY =
            seaEntityInstance.current.data.layers[
              props.layerIndex
            ].getWaterSurfaceAndMaxHeightAtPoint(x).y;
          if (lastpy === pointY) {
            if (x < endingX - 1) continue;
          }
          combinedWavePath.lineTo(x, pointY);
          lastpy = pointY;

          // // Check if this point is above the threshold for a white cap
          // if (point.y < originalWaterSurfaceY - WHITE_CAP_THRESHOLD) {
          //   // Calculate the opacity based on the height
          //   const heightAboveThreshold = originalWaterSurfaceY - point.y;
          //   const maxOpacity = 0.8;
          //   const minOpacity = 0.5;
          //   const opacity =
          //     minOpacity +
          //     ((heightAboveThreshold - WHITE_CAP_THRESHOLD) / WHITE_CAP_THRESHOLD) *
          //       (maxOpacity - minOpacity);
          //   const clampedOpacity = Math.min(
          //     Math.max(opacity, minOpacity),
          //     maxOpacity
          //   );

          //   whiteCaps.push({ x: point.x, y: point.y, opacity: clampedOpacity });
          // }
        }
        // Draw rectangle under water
        combinedWavePath.lineTo(endingX, endingY);
        combinedWavePath.lineTo(startingX, endingY);
        combinedWavePath.lineTo(startingX, startingY);
        return combinedWavePath;
      };
      wavePath.value = createWavePath();
    },
    [
      startingX,
      startingY,
      width,
      height,
      props.layerIndex,
      seaEntityInstance.current?.data.layers[props.layerIndex]
        .getWaterSurfaceAndMaxHeightAtPoint,
    ],
    0
  );

  return (
    <Group>
      <Path path={wavePath} style={"fill"} color={"black"}>
        {/* <DiscretePathEffect deviation={1} length={5} /> */}
        {linearGradientMemo}
      </Path>
      {/* {whiteCaps.map((cap, index) => (
        <Path key={index} path={Skia.Path.Make().addCircle(cap.x, cap.y, 2)}>
          <Paint color={Skia.Color(`rgba(255, 255, 255, ${cap.opacity})`)} />
        </Path>
      ))} */}
    </Group>
  );
};
