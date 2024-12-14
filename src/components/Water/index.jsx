import { View, Dimensions, Text } from 'react-native';
import { COLLISION_CATEGORIES } from '../../constants/collisionCategories';
import Matter from 'matter-js';
import { RoundedRect, Group } from '@shopify/react-native-skia';
const { width, height } = Dimensions.get('window');
const windowWidth = width;
const windowHeight = height;
const WaterRendererCanvas = ({
  waterBodies,
  waterContainer,
  waterContainerSize,
  size,
  waterConstraints,
}) => {
  const position = waterContainer.position;
  const waterLevel = windowHeight - waterContainerSize.height / 2;
  return (
    <Group>
      <RoundedRect
        key={'water_container'}
        x={windowWidth / 2 - waterContainerSize.width / 2}
        y={position.y - waterContainerSize.height / 2}
        width={waterContainerSize.width}
        height={waterContainerSize.height}
        color={'blue'}
        r={5}
      />
      {waterBodies.map((body, idx) => {
        return (
          <Group key={idx} transform={[{ rotate: body.angle }]}>
            <RoundedRect
              key={idx}
              x={body.position.x - size.width / 2}
              y={body.position.y - size.height / 2}
              // transform={[{ rotate: `${body.angle}rad` }]}
              // strokeCap={true}
              width={size.width}
              height={size.height}
              color={'blue'}
              r={5}
            />
          </Group>
        );
      })}
    </Group>
  );
  return waterBodies.map((body, idx) => {
    return (
      <Group key={idx} transform={[{ rotate: body.angle }]}>
        <RoundedRect
          key={idx}
          x={body.position.x - size.width / 2}
          y={body.position.y - size.height / 2}
          // transform={[{ rotate: `${body.angle}rad` }]}
          // strokeCap={true}
          width={size.width}
          height={size.height}
          color={'blue'}
          r={5}
        />
      </Group>
    );
  });
};

const WaterRenderer = ({ waterBodies, size, waterConstraints }) => {
  // console.log("🚀 ~ WaterRenderer ~ size:", size);
  // console.log("🚀 ~ WaterRenderer ~ waterConstraints:", waterConstraints);
  // console.log("🚀 ~ WaterRenderer ~ waterBodies:", waterBodies);
  // waterBodies.map((b) => console.log(Object.keys(b)));
  return waterBodies.map((body, idx) => {
    return (
      <View
        key={idx}
        style={{
          position: 'absolute',
          left: body.position.x - size.width / 2,
          top: body.position.y,
          transform: [{ rotate: `${body.angle}rad` }],
          width: size.width,
          height: size.height,
          backgroundColor: 'blue',
        }}
      />
    );
  });
};

export default function (
  world,
  platformLeft,
  platformRight,
  minimumY,
  bottomPlatforms,
  isUsingCanvas = false
) {
  // console.log("🚀 ~ minimumY:", minimumY);
  let Body = Matter.Body,
    Composites = Matter.Composites,
    Common = Matter.Common,
    Constraint = Matter.Constraint,
    Composite = Matter.Composite,
    Bodies = Matter.Bodies;

  const numberOfYRows = 1;
  const numberOfXRows = Math.floor(windowWidth / 40);

  const bodyWidth = windowWidth / numberOfXRows + 10;
  const bodyHeight = bodyWidth / 4;

  const stiffness = 1;

  const platStiffness = 0.9;
  const bodiesStiffness = 0.8;

  const length = 0;
  const damping = 0.1;

  const waterContainerSize = {
    width: windowWidth,
    height: windowHeight / 2,
  };
  // console.log("🚀 ~ waterContainerSize:", waterContainerSize);

  const waterContainer = Bodies.rectangle(
    windowWidth / 2,
    windowHeight,
    waterContainerSize.width,
    waterContainerSize.height,
    { density: 0.8, inertia: Infinity, isSensor: true, isStatic: true }
  );

  const waterBodies = [];
  for (let y = 0; y < numberOfYRows; y++) {
    for (let x = 0; x < numberOfXRows; x++) {
      const posX = bodyWidth * x + bodyWidth / 2;
      const posY = minimumY + bodyWidth - (bodyWidth / 2) * y;
      // console.log("🚀 ~ posY:", posY);
      let body = Bodies.rectangle(posX, posY, bodyWidth, bodyHeight, {
        // collisionFilter: {
        //   category:
        //     COLLISION_CATEGORIES.defaultCategory || COLLISION_CATEGORIES.water,
        // },
        label: 'waterBody',
        isStatic: false,
        // chamfer: 5,
        density: 0.2,
        frictionAir: 0.5,
        // friction: 0.5,
        // frictionStatic: 0.01,
        // frictionAir: 0.1,
        inertia: Infinity,
        chamfer: 5,

        // restitution: 0.5,
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
      const posY = minimumY + bodyWidth - (bodyWidth / 2) * y;
      if (x > 0) {
        let constraint = Constraint.create({
          bodyA: waterBodies[y * numberOfXRows + x - 1],
          bodyB: waterBodies[y * numberOfXRows + x],
          pointA: { x: bodyWidth / 2 - bodyWidth / 8, y: 0 },
          pointB: { x: -bodyWidth / 2 + bodyWidth / 8, y: 0 },
          length: bodyWidth / 64,
          stiffness: 0.3,
          damping: 0.02,
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
        // console.log("🚀 ~ posY:", posY);
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
      // if (y > 0) {
      //   let constraint = Constraint.create({
      //     bodyA: waterBodies[(y - 1) * numberOfXRows + x],
      //     bodyB: waterBodies[y * numberOfXRows + x],
      //     // length: 0.001,
      //     stiffness: 0.99,
      //   });
      //   waterConstraints.push(constraint);
      // }
      // if (y == 0) {
      //   // console.log("🚀 ~ x:", x);
      //   let platformWidth = windowWidth / bottomPlatforms.length;
      //   // console.log("🚀 ~ windowWidth:", windowWidth, bottomPlatforms.length);
      //   // console.log("🚀 ~ platformWidth:", platformWidth);
      //   let targetPlatformIndex = Math.floor(posX / platformWidth);
      //   // console.log("🚀 ~ targetPlatformIndex:", targetPlatformIndex);
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
      //         x: 0,
      //         y: targetPlatform.size.height / 2,
      //       },
      //       length: bodyWidth / 2,
      //       stiffness: 0.99,
      //       damping: 0.01,
      //     });
      //     waterConstraints.push(constraint);
      //   }
      // }
    }
  }
  Composite.add(world, [...waterBodies, ...waterConstraints]);
  Matter.World.add(world, [waterContainer]);
  return {
    waterBodies,
    waterConstraints,
    waterContainer,
    waterContainerSize,
    originalPositions: {
      lastBody: waterBodies[waterBodies.length - 1]?.position,
    },
    size: { width: bodyWidth, height: bodyHeight },
    renderer: isUsingCanvas ? <WaterRendererCanvas /> : <WaterRenderer />,
  };
}
