import Matter from "matter-js";

// System to handle waves creation and updates
let frame = 1;
export const createWaveSystem = () => {
  return (entities, { touches, time }) => {
    "worklet";

    const enemyBoats = Object.keys(entities)
      .filter((key) => key.startsWith("boat"))
      .map((key) => entities[key]);

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
            const amplitude = Math.min(distance, 400); // Scale down amplitude
            const frequency = Math.max(0.008, Math.min(0.001, speed / 500)); // Scale frequency to a reasonable range

            waveEntity.waves.push({
              x: endTouch.x - amplitude / 2,
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
      wave.phase += 0.11;
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
      if (key.startsWith("boat") && Math.abs(body.velocity.x) < 1) {
        Matter.Body.setVelocity(body, {
          x: body.position.x > entities.windowWidth / 2 ? -1 : 1,
          y: body.velocity.y,
        });
      }

      if (frame < 100) {
        // console.log("🚀 ~ boats.forEach ~ boat.position.y:", body.position.y);
      }
      const x = body.position.x;
      let combinedY = waterSurfaceY;
      waveEntity.waves.forEach((wave) => {
        const distance = x - wave.x;
        const decayFactor = Math.exp(-0.01 * Math.abs(distance));
        const waveContribution =
          wave.amplitude *
          decayFactor *
          Math.sin(distance * wave.frequency + wave.phase);
        combinedY += waveContribution;
      });
      if (body.position.y > combinedY + size[1] / 2)
        Matter.Body.set(body, "frictionAir", 0.4);
      else Matter.Body.set(body, "frictionAir", 0.1);
      // Apply buoyancy force
      if (combinedY - body.position.y - size[1] > size[1] / 2) return;

      const rate = Math.abs(combinedY - waterSurfaceY) / waterSurfaceY;
      const buoyancyForce =
        (combinedY - body.position.y - size[1]) * Math.max(rate, 0.08);
      // console.log("🚀 ~ boats.forEach ~ buoyancyForce:", buoyancyForce);

      const forceP = key.startsWith("ship") ? 0.001 : 0.0008;
      const minForce = key.startsWith("ship") ? -0.003 : -0.0004;
      Matter.Body.applyForce(
        body,
        { x: body.position.x, y: body.position.y },
        {
          x: Math.min(buoyancyForce * forceP, minForce) * 0.0008,
          y: Math.min(buoyancyForce * forceP, minForce),
        }
      );
      // Matter.Body.setAngle(body, 1.5);
      // Matter.Body.setAngularVelocity(
      //   body,
      //   buoyancyForce * 0.008 * Math.max(rate, 0.08)
      // );
      // console.log(
      //   "🚀 ~ boats.forEach ~ Math.max(buoyancyForce * 0.0008, -0.0004):",
      //   Math.max(buoyancyForce * 0.0008, -0.0004)
      // );
    });

    Matter.Engine.update(entities.physics.engine, time.delta);
    frame++;
    return entities;
  };
};
