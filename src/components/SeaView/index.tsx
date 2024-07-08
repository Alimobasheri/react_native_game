import { Sea } from "@/Game/Entities/Sea/Sea";
import { ISea, SurfacePointMap } from "@/Game/Entities/Sea/types";
import { EntityRendererProps } from "@/constants/views";
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
  const endingY = startingY + height;
  const combinedWavePath = Skia.Path.Make();
  combinedWavePath.moveTo(startingX, startingY); // Start the path at the left edge of the screen

  for (const [x, point] of waterSurfacePoints) {
    combinedWavePath.lineTo(point.x, point.y);
  }

  // Draw rectangle under water
  combinedWavePath.lineTo(endingX, endingY);
  combinedWavePath.lineTo(startingX, endingY);
  combinedWavePath.lineTo(startingX, startingY);

  const paint = Skia.Paint();

  const seaGradient = Skia.Shader.MakeLinearGradient(
    vec(0, height * 0.75),
    vec(0, height),
    [Skia.Color("#b3e0ff"), Skia.Color("#66b2ff"), Skia.Color("#1a8cff")], // Light blue to darker blue
    [0, 1],
    TileMode.Clamp
  );
  paint.setShader(seaGradient);

  return (
    <Group>
      <Path path={combinedWavePath} style={"fill"} paint={paint}></Path>
    </Group>
  );
};
