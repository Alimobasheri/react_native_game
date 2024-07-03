import { Sea } from "@/Game/Entities/Sea/Sea";
import { ISea, SurfacePointMap } from "@/Game/Entities/Sea/types";
import { EntityRendererProps } from "@/constants/views";
import { Path } from "@shopify/react-native-skia";
import { Skia, vec, LinearGradient } from "@shopify/react-native-skia";
import { FC } from "react";

export const SeaView: FC<EntityRendererProps<ISea>> = ({ entity }) => {
  const { waterSurfacePoints, height, width, startingX, startingY } = entity;

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

  return (
    <>
      <Path path={combinedWavePath} color="rgba(0, 0, 0, 0.5)" style={"fill"}>
        <LinearGradient
          start={vec(startingX, startingY)}
          end={vec(startingX, endingY)}
          colors={["#0000ff", "#001a99", "#003366", "#004d66"]}
        />
      </Path>
    </>
  );
};
