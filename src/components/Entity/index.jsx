import { useEffect, useState } from "react";
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

export const BoatRenderer = ({ body, size, direction, trail }) => {
  const { position } = body;
  const boatImage = useImage(require("../../../assets/speedboat-png.png"));
  // console.log("🚀 ~ BoatRenderer ~ position:", position.y, position.x);
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
        origin={{ x: position.x + size[0] / 2, y: position.y + size[1] / 2 }}
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

export const ShipRenderer = ({ body, size }) => {
  const { position } = body;
  // console.log("🚀 ~ BoatRenderer ~ position:", position.y, position.x);
  const boatImage = useImage(require("../../../assets/warship.png"));
  if (!boatImage) return null;
  return (
    <Group
      origin={{ x: position.x - size[0] / 2, y: position.y - size[1] / 2 }}
      transform={[{ rotate: body.angle }]}
    >
      <Image
        image={boatImage}
        x={position.x - size[0] / 2}
        y={position.y - size[1] / 2}
        width={size[0]}
        height={size[1]}
      />
      {/* <Shadow
        dx={size[0] / 4}
        dy={size[1] / 4}
        blur={10}
        color="rgba(0, 0, 0, 0.5)"
        x={position.x - size[0] / 2}
        y={position.y - size[1] / 2}
      /> */}
    </Group>
  );
};

// Renderer for entities
export const EntityRenderer = ({
  body,
  size,
  isSea,
  isBoat,
  isShip,
  ...rest
}) => {
  const { position } = body;
  if (isBoat) {
    return <BoatRenderer {...{ body, size, ...rest }} />;
  }
  if (isShip) {
    return <ShipRenderer {...{ body, size, ...rest }} />;
  }
  // console.log("🚀 ~ EntityRenderer ~ position:", position.y);
  return (
    // <Canvas style={{ position: "absolute", top: 0, left: 0 }}>
    <Group
      origin={{ x: position.x - size[0] / 2, y: position.y - size[1] / 2 }}
      transform={[{ rotate: body.angle }]}
    >
      <Rect
        color="white"
        x={position.x - size[0] / 2}
        y={position.y - size[1] / 2}
        width={size[0]}
        height={size[1]}
        style={isSea ? "stroke" : undefined}
        strokeWidth={isSea ? 2 : undefined}
      />
    </Group>
    // </Canvas>
  );
};
