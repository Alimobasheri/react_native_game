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
  const engine = entities?.physics?.engine;
  const config = entities.physics.config;
  if (!isLevelLoaded) {
    Matter.Engine.update(engine, time.delta);
    countInterval++;
    if (countInterval === 10) {
      isLevelLoaded = true;
    }
    return;
  }
  if (!engine) return;
  const { character, water } = entities;
  Matter.Body.setPosition(
    water.waterBodies[water.waterBodies.length - 1],
    water.originalPositions.lastBody
  );
  const {
    mapEnemeyIdxToWave,
    windowWidth,
    enemiesAndWaterCollisionDetector,
    enemiesAndCharacterCollisionDetector,
  } = config;

  if (!!character) {
    if (entities.health.value <= 0) {
      character.isKilled = true;
      entities.health.value = 0;
      Matter.Body.set(character.body, "collisionFilter", {
        category: null,
      });
      dispatch("game_over");
    }

    if (Math.abs(character.body.angle) > 1.3 && !character.isKilled) {
      character.isKilled = true;
      entities.health.value = 0;
      Matter.Body.set(character.body, "collisionFilter", {
        category: null,
      });
      dispatch("game_over");
    }
  }

  const enemiesKeys = Object.keys(entities).filter((key) =>
    key.startsWith("enemy")
  );
  const enemies = enemiesKeys.map((key) => entities[key]);

  const collisions = Matter.Detector.collisions(
    enemiesAndWaterCollisionDetector
  );
  if (!mapEnemeyIdxToWave[wave]) return;
  const enemiesOfThisWave = enemies.filter((enemy) =>
    mapEnemeyIdxToWave[wave].includes(enemy.wave)
  );

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

  enemiesOfThisWave.forEach((enemy, idx) => {
    if (!isAnyEnemyDisplayed) {
      const xPosition = Matter.Common.random(1, 2);
      Matter.Body.setPosition(enemy.body, {
        x:
          xPosition < 1.5
            ? 0 + enemy.size.width / 2
            : windowWidth - enemy.size.width / 2,
        y: character?.body?.position?.y || windowWidth / 2,
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

  if (platformCount % 10 === 0) {
    collisions.forEach((collision) => {
      if (
        collision.bodyA.label === "enemy" ||
        collision.bodyB.label === "enemy"
      ) {
        const foundCollidedEnemy = enemiesOfThisWave.find(
          (enemy) =>
            enemy.body === collision.bodyA || enemy.body === collision.bodyB
        );

        if (
          !foundCollidedEnemy.killed &&
          (collision.depth > 8 ||
            Math.abs(foundCollidedEnemy.body.angle) > 1.3 ||
            Math.abs(foundCollidedEnemy.body.velocity.y) > 2)
        ) {
          foundCollidedEnemy.killed = true;
          Matter.Body.set(foundCollidedEnemy.body, "collisionFilter", {
            category: null,
          });
          entities.score.value += 1;
        } else if (
          !foundCollidedEnemy.killed &&
          collision.depth < 8 &&
          Math.abs(foundCollidedEnemy.body.velocity.y) < 1 &&
          Math.abs(foundCollidedEnemy.body.velocity.x) <
            foundCollidedEnemy.absXVelocity
        ) {
          setTimeout(() => {
            Matter.Body.setVelocity(foundCollidedEnemy.body, {
              x:
                getDirection(foundCollidedEnemy.body, character.body).x * 4 +
                foundCollidedEnemy.body.velocity.x,
              y: foundCollidedEnemy.body.velocity.y,
            });
          }, 100);
        }
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
  if (countInterval % 20 === 0) {
    const waveColumn = Math.floor(
      Math.random() * (platformBottomsBodies.length - 2) + 1
    );
    const platformBottomBody = platformBottomsBodies[waveColumn];
    if (platformBottomBody) {
      let initialPosition = platformBottomBody.position;
      let platformsVelocity = Math.floor(
        Math.random() * (platformsVelocityMax - platformVelocityMin) +
          platformVelocityMin
      );
      Matter.Body.setVelocity(platformBottomBody, {
        x: 0,
        y: platformsVelocity,
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
      }, 8000);
      count = 1;
    }
  }

  countInterval++;

  Matter.Engine.update(engine, time.delta);
};

export default function GameLoop(entities, { events, time, dispatch }) {
  updatePhysicsEngine(entities, time, dispatch, events);
  return entities;
}
