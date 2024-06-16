import Matter from "matter-js";
import { getDirection } from "../core/utils/getDirection";

let count = 0;
let rightCount = 0;
let leftCount = 0;
let platformCount = 0;
let countInterval = 0;

let platformsVelocityMax = -10;
let platformVelocityMin = -15;

let wave = 0;

let isLevelLoaded = false;

const updatePhysicsEngine = (entities, time, dispatch, events) => {
  "worklet";
  const engine = entities?.physics?.engine;
  const config = entities.physics.config;
  // if (!isLevelLoaded) {
  //   Matter.Engine.update(engine, time.delta);
  //   countInterval++;
  //   if (countInterval === 10) {
  //     isLevelLoaded = true;
  //   }
  //   return;
  // }
  if (!engine) return;
  const { character, water } = entities;
  // Matter.Body.setPosition(
  //   water.waterBodies[water.waterBodies.length - 1],
  //   water.originalPositions.lastBody
  // );
  const {
    mapEnemeyIdxToWave,
    windowWidth,
    windowHeight,
    enemiesAndWaterCollisionDetector,
    enemiesAndCharacterCollisionDetector,
    characterAndWaterCollisionDetector,
    horizontalPlatformY,
    waterContainerSize,
    horizontalPlatformWidth,
  } = config;

  // if (!!character) {
  //   if (entities.health.value <= 0) {
  //     character.isKilled = true;
  //     entities.health.value = 0;
  //     Matter.Body.set(character.body, "collisionFilter", {
  //       category: null,
  //     });
  //     dispatch("game_over");
  //   }

  //   if (Math.abs(character.body.angle) > 1.3 && !character.isKilled) {
  //     character.isKilled = true;
  //     entities.health.value = 0;
  //     Matter.Body.set(character.body, "collisionFilter", {
  //       category: null,
  //     });
  //     dispatch("game_over");
  //   }
  // }

  const enemiesKeys = Object.keys(entities).filter((key) =>
    key.startsWith("enemy")
  );
  const enemies = enemiesKeys.map((key) => entities[key]);

  // if (!mapEnemeyIdxToWave[wave]) return;
  const enemiesOfThisWave = enemies.filter((enemy) =>
    mapEnemeyIdxToWave[wave].includes(enemy.wave)
  );

  const collisions = Matter.Detector.collisions(
    enemiesAndWaterCollisionDetector
  );

  collisions.forEach((collision) => {
    if (
      collision.bodyA.label.startsWith("enemy") ||
      collision.bodyB.label.startsWith("enemy")
    ) {
      console.log(collision.penetration.y);
      const foundCollidedEnemy = enemiesOfThisWave.find(
        (enemy) => enemy === collision.bodyA || enemy === collision.bodyB
      );
      if (foundCollidedEnemy)
        Matter.Body.applyForce(
          foundCollidedEnemy.body,
          foundCollidedEnemy.body.position,
          {
            x: collision.penetration.x * 0.0000008,
            y: collision.penetration.y * 0.000008,
          }
        );
    }
  });

  const characterBounceCollisions = Matter.Detector.collisions(
    characterAndWaterCollisionDetector
  );

  // characterBounceCollisions.forEach((collision) => {
  //   if (
  //     collision.bodyA.label === "character" ||
  //     collision.bodyB.label === "character"
  //   ) {
  //     console.log(
  //       "🚀 ~ characterBounceCollisions.forEach ~ collision:",
  //       collision?.penetration.y
  //     );
  //     // const foundCollidedWater = water.waterBodies.find(
  //     //   (waterBody) =>
  //     //     waterBody === collision.bodyA || waterBody === collision.bodyB
  //     // );
  //     if (collision.penetration.y < 3)
  //       Matter.Body.applyForce(character.body, character.body.position, {
  //         x: 0,
  //         y: -collision.penetration.y * 0.8,
  //       });
  //   }
  // });

  // Matter.Body.setVelocity(character.body, {
  //   x: character.body.velocity.x,
  //   y: 100,
  // });

  //

  const waterLevel = windowHeight - waterContainerSize.height / 2;
  console.log("🚀 ~ updatePhysicsEngine ~ waterLevel:", waterLevel);
  const penetrationlevel = character.body.position.y - waterLevel;
  console.log("🚀 ~ updatePhysicsEngine ~ penetrationlevel:", penetrationlevel);
  if (character.body.position.y > waterLevel) {
    Matter.Body.applyForce(character.body, character.body.position, {
      x: 0,
      y: -penetrationlevel,
    });
  }

  const attackCollisions = Matter.Detector.collisions(
    enemiesAndCharacterCollisionDetector
  );

  attackCollisions.forEach((collision) => {
    if (
      collision.bodyA.label === "character" ||
      collision.bodyB.label === "character"
    ) {
      const foundCollidedEnemy = enemiesOfThisWave.find(
        (enemy) =>
          enemy.body === collision.bodyA || enemy.body === collision.bodyB
      );
      entities.health.value -= Math.floor(
        (Math.abs(collision.depth) / 5) * foundCollidedEnemy.damageStrength
      );
      foundCollidedEnemy.health -= Math.floor(
        Math.abs(collision.depth) * 3 * 90
      );
    }
  });

  const isAnyEnemyDisplayed = enemiesOfThisWave.some(
    (enemy) => enemy.isDisplayed
  );
  // console.log(
  //   "🚀 ~ updatePhysicsEngine ~ enemiesOfThisWave:",
  //   enemiesOfThisWave.map((e) => e.isDisplayed)
  // );

  enemiesOfThisWave.forEach((enemy, idx) => {
    if (!isAnyEnemyDisplayed) {
      // console.log(
      //   "🚀 ~ enemiesOfThisWave.forEach ~ isAnyEnemyDisplayed:",
      //   isAnyEnemyDisplayed
      // );
      const xPosition = Matter.Common.random(1, 2);
      Matter.Body.setPosition(enemy.body, {
        x:
          xPosition <= 2
            ? 0 - enemy.size.width / 2
            : windowWidth + enemy.size.width / 2,
        y: horizontalPlatformY - enemy.size.height / 2,
      });

      Matter.Body.setStatic(enemy.body, false);

      enemy.isDisplayed = true;
    }
  });

  enemiesOfThisWave.forEach((enemy) => {
    if (
      (Math.abs(enemy.body.angle) > 1.5 || enemy.health <= 0) &&
      !enemy.killed
    ) {
      enemy.killed = true;
      Matter.Body.set(enemy.body, "collisionFilter", {
        category: null,
      });
      entities.score.value += 1;
    }
  });

  if (platformCount % 4 === 0) {
    collisions.forEach((collision) => {
      if (
        collision.bodyA.label === "enemy" ||
        collision.bodyB.label === "enemy"
      ) {
        // console.log("🚀 ~ collisions.forEach ~ collision:", collision.depth);
        const foundCollidedEnemy = enemiesOfThisWave.find(
          (enemy) =>
            enemy.body === collision.bodyA || enemy.body === collision.bodyB
        );

        if (
          !foundCollidedEnemy.killed &&
          (collision.depth > 60 ||
            Math.abs(foundCollidedEnemy.body.angle) > 1.3)
        ) {
          foundCollidedEnemy.killed = true;
          Matter.Body.set(foundCollidedEnemy.body, "collisionFilter", {
            category: null,
          });
          entities.score.value += 1;
        } else if (
          !foundCollidedEnemy.killed &&
          collision.depth < 60 &&
          Math.abs(foundCollidedEnemy.body.velocity.x) <
            foundCollidedEnemy.absXVelocity
        ) {
          const xDirection = getDirection(
            foundCollidedEnemy.body,
            character.body
          ).x;
          // console.log(
          //   "======this",
          //   platformCount,
          //   foundCollidedEnemy.enemyKey,
          //   foundCollidedEnemy.body.velocity,
          //   foundCollidedEnemy.body.position,
          //   xDirection,
          //   xDirection * 2 +
          //     xDirection * Math.abs(foundCollidedEnemy.body.velocity.x)
          // );
          setTimeout(() => {
            Matter.Body.setVelocity(foundCollidedEnemy.body, {
              x:
                xDirection * 10 +
                xDirection * Math.abs(foundCollidedEnemy.body.velocity.x),
              y: 0,
            });
          }, 100);
          // Matter.Body.setAngle(foundCollidedEnemy.body, 0);
        }
        // if (!foundCollidedEnemy.killed && collision.depth < 8) {
        //   Matter.Body.setPosition(foundCollidedEnemy.body, {
        //     x: foundCollidedEnemy.body.position.x,
        //     y: foundCollidedEnemy.body.position.y,
        //   });
        // }
      }
    });
  }

  const areAllEnemiesOfThisWaveKilled = enemiesOfThisWave.every(
    (enemy) => enemy.killed
  );

  if (areAllEnemiesOfThisWaveKilled) {
    wave++;
  }

  const bottomPlatformsKeys = Object.keys(entities).filter((key) =>
    key.startsWith("platform_bottom")
  );
  const bottomPlatforms = bottomPlatformsKeys.map((key) => entities[key]);
  const platformBottomsBodies = bottomPlatforms.map(
    (platform) => platform.body
  );

  platformBottomsBodies.forEach((b) => {
    Matter.Body.setAngle(b, 0);
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
  platformCount++;
  // if (countInterval % 20 === 0) {
  //   const waveColumn = Math.floor(
  //     Math.random() * (platformBottomsBodies.length - 2) + 1
  //   );
  //   const platformBottomBody = platformBottomsBodies[waveColumn];
  //   if (platformBottomBody) {
  //     let initialPosition = platformBottomBody.position;
  //     let platformsVelocity = Math.floor(
  //       Math.random() * (platformsVelocityMax - platformVelocityMin) +
  //         platformVelocityMin
  //     );
  //     Matter.Body.setVelocity(platformBottomBody, {
  //       x: 0,
  //       y: platformsVelocity,
  //     });
  //     setTimeout(() => {
  //       Matter.Body.setPosition(platformBottomBody, {
  //         x: initialPosition.x,
  //         y: initialPosition.y,
  //       });
  //       Matter.Body.setVelocity(platformBottomBody, {
  //         x: 0,
  //         y: 0,
  //       });
  //       count = 0;
  //     }, 8000);
  //     count = 1;
  //   }
  // }

  countInterval++;

  Matter.Engine.update(engine, time.delta);
};

export default function GameLoop(entities, { events, time, dispatch }) {
  updatePhysicsEngine(entities, time, dispatch, events);
  return entities;
}
