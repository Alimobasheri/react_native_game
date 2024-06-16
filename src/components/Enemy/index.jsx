import Matter from "matter-js";
import { View, StyleSheet } from "react-native";
import { COLLISION_CATEGORIES } from "../../constants/collisionCategories";
import { Rect } from "@shopify/react-native-skia";

const EnemyRenderer = ({ body, size, killed }) => {
  const { width, height } = size;
  const {
    position: { x, y },
    angle,
  } = body;
  const left = x - size.width / 2;
  const top = y;
  return (
    <Rect
      x={left}
      y={top}
      width={width}
      height={height}
      transform={[{ rotate: angle }]}
      color={
        killed ? styles.killed.backgroundColor : styles.root.backgroundColor
      }
    />
  );
};

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    backgroundColor: "red",
  },
  killed: {
    backgroundColor: "gray",
  },
});

export default function ({
  world,
  position,
  width,
  height,
  wave = 0,
  killed = false,
  isDisplayed = false,
  absXVelocity = 0,
  damageStrength = 0,
  health = 100,
}) {
  let body = Matter.Bodies.rectangle(position.x, position.y, width, height, {
    // collisionFilter: {
    //   category:
    //     COLLISION_CATEGORIES.defaultCategory | COLLISION_CATEGORIES.ships,
    // },
    label: "enemy",
    isStatic: true,
    frictionAir: 0.3,
    density: 0.0001,
    friction: 0.5,
    // collisionFilter: {
    //   category: COLLISION_CATEGORIES.character,
    //   mask: COLLISION_CATEGORIES.platform,
    // },
  });

  Matter.World.add(world, [body]);

  return {
    body,
    size: { width, height },
    wave,
    killed,
    isDisplayed,
    absXVelocity,
    damageStrength,
    health,
    renderer: <EnemyRenderer />,
  };
}
