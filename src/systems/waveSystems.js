import Matter from "matter-js";
import { EntityRenderer } from "../components/Entity";
import { TRAIL_FADE_DURATION } from "../constants/configs";
// System to handle waves creation and updates
let frame = 1;
export const createWaveSystem = () => {
  return (entities, { touches, time }) => {
    ("worklet");

    const enemyBoats = Object.keys(entities)
      .filter((key) => key.startsWith("boat"))
      .map((key) => entities[key]);
    console.log("🚀 ~ return ~ enemyBoats:", enemyBoats.length);
    const { windowWidth, windowHeight } = entities;
    const boatRatio = 59.5 / 256;
    const boatSize = [windowWidth * 0.1, windowWidth * 0.1 * boatRatio];
    const ship = entities.ship;
    if (enemyBoats.length > 0 && entities.ship) {
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
            const amplitude = Math.min(distance, 150); // Scale down amplitude
            const frequency = Math.max(0.01, Math.min(0.007, speed / 500)); // Scale frequency to a reasonable range

            waveEntity.waves.push({
              x: endTouch.x,
              y: waterSurfaceY,
              amplitude,
              frequency,
              phase: 2,
              time: 0,
            });
          }

          waveEntity.startTouch = null;
        }
      });

    waveEntity.waves.forEach((wave) => {
      wave.phase += 0.2;
      wave.time += 1;
      wave.amplitude *= 0.95; // Slight decay for simplicity
      wave.frequency *= 1.01; // Slight increase in frequency for shorter waves as it propagates
    });

    // Remove waves that have weakened below a certain threshold
    waveEntity.waves = waveEntity.waves.filter((wave) => wave.amplitude > 5);

    const boats = Object.keys(entities)
      .filter((key) => key.startsWith("boat") || key.startsWith("ship"))
      .map((key) => entities[key]);
    const killedBoatsByLabels = [];
    boats.forEach(({ body, size, createdFrame, trail }) => {
      const { label } = body;
      if (body.isSinked) {
        if (body.position.y > windowHeight + size[1]) {
          killedBoatsByLabels.push(label);
          Matter.World.remove(entities.physics.engine.world, body);
        }
        return;
      }
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
      if (submergedArea >= size[1] * size[0]) {
        body.isSinked = true;
        body.isAttacking = false;
      }
      if (submergedDepth > 30) {
        // Adjust frictionAir based on the position relative to the water surface
        Matter.Body.set(body, "frictionAir", 0.1);
      } else if (body.position.y < combinedY - (size[1] / 2) * 8) {
        Matter.Body.set(body, "frictionAir", 0.04);
      } else if (body.position.y < combinedY - (size[1] / 2) * 2) {
        Matter.Body.set(body, "frictionAir", 0.02);
      } else if (submergedDepth < 5) {
        Matter.Body.set(body, "frictionAir", 0.05);
      }

      if (submergedDepth < 30 && Math.abs(body.angle) < 0.1 && entities.ship) {
        if (label.startsWith("boat") && Math.abs(body.velocity.x) < 10) {
          Matter.Body.setVelocity(body, {
            x:
              body.position.x > entities.ship.body.position.x
                ? body.velocity.x === 0
                  ? -2
                  : body.velocity.x * 1.3
                : body.velocity.x === 0
                ? 2
                : body.velocity.x * 1.3,
            y: body.velocity.y,
          });
        }
      }

      const BOAT_BREAK_VELOCITY_THRESHOLD = 30;
      const BOAT_BREAK_HEIGHT_THRESHOLD = windowWidth * 0.2;
      // Check for the condition to break the boat
      if (
        body.velocity.y > -BOAT_BREAK_VELOCITY_THRESHOLD &&
        body.position.y < BOAT_BREAK_HEIGHT_THRESHOLD
      ) {
        body.isBroken = true; // Mark the boat as broken
      }

      if (body.isBroken && body.position.y >= combinedY) {
        body.isSinked = true; // Mark the boat as sunk
        body.isAttacking = false;
      }
      // if (label.startsWith("ship") && !body.isSinked && frame < 40) {
      //   console.log(
      //     "🚀 ~ boats.forEach ~ body.velocity.y:",
      //     "frame:",
      //     frame,
      //     "velocity.x",
      //     body.velocity.x,
      //     "velocity.y",
      //     body.velocity.y,
      //     "position.y",
      //     body.position.y,
      //     "frictionAir:",
      //     body.frictionAir,
      //     "Speed",
      //     body.speed,
      //     "isInitialized",
      //     body.isInitialized
      //   );
      // }

      // Apply buoyancy force based on velocity and size
      if (submergedDepth > 10) {
        const densityOfWater = 0.000002; // Lower density to achieve smaller forces
        const waveHeightFactor = 1 + maxWaveHeight * 0.1;
        const sizeFactor = Math.min(Math.sqrt(size[0] * size[1]) * 0.01, 0.2); // Larger size results in more buoyancy force
        const buoyancyForceMagnitude =
          densityOfWater *
          submergedVolume *
          9.8 *
          waveHeightFactor *
          sizeFactor;
        const buoyancyForce = -Math.min(buoyancyForceMagnitude, 0.5);

        Matter.Body.applyForce(
          body,
          { x: body.position.x, y: body.position.y },
          { x: 0, y: buoyancyForce }
        );
      }

      if (Math.abs(body.velocity.x) > 5) {
        const maxTiltAngle = Math.PI / 8; // Adjust the tilt angle as needed
        const tiltFactor = 0.01; // Adjust the factor to control the tilting effect
        const targetTilt = body.velocity.x * tiltFactor; // Reverse the tilt direction
        const clampedTilt = Math.max(
          -maxTiltAngle,
          Math.min(maxTiltAngle, targetTilt)
        );
        Matter.Body.setAngle(body, -clampedTilt);
      }

      if (
        submergedDepth > 0 &&
        body.velocity.y < 0 &&
        !label.startsWith("ship")
      ) {
        // Rotate the boat based on the wave slope
        const targetAngle = Math.atan(combinedSlope);
        if (Math.abs(combinedSlope) > 0.004)
          Matter.Body.setAngle(body, -targetAngle);
      }
      if (
        body.position.y <= combinedY + size[1] / 2 &&
        body.position.y >= combinedY - size[1] / 2
      ) {
        const isAdjacentToWater =
          body.position.y <= waterSurfaceY + size[1] / 2 &&
          body.position.y >= waterSurfaceY - size[1] / 2;
        trail.push({
          x: body.position.x,
          y: body.position.y,
          timestamp: Date.now(),
          render: isAdjacentToWater,
          velocityX: Math.abs(body.velocity.x),
        });
      }
      // Function to get the water surface y-coordinate at a given x
      const getWaterSurfaceY = (x) => {
        let combinedY = waterSurfaceY;
        waveEntity.waves.forEach((wave) => {
          const distance = x - wave.x;
          const decayFactor = Math.exp(-0.01 * Math.abs(distance));
          const waveContribution =
            wave.amplitude *
            decayFactor *
            Math.cos(distance * wave.frequency + wave.phase);
          combinedY += waveContribution;
        });
        return combinedY;
      };
      if (trail.length > 20) trail.shift(); // Limit the trail length
      // Update the y-coordinate of each trail point based on the water surface
      trail.forEach((trailPoint) => {
        trailPoint.y = getWaterSurfaceY(trailPoint.x);
      });
      // Remove trail points that are older than TRAIL_FADE_DURATION
      const now = Date.now();
      trail = trail.filter(
        (trailPoint) => now - trailPoint.timestamp < TRAIL_FADE_DURATION
      );
      if (frame - createdFrame >= 7) body.isInitialized = true;
    });

    // if (frame % 1000 === 0)
    Matter.Engine.update(entities.physics.engine, time.delta);
    const isAyEnemyAttaking = enemyBoats.some(
      (enemy) => enemy.body.isAttacking
    );
    if (enemyBoats.length <= 0) {
      const label = `boat_${Matter.Common.random(10 ** 6, 10 ** 20)}`;
      const direction = Matter.Common.choose([-1, 1]);
      const x =
        direction === 1 ? windowWidth - boatSize[0] / 2 : boatSize[0] / 2;

      console.log("🚀 ~ return ~ x:", x);
      const boat = Matter.Bodies.rectangle(
        x,
        waterSurfaceY - boatSize[1] / 2,
        boatSize[0],
        boatSize[1],
        { label, isAttacking: true }
      );
      Matter.World.add(entities.physics.engine.world, boat);
      boat.direction = direction;
      entities[label] = {
        body: boat,
        size: boatSize,
        isSinked: false,
        isInitialized: false,
        renderer: EntityRenderer,
        isBoat: true,
        direction,
        createdFrame: frame,
        trail: [],
        waterSurfaceY,
        waveEntity,
      };
    }
    frame++;

    const newEntitiesKeys = Object.keys(entities).filter(
      (key) => !killedBoatsByLabels.includes(key)
    );

    const updatedEntities = newEntitiesKeys.reduce((newEntitites, key) => {
      newEntitites[key] = entities[key];
      return newEntitites;
    }, {});

    return updatedEntities;
  };
};

