import { Sea } from "@/Game/Entities/Sea/Sea";
import { ISea, SurfacePointMap } from "@/Game/Entities/Sea/types";
import { EntityRendererProps } from "@/constants/views";
import { WATER_GRADIENT_COLORS } from "@/constants/waterConfigs";
import { Group, Paint, Path, TileMode } from "@shopify/react-native-skia";
import { Skia, vec, LinearGradient } from "@shopify/react-native-skia";
import { FC, useCallback, useEffect, useLayoutEffect } from "react";
import { useWindowDimensions } from "react-native";
import {
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
const WHITE_CAP_THRESHOLD = 50;
const isInRange = (x, x1, x2) => x >= x1 && x <= x2;
export const SeaView: FC<EntityRendererProps<Sea>> = (props) => {
  const { height, width, startingX, startingY, layers, gradientColors } =
    props.entity;
  if (layers && layers.length > 1) {
    return layers.map((layer, index) => (
      <SeaView
        key={index.toString()}
        entity={layer}
        layout={props.layout}
        screen={props.screen}
      />
    ));
  }

  // useLayoutEffect(() => {
  //   animatedProps();
  // }, []);
  const wavePath = useSharedValue(Skia.Path.Make());

  useEffect(() => {
    const createWavePath = () => {
      const combinedWavePath = Skia.Path.Make();

      const endingX = startingX + width;
      const endingY = startingY + height * 2;
      combinedWavePath.moveTo(startingX, startingY); // Start the path at the left edge of the screen
      const whiteCaps = [];

      let lastpy = startingY;
      for (let x = startingX; x < endingX; x++) {
        let pointY = props.entity.getWaterSurfaceAndMaxHeightAtPoint(x).y;
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
  });

  return (
    <Group>
      <Path path={wavePath} style={"fill"}>
        <LinearGradient
          colors={props.entity.gradientColors || []}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 1 }}
        />
      </Path>
      {/* {whiteCaps.map((cap, index) => (
        <Path key={index} path={Skia.Path.Make().addCircle(cap.x, cap.y, 2)}>
          <Paint color={Skia.Color(`rgba(255, 255, 255, ${cap.opacity})`)} />
        </Path>
      ))} */}
    </Group>
  );
};
