import { Group, Rect } from "@shopify/react-native-skia";

// Renderer for entities
export const EntityRenderer = ({ body, size, isSea, isBoat }) => {
  const { position } = body;

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
