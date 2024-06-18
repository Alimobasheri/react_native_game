import { useEffect, useState } from "react";
import {
  Group,
  Rect,
  Skia,
  Image,
  useImage,
  Shadow,
  Paint,
} from "@shopify/react-native-skia";

export const BoatRenderer = ({ body, size }) => {
  const { position } = body;
  const boatImage = useImage(require("../../../assets/speedboat-png.png"));
  // console.log("🚀 ~ BoatRenderer ~ position:", position.y, position.x);
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
export const EntityRenderer = ({ body, size, isSea, isBoat, isShip }) => {
  const { position } = body;
  if (isBoat) {
    return <BoatRenderer {...{ body, size }} />;
  }
  if (isShip) {
    return <ShipRenderer {...{ body, size }} />;
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
