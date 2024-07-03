import { FC, useEffect, useState } from "react";
import {
  Group,
  Rect,
  Skia,
  Image,
  useImage,
  Shadow,
  Paint,
  Circle,
  vec,
  Path,
  LinearGradient,
} from "@shopify/react-native-skia";
import { TRAIL_FADE_DURATION } from "../../constants/configs";
import { EntityRendererProps } from "@/constants/views";
import { Boat } from "@/Game/Entities/Boat/Boat";

export const BoatView: FC<EntityRendererProps<Boat>> = ({
  entity: { body, size, direction, trail },
}) => {
  if (!body) return;
  const { position } = body;
  const boatImage = useImage(require("../../../assets/speedboat-png.png"));
  if (!boatImage) return null;
  // Create a smooth path for the trail with fading effect
  const now = Date.now();
  return (
    <Group>
      {/* Render the trail */}
      {trail.map((trailPoint, index) => {
        if (index === 0 || !trailPoint.render) return null;
        const prevPoint = trail
          .slice(0, index)
          .reverse()
          .find((p) => p.render);
        if (!prevPoint) return null;
        const age = now - trailPoint.timestamp;
        const opacity = Math.max(0.7 - age / TRAIL_FADE_DURATION, 0);
        const width =
          2 + (trailPoint.velocityX / 10) * (age / TRAIL_FADE_DURATION) * 20; // Increase width over time

        // Calculate the part of the trail under the water surface
        const waterSurfaceYPrev = prevPoint.y;
        const waterSurfaceYCurr = trailPoint.y;

        const underWaterYStart = Math.max(prevPoint.y, waterSurfaceYPrev);
        const underWaterYEnd = Math.max(trailPoint.y, waterSurfaceYCurr);

        // Adjust y-coordinates for the lower half of the path
        const adjustedUnderWaterYStart = underWaterYStart + width / 2;
        const adjustedUnderWaterYEnd = underWaterYEnd + width / 2;

        // Create the path for the underwater part of the trail using a quadratic Bezier curve
        const path = Skia.Path.Make();
        const midX = (prevPoint.x + trailPoint.x) / 2;
        const midY = (adjustedUnderWaterYStart + adjustedUnderWaterYEnd) / 2;
        path.moveTo(prevPoint.x, adjustedUnderWaterYStart);
        path.quadTo(midX, midY, trailPoint.x, adjustedUnderWaterYEnd);

        return (
          <Path
            key={index}
            path={path}
            color={`rgba(255, 255, 255, ${opacity})`}
            strokeWidth={width}
            style={"stroke"}
            // style={"fill"}
          ></Path>
        );
      })}
      <Group
        origin={{ x: position.x, y: position.y }}
        transform={[{ rotate: body.angle }]}
      >
        <Image
          image={boatImage}
          x={position.x - size[0] / 2}
          y={position.y - size[1] / 2}
          width={size[0]}
          height={size[1]}
        />
      </Group>
    </Group>
  );
};
