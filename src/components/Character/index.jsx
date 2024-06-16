import Matter from "matter-js";
import { View, StyleSheet } from "react-native";
import { COLLISION_CATEGORIES } from "../../constants/collisionCategories";
import { Rect } from "@shopify/react-native-skia";

const CharacterRenderer = ({ body, size, isKilled }) => {
  const { width, height } = size;
  const {
    position: { x, y },
    angle,
  } = body;
  const left = x - size.width / 2;
  const top = y - size.height / 2;
  return (
    <Rect
      x={left}
      y={top}
      width={width}
      height={height}
      transform={[{ rotate: angle }]}
      color={
        isKilled ? styles.killed.backgroundColor : styles.root.backgroundColor
      }
    />
  );
};

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    backgroundColor: "yellow",
  },
  killed: {
    backgroundColor: "black",
  },
});

export default function ({ world, position, width, height }) {
  let body = Matter.Bodies.rectangle(position.x, position.y, width, height, {
    // collisionFilter: {
    //   category:
    //     COLLISION_CATEGORIES.defaultCategory | COLLISION_CATEGORIES.ships,
    // },
    // mass: 0.1,
    label: "character",
    // density: 0.05,
    density: 0.5,
    mass: 1,
    frictionAir: 1,
    // friction: 0.5,
    // collisionFilter: {
    //   category: COLLISION_CATEGORIES.character,
    //   mask: COLLISION_CATEGORIES.platform,
    // },
  });

  Matter.World.add(world, [body]);

  return {
    body,
    isKilled: false,
    size: { width, height },
    renderer: <CharacterRenderer />,
  };
}
