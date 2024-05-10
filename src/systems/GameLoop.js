import Matter from "matter-js";

let count = 0;
let rightCount = 0;
let leftCount = 0;
let countInterval = 0;

const updatePhysicsEngine = (entities, time) => {
  const engine = entities?.physics?.engine;
  const config = entities.physics.config;
  // if (count < 100) {
  //   count++;
  //   return;
  // }
  if (!engine) return;
  const { platformLeft, platformRight } = entities;

  const platformLeftBody = platformLeft.body;
  const platformRightBody = platformRight.body;

  const bottomPlatformsKeys = Object.keys(entities).filter((key) =>
    key.startsWith("platform_bottom")
  );
  const bottomPlatforms = bottomPlatformsKeys.map((key) => entities[key]);
  const platformBottomsBodies = bottomPlatforms.map(
    (platform) => platform.body
  );

  platformBottomsBodies.forEach((b) => {
    if (b.position.y > config.correctBottomPlatforrmsY) {
      Matter.Body.setPosition(b, {
        x: b.position.x,
        y: config.correctBottomPlatforrmsY,
      });
    }
    if (b.angle !== 0) {
      Matter.Body.setAngle(b, 0);
    }
  });

  // console.log(
  //   "🚀 ~ updatePhysicsEngine ~ platformBottomBody:",
  //   platformBottomBody.position
  // );
  if (count === 0 && countInterval % 2 === 0) {
    const waveColumn = Math.floor(Math.random() * platformBottomsBodies.length);
    const platformBottomBody = platformBottomsBodies[waveColumn];
    let initialPosition = platformBottomBody.position;
    Matter.Body.setVelocity(platformBottomBody, {
      x: 0,
      y: -30,
    });
    setTimeout(() => {
      Matter.Body.setPosition(platformBottomBody, {
        x: initialPosition.x,
        y: initialPosition.y,
      });
      Matter.Body.setVelocity(platformBottomBody, {
        x: 0,
        y: 0,
      });
      count = 0;
    }, 1000);
    count = 1;
  }
  // } else if (count === 1 && countInterval % 12 === 0) {
  //   Matter.Body.setPosition(platformBottomBody, {
  //     x: platformBottomBody.position.x,
  //     y: platformBottomBody.position.y + 5,
  //   });
  //   count = 0;
  // }
  countInterval++;

  if (leftCount === 0 && countInterval % 8 === 0) {
    let initialPosition = platformLeftBody.position;
    Matter.Body.setVelocity(platformLeftBody, {
      x: 0,
      y: -30,
    });
    setTimeout(() => {
      Matter.Body.setPosition(platformLeftBody, {
        x: initialPosition.x,
        y: initialPosition.y,
      });
      Matter.Body.setVelocity(platformLeftBody, {
        x: 0,
        y: 0,
      });
      leftCount = 0;
    }, 3000);
    leftCount = 1;
  }
  if (rightCount === 1 && countInterval % 8 === 0) {
    let initialPosition = platformRightBody.position;
    Matter.Body.setVelocity(platformRightBody, {
      x: 0,
      y: -30,
    });
    setTimeout(() => {
      Matter.Body.setPosition(platformRightBody, {
        x: initialPosition.x,
        y: initialPosition.y,
      });
      Matter.Body.setVelocity(platformRightBody, {
        x: 0,
        y: 0,
      });
      rightCount = 0;
    }, 3000);
    rightCount = 1;
  }

  Matter.Engine.update(engine, time.delta);
  // count = 0;
};

export default function GameLoop(
  entities,
  { events, time, dispatch, touches }
) {
  updatePhysicsEngine(entities, time);
  const platforms = Object.keys(entities)
    .map((key) => entities[key])
    .filter((entity) => !!entity.platform);
  // const grounded = platforms.any(p => isGrounded(p, entities.character))
  return entities;
}
