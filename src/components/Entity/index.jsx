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
} from "@shopify/react-native-skia";
import { TRAIL_FADE_DURATION } from "../../constants/configs";

export const BoatRenderer = ({ body, size, direction, trail }) => {
  const { position } = body;
  const boatImage = useImage(require("../../../assets/speedboat-png.png"));
  // console.log("🚀 ~ BoatRenderer ~ position:", position.y, position.x);
  if (!boatImage) return null;
  // Create a smooth path for the trail with fading effect
  const now = Date.now();

  // // Create a path for the trail
  // const path = Skia.Path.Make();
  // if (trail && trail.length > 0) {
  //   path.moveTo(trail[0].x, trail[0].y);
  //   for (let i = 1; i < trail.length; i++) {
  //     path.lineTo(trail[i].x, trail[i].y);
  //   }
  // }

  // // Create a paint object
  // const paint = Skia.Paint();
  // paint.setStyle("stroke");
  // paint.setStrokeWidth(2);
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
          />
        );
      })}
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
          // transform={
          //   direction === -1 ? [{ translateX: size[0] }, { scaleX: -1 }] : []
          // }
        />
        {/* <Shadow
        dx={size[0] / 4}
        dy={size[1] / 2}
        blur={10}
        color="rgba(0, 0, 0, 0.5)"
        x={position.x - size[0] / 2}
        y={position.y - size[1] / 2}
      /> */}
        {/* Reflection Image */}
        {/* <Group transform={[{ scaleY: -1 }]}>
        <Image
          image={boatImage}
          x={position.x - size[0] / 2}
          y={position.y + size[1]}
          width={size[0]}
          height={size[1]}
          opacity={0.4}
          transform={[{ scaleY: -1 }]}
        />
      </Group> */}
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
