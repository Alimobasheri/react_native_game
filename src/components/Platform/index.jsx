import { View } from "react-native";
import { COLLISION_CATEGORIES } from "../../constants/collisionCategories";
import Matter from "matter-js";
import { Rect } from "@shopify/react-native-skia";

const PlatformRenderer = ({ body, size, options }) => {
  return (
    <Rect
      x={body.position.x}
      y={body.position.y}
      width={size.width}
      height={size.height}
      color={options?.color || "lightblue"}
      transform={[{ rotate: body.angle }]}
    />
  );
};

export default function (
  world,
  position,
  angle,
  width,
  height = 200,
  options = {}
) {
  let body = Matter.Bodies.rectangle(position.x, position.y, width, height, {
    isStatic: options.notStatic ? false : true,
    angle,
    // friction: 0.5,
    // collisionFilter: {
    //   category: COLLISION_CATEGORIES.platform,
    // },
  });

  let vertices = [
    { x: position.x - width / 2, y: position.y - height / 2 },
    { x: position.x + width / 2, y: position.y - height / 2 },
    { x: position.x - width / 2, y: position.y + height / 2 },
    { x: position.x + width / 2, y: position.y + height / 2 },
  ];

  Matter.Vertices.rotate(vertices, body.angle, body.position);

  Matter.World.add(world, [body]);

  return {
    platform: { vertices },
    body,
    options,
    size: { width, height },
    renderer: <PlatformRenderer />,
  };
}
