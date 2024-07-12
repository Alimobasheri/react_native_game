import { Sea } from "@/Game/Entities/Sea/Sea";
import { ISea, SurfacePointMap } from "@/Game/Entities/Sea/types";
import { EntityRendererProps } from "@/constants/views";
import { WATER_GRADIENT_COLORS } from "@/constants/waterConfigs";
import { Group, Path, TileMode } from "@shopify/react-native-skia";
import { Skia, vec, LinearGradient } from "@shopify/react-native-skia";
import { FC } from "react";
import { useWindowDimensions } from "react-native";

export const SeaView: FC<EntityRendererProps<Sea>> = (props) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { entity } = props;
  const {
    waterSurfacePoints,
    height,
    width,
    startingX,
    startingY,
    layers,
    gradientColors,
  } = entity;
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

  const endingX = startingX + width;
  const endingY = startingY + height * 2;
  const combinedWavePath = Skia.Path.Make();
  combinedWavePath.moveTo(startingX, startingY); // Start the path at the left edge of the screen

  for (const [x, point] of waterSurfacePoints) {
    combinedWavePath.lineTo(point.x, point.y);
  }

  // Draw rectangle under water
  combinedWavePath.lineTo(endingX, endingY);
  combinedWavePath.lineTo(startingX, endingY);
  combinedWavePath.lineTo(startingX, startingY);

  return (
    <Group>
      <Path path={combinedWavePath} style={"fill"}>
        <LinearGradient
          colors={entity.gradientColors || []}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 1 }}
        />
      </Path>
    </Group>
  );
};
