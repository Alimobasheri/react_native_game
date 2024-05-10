import { ENTITY_TYPES } from "../constants/game";
import { Dimensions } from "react-native";
import Matter from "matter-js";
import Character from "../components/Character";
import Platform from "../components/Platform";
import Water from "../components/Water";
import Enemy from "../components/Enemy";
import GameLoop from "./level1GameLoop";
import Score from "../components/Score";
import Health from "../components/Health";

Matter.Common.isElement = () => false;

const { height: windowHeight } = Dimensions.get("window");

export const level1Entities = ({ restart, insets, windowWidth }) => {
  if (restart) Matter.Engine.clear(restart.physics.engine);

  let engine = Matter.Engine.create();
  let world = engine.world;

  engine.gravity = { x: 0, y: 1 };

  const platformLeft = Platform(
    world,
    { x: 0 - 100, y: windowHeight / 2 },
    1.5708,
    windowHeight,
    200
  );

  const platformRight = Platform(
    world,
    { x: windowWidth + 100, y: windowHeight / 2 },
    1.5708,
    windowHeight,
    200
  );

  const minimumY = windowHeight - insets.bottom;

  const numberOfBottomPlatforms = 15;

  const createBottomPlatform = (platform, idx) => {
    const width = windowWidth / numberOfBottomPlatforms;
    return Platform(
      world,
      {
        x: width * (idx + 1) - width / 2,
        y: minimumY + 100,
      },
      0,
      width,
      200,
      {
        style: {
          backgroundColor: "blue",
        },
        notStatic: true,
      }
    );
  };

  const bottomPlatformsArray = Array.from(
    { length: numberOfBottomPlatforms },
    createBottomPlatform
  );

  const bottomPlatformsConstraints = [];

  for (let x = 0; x < numberOfBottomPlatforms; x++) {
    if (x < numberOfBottomPlatforms - 1) {
      const constraint = Matter.Constraint.create({
        bodyA: bottomPlatformsArray[x].body,
        bodyB: bottomPlatformsArray[x + 1].body,
        stiffness: 0.9,
        // length: windowWidth / numberOfBottomPlatforms,
      });
      bottomPlatformsConstraints.push(constraint);
    }
  }

  Matter.Composite.add(world, [...bottomPlatformsConstraints]);

  const bottomPlatforms = {
    ...bottomPlatformsArray.reduce((acc, p, idx) => {
      return {
        ...acc,
        [`platform_bottom_${idx}`]: p,
      };
    }, {}),
  };

  const numberOfEnemies = 40;

  const mapEnemeyIdxToWave = Array.from({ length: numberOfEnemies }, (v, i) => [
    i,
  ]);

  const createEnemy = (enemy, idx) => {
    return Enemy({
      world,
      position: { x: -1000, y: minimumY - 6 * (windowWidth / 30) - 100 },
      width: (windowWidth / 50) * 2,
      height: (windowWidth / 50) * 1,
      wave: mapEnemeyIdxToWave.findIndex((wave) => wave.includes(idx)),
      isDisplayed: false,
      absXVelocity: 20,
      damageStrength: 60,
      health: 100,
    });
  };

  const enemiesArray = Array.from({ length: numberOfEnemies }, createEnemy);

  const enemies = {
    ...enemiesArray.reduce((acc, p, idx) => {
      return {
        ...acc,
        [`enemy_${idx}`]: p,
      };
    }, {}),
  };

  const water = Water(
    world,
    platformLeft,
    platformRight,
    minimumY - 100,
    bottomPlatformsArray
  );

  const character = Character({
    world,
    position: {
      x: windowWidth / 2,
      y: minimumY - 100 - (2 * windowWidth) / 50,
    },
    width: (windowWidth / 35) * 3,
    height: (windowWidth / 35) * 2,
  });

  const score = Score({ position: { x: 100, y: 50 }, initialValue: 0 });

  const health = Health({
    position: { x: windowWidth - 300, y: 50 },
    initialValue: 100,
  });

  const enemiesAndWaterCollisionDetector = Matter.Detector.create({
    bodies: [...enemiesArray.map((enemy) => enemy.body), ...water.waterBodies],
  });
  const enemiesAndCharacterCollisionDetector = Matter.Detector.create({
    bodies: [...enemiesArray.map((enemy) => enemy.body), character.body],
  });

  const config = {
    correctBottomPlatforrmsY: windowHeight + 100 - insets.bottom / 2,
    windowWidth,
    mapEnemeyIdxToWave,
    enemiesAndWaterCollisionDetector,
    enemiesAndCharacterCollisionDetector,
  };

  return {
    physics: { engine, world, config },
    ...bottomPlatforms,
    // // platformLeft,
    // // platformRight,
    underPlatform: Platform(
      world,
      {
        x: windowWidth,
        y: windowHeight + 250 + 100,
      },
      0,
      windowWidth * 2,
      500,
      {
        style: {
          backgroundColor: "blue",
        },
      }
    ),
    water,
    character,
    ...enemies,
    score,
    health,
  };
};
