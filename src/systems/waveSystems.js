import Matter from "matter-js";
import { EntityRenderer } from "../components/Entity";
// System to handle waves creation and updates
let frame = 1;
export const createWaveSystem = () => {
  return (entities, { touches, time }) => {
    "worklet";

    const enemyBoats = Object.keys(entities)
      .filter((key) => key.startsWith("boat"))
      .map((key) => entities[key]);
    const { windowWidth, windowHeight } = entities;
    const boatRatio = 59.5 / 256;
    const boatSize = [windowWidth * 0.1, windowWidth * 0.1 * boatRatio];
    const ship = entities.ship;
    if (enemyBoats.length > 0) {
      const boatAndShipCollisionDetector = Matter.Detector.create({
        bodies: [...enemyBoats.map((boat) => boat.body), ship.body],
      });
      const collisions = Matter.Detector.collisions(
        boatAndShipCollisionDetector
      );

      collisions.forEach((collision) => {
        if (collision.bodyA === ship.body || collision.bodyB === ship.body) {
          entities.health.value -= 10;
          const boatBody =
            collision.bodyA === ship.body ? collision.bodyB : collision.bodyA;
          Matter.Body.setAngularVelocity(boatBody, 0.1);
          boatBody.isSinked = true;
          boatBody.isAttacking = false;
        }
      });
    }

    const waveEntity = entities.wave;
    const waterSurfaceY = entities.windowHeight * 0.8;

    touches
      .filter((t) => t.type === "start")
      .forEach((t) => {
        waveEntity.startTouch = {
          x: t.event.pageX,
          y: t.event.pageY,
          time: time.current,
        };
      });

    touches
      .filter((t) => t.type === "end")
      .forEach((t) => {
        if (waveEntity.startTouch) {
          const endTouch = {
            x: t.event.pageX,
            y: t.event.pageY,
            time: time.current,
          };
          const dx = endTouch.x - waveEntity.startTouch.x;
          const dy = endTouch.y - waveEntity.startTouch.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const duration = (endTouch.time - waveEntity.startTouch.time) / 1000;

          if (duration > 0) {
            const speed = distance / duration;
            const amplitude = Math.min(distance, 100); // Scale down amplitude
            const frequency = Math.max(0.01, Math.min(0.01, speed / 1000)); // Scale frequency to a reasonable range

            waveEntity.waves.push({
              x: endTouch.x,
              y: waterSurfaceY,
              amplitude,
              frequency,
              phase: 0,
              time: 0,
            });
          } else {
            console.error(
              `Duration is not valid: start time=${waveEntity.startTouch.time}, end time=${endTouch.time}`
            );
          }

          waveEntity.startTouch = null;
        }
      });

    waveEntity.waves.forEach((wave) => {
      wave.phase += 0.12;
      wave.time += 1;
      wave.amplitude *= 0.98; // Slight decay for simplicity
      wave.frequency *= 1.01; // Slight increase in frequency for shorter waves as it propagates
    });

    // Remove waves that have weakened below a certain threshold
    waveEntity.waves = waveEntity.waves.filter((wave) => wave.amplitude > 1);

    const boats = Object.keys(entities)
      .filter((key) => key.startsWith("boat") || key.startsWith("ship"))
      .map((key) => ({ ...entities[key], key }));

    boats.forEach(({ body, size, key }) => {
      if (body.isSinked) return;
      // if (Math.abs(body.velocity.y) > 20) {
      //   Matter.Body.setVelocity(body, {
      //     x: body.velocity.x,
      //     y: body.velocity.y < 0 ? -20 : 20,
      //   });
      // }
      // Ensure proper initialization
      if (!body.isInitialized) {
        Matter.Body.setPosition(body, {
          x: body.position.x,
          y: waterSurfaceY - size[1] / 2,
        });
        Matter.Body.setVelocity(body, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(body, 0);
      }

      const x = body.position.x;
      let combinedY = waterSurfaceY;
      let combinedSlope = 0;
      let maxWaveHeight = 0;
      waveEntity.waves.forEach((wave) => {
        const distance = x - wave.x;
        const decayFactor = Math.exp(-0.01 * Math.abs(distance));
        const waveContribution =
          wave.amplitude *
          decayFactor *
          Math.cos(distance * wave.frequency + wave.phase);
        combinedY += waveContribution;

        const waveSlope =
          wave.amplitude *
          decayFactor *
          wave.frequency *
          Math.cos(distance * wave.frequency + wave.phase);
        combinedSlope += waveSlope;

        // Track the maximum wave height
        maxWaveHeight = Math.max(maxWaveHeight, Math.abs(waveContribution));
      });

      const boatBottomY =
        body.position.y + (size[1] / 2) * Math.cos(body.angle);
      const boatTopY = body.position.y - (size[1] / 2) * Math.cos(body.angle);

      // Calculate the submerged depth based on the boat's position relative to the wave
      const submergedDepth = boatBottomY - combinedY;
      const submergedArea = Math.min(submergedDepth, size[1]) * size[0]; // Cross-sectional submerged area
      const submergedVolume = submergedArea; // Submerged volume

      // Adjust frictionAir based on the position relative to the water surface
      if (submergedDepth > 0) {
        Matter.Body.set(body, "frictionAir", 0.5);
      } else if (body.position.y < combinedY - (size[1] / 2) * 8) {
        Matter.Body.set(body, "frictionAir", 0.04);
      } else if (body.position.y < combinedY - (size[1] / 2) * 2) {
        Matter.Body.set(body, "frictionAir", 0.02);
      } else if (body.position.y < combinedY) {
        Matter.Body.set(body, "frictionAir", 0.1);
      }

      if (submergedDepth < 10 && Math.abs(body.angle) === 0) {
        if (key.startsWith("boat") && Math.abs(body.velocity.x) < 10) {
          Matter.Body.setVelocity(body, {
            x:
              body.position.x > entities.windowWidth / 2
                ? body.velocity.x - 3
                : body.velocity.x + 3,
            y: body.velocity.y,
          });
        }
      }
      if (key.startsWith("boat") && frame % 16 === 0) {
        console.log("🚀 ~ boats.forEach ~ body.velocity.y:", body.velocity.y);
        // console.log(
        //   "🚀 ~ boats.forEach ~ submergedDepth:",
        //   submergedDepth,
        //   submergedVolume,
        //   buoyancyForceMagnitude
        // );
      }
      // Apply buoyancy force
      if (submergedDepth > 10) {
        const densityOfWater = 0.000002; // Lower density to achieve smaller forces
        const waveHeightFactor = 1 + maxWaveHeight * 0.1;
        const buoyancyForceMagnitude =
          densityOfWater * submergedVolume * 9.8 * waveHeightFactor;

        Matter.Body.applyForce(
          body,
          { x: body.position.x, y: body.position.y },
          { x: 0, y: -Math.min(buoyancyForceMagnitude, 0.9) }
        );
      }

      if (submergedDepth > 0 && !key.startsWith("ship")) {
        // Rotate the boat based on the wave slope
        const targetAngle = Math.atan(combinedSlope);
        Matter.Body.setAngle(body, targetAngle);
      }
      if (!body.isInitialized) body.isInitialized = true;
    });

    // if (frame % 1000 === 0)
    Matter.Engine.update(entities.physics.engine, time.delta);
    frame++;
    const isAyEnemyAttaking = enemyBoats.some(
      (enemy) => enemy.body.isAttacking
    );
    if (!isAyEnemyAttaking) {
      const label = `boat_${Matter.Common.random(10 ** 6, 10 ** 20)}`;
      const boat = Matter.Bodies.rectangle(
        windowWidth - boatSize[0] / 2,
        waterSurfaceY - boatSize[1] / 2,
        boatSize[0],
        boatSize[1],
        { label, isAttacking: true }
      );
      Matter.World.add(entities.physics.engine.world, boat);
      entities[label] = {
        body: boat,
        size: boatSize,
        isSinked: false,
        isInitialized: false,
        renderer: EntityRenderer,
        isBoat: true,
      };
    }
    return entities;
  };
};

/**
 * This GPT should act as a professional React Native, TypeScript, JavaScript, and Game developer for mobiles. It should have expertise and high knowledge in topics of Game design, game physics, mobile 2d games, best practices, developing and designing hyper casual mobile games, mobile native softwares, frontend development, performance optimizations, algorithms and data structures.
This GPT is going to provide assistance in development, design, and strategizing the creation of a 2d hyper casual game for mobiles. The game mechanic and design contains a 2d view of a sea in horizontal alignment. A ship is on water surface on center of it. Some boats will start to speed toward the boat from right side and left side of the screen. The boats will speed and hit the ship, resulting in ship's health degradation. The player should swipe up in any location on screen. When they swipe up, a force causes waves to up-rise. A wave up-rises and spreads throughout the water. The primary goal for the user is to raise waves right under attacking boats. So the boats will be destroyed by wave force. Now these waves can distribute over the surface and affect the ship's stability too.
This game is being developed using React Native, JavaScript, react-native-game-engine, @shopify/react-native-skia, Matter.js.
Thus far the wave system has been implemented using Skia's paths and custom functions to calculate water's y based on amplitude, frequency, phase, time. I've written code to calculate bouyancy force being applied to boats and their location based on water's y on point. So matter.js pushes boats down because of gravity and I use its Body.apllyForce and airfriction to keep baots floating.
 */
