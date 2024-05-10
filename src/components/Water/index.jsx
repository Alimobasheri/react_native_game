import { View, Dimensions, Text } from "react-native";
import { COLLISION_CATEGORIES } from "../../constants/collisionCategories";
import Matter from "matter-js";
import { RoundedRect, Group } from "@shopify/react-native-skia";
const { width, height } = Dimensions.get("window");
const windowWidth = width;
const windowHeight = height / 4;
const WaterRenderer = ({ waterBodies, size, waterConstraints }) => {
  // console.log("🚀 ~ WaterRenderer ~ size:", size);
  // console.log("🚀 ~ WaterRenderer ~ waterConstraints:", waterConstraints);
  // console.log("🚀 ~ WaterRenderer ~ waterBodies:", waterBodies);
  // waterBodies.map((b) => console.log(Object.keys(b)));
  return waterBodies.map((body, idx) => (
    <Group key={idx} transform={[{ rotate: body.angle }]}>
      <RoundedRect
        key={idx}
        x={body.position.x}
        y={body.position.y}
        // transform={[{ rotate: `${body.angle}rad` }]}
        // strokeCap={true}
        width={size.width}
        height={size.height}
        color={"blue"}
        r={5}
      />
    </Group>
  ));
};

export default function (
  world,
  platformLeft,
  platformRight,
  minimumY,
  bottomPlatforms
) {
  let Body = Matter.Body,
    Composites = Matter.Composites,
    Common = Matter.Common,
    Constraint = Matter.Constraint,
    Composite = Matter.Composite,
    Bodies = Matter.Bodies;

  const numberOfYRows = 1;
  const numberOfXRows = Math.floor(windowWidth / 35);

  const bodyWidth = windowWidth / numberOfXRows + 10;
  const bodyHeight = bodyWidth / 3;

  const stiffness = 1;

  const platStiffness = 0.9;
  const bodiesStiffness = 0.8;

  const length = 0;
  const damping = 0.1;

  const waterBodies = [];
  for (let y = 0; y < numberOfYRows; y++) {
    for (let x = 0; x < numberOfXRows; x++) {
      const posX = bodyWidth * x + bodyWidth / 2;
      const posY = minimumY + bodyWidth / 2 - (bodyWidth / 2) * y;
      let body = Bodies.rectangle(posX, posY, bodyWidth, bodyWidth / 2, {
        // collisionFilter: {
        //   category:
        //     COLLISION_CATEGORIES.defaultCategory || COLLISION_CATEGORIES.water,
        // },
        label: "waterBody",
        isStatic: false,
        // chamfer: 5,
        // density: 0.005,
        // frictionAir: 0.1,
        // friction: 0.05,
        // frictionStatic: 0.01,
        // frictionAir: 0.1,
        inertia: Infinity,
        chamfer: 5,
        // restitution: ,
      });
      // let vertices = [
      //   { x: posX - bodyWidth / 2, y: posY - bodyHeight / 2 },
      //   { x: posX + bodyWidth / 2, y: posY - bodyHeight / 2 },
      //   { x: posX - bodyWidth / 2, y: posY + bodyHeight / 2 },
      //   { x: posX + bodyWidth / 2, y: posY + bodyHeight / 2 },
      // ];

      // Matter.Vertices.rotate(vertices, body.angle, body.position);
      waterBodies.push(body);
    }
  }

  const waterConstraints = [];

  for (let y = 0; y < numberOfYRows; y++) {
    for (let x = 0; x < numberOfXRows; x++) {
      const posX = bodyWidth * x + bodyWidth / 2;
      const posY = minimumY + bodyWidth / 2 - (bodyWidth / 2) * y;
      if (x > 0) {
        let constraint = Constraint.create({
          bodyA: waterBodies[y * numberOfXRows + x - 1],
          bodyB: waterBodies[y * numberOfXRows + x],
          pointA: { x: bodyWidth / 2 - bodyWidth / 8, y: 0 },
          pointB: { x: -bodyWidth / 2 + bodyWidth / 8, y: 0 },
          length: 0.001,
          stiffness: 0.99,
          // damping: 0.1,
        });
        waterConstraints.push(constraint);
      }
      if (x === 0) {
        let constraint = Constraint.create({
          pointA: {
            x: 0 - bodyWidth / 2 - bodyWidth / 8,
            y: posY,
          },
          bodyB: waterBodies[y * numberOfXRows + x],
          // bodyB: platformRight.body,
          pointB: {
            y: bodyWidth / 2,
            x: bodyWidth / 2,
          },
          length: 0.001,
          stiffness: platStiffness,
          // damping,
        });
        waterConstraints.push(constraint);
      }
      if (x === numberOfXRows - 1) {
        console.log("🚀 ~ posY:", posY);
        let constraint = Constraint.create({
          pointA: {
            x: windowWidth + bodyWidth / 2 + bodyWidth / 8,
            y: posY,
          },
          bodyB: waterBodies[y * numberOfXRows + x],
          // bodyB: platformRight.body,
          pointB: {
            y: bodyWidth / 2,
            x: bodyWidth / 2,
          },
          length: bodyWidth / 2,
          stiffness: platStiffness,
          // damping,
        });
        waterConstraints.push(constraint);
      }
      if (y > 0) {
        let constraint = Constraint.create({
          bodyA: waterBodies[(y - 1) * numberOfXRows + x],
          bodyB: waterBodies[y * numberOfXRows + x],
          // length: 0.001,
          stiffness: 0.99,
        });
        waterConstraints.push(constraint);
      }
      // if (y == 0) {
      //   console.log("🚀 ~ x:", x);
      //   let platformWidth = windowWidth / bottomPlatforms.length;
      //   console.log("🚀 ~ windowWidth:", windowWidth, bottomPlatforms.length);
      //   console.log("🚀 ~ platformWidth:", platformWidth);
      //   let targetPlatformIndex = Math.floor(posX / platformWidth);
      //   console.log("🚀 ~ targetPlatformIndex:", targetPlatformIndex);
      //   const targetPlatform = bottomPlatforms[targetPlatformIndex];
      //   if (!!targetPlatform) {
      //     let constraint = Constraint.create({
      //       bodyA: waterBodies[y * numberOfXRows + x],
      //       bodyB: targetPlatform.body,
      //       pointA: {
      //         y: 0,
      //         x: 0,
      //       },
      //       pointB: {
      //         x: posX - platformWidth * targetPlatformIndex,
      //         y: -targetPlatform.size.height / 2,
      //       },
      //       length: bodyWidth / 2,
      //       stiffness: 0.5,
      //       damping: 0.01,
      //     });
      //     waterConstraints.push(constraint);
      //   }
      // }
    }
  }
  Composite.add(world, [...waterBodies, ...waterConstraints]);

  return {
    waterBodies,
    waterConstraints,
    originalPositions: {
      lastBody: waterBodies[waterBodies.length - 1].position,
    },
    size: { width: bodyWidth, height: bodyWidth / 2 },
    renderer: <WaterRenderer />,
  };
}