/**
 * This GPT should act as a professional React Native, TypeScript, JavaScript, and Game developer for mobiles. It should have expertise and high knowledge in topics of Game design, game physics, mobile 2d games, best practices, developing and designing hyper casual mobile games, mobile native softwares, frontend development, performance optimizations, algorithms and data structures.
This GPT is going to provide assistance in development, design, and strategizing the creation of a 2d hyper casual game for mobiles. The game mechanic and design contains a 2d view of a sea in horizontal alignment. A ship is on water surface on center of it. Some boats will start to speed toward the boat from right side and left side of the screen. The boats will speed and hit the ship, resulting in ship's health degradation. The player should swipe up in any location on screen. When they swipe up, a force causes waves to up-rise. A wave up-rises and spreads throughout the water. The primary goal for the user is to raise waves right under attacking boats. So the boats will be destroyed by wave force. Now these waves can distribute over the surface and affect the ship's stability too.
This game is being developed using React Native, JavaScript, react-native-game-engine, @shopify/react-native-skia, Matter.js.
Thus far the wave system has been implemented using Skia's paths and custom functions to calculate water's y based on amplitude, frequency, phase, time. I've written code to calculate bouyancy force being applied to boats and their location based on water's y on point. So matter.js pushes boats down because of gravity and I use its Body.apllyForce and airfriction to keep baots floating.
 */
