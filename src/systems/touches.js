import Matter from "matter-js";

const maxPlatformVelocity = -100;
export const touches = (entities, { touches, time }) => {
  // return entities;c
  touches
    .filter((t) => t.type === "move")
    .forEach((t) => {
      const x = t.event.pageX;
      const engine = entities?.physics?.engine;
      const { windowWidth } = entities.physics.config;
      if (!engine) return;

      const { water } = entities;

      const waterBodies = water.waterBodies;

      const targetWaterBodyIdx = Math.floor(
        x / (windowWidth / waterBodies.length)
      );
      const targetWaterBody = waterBodies[targetWaterBodyIdx];
      console.log("🚀 ~ .forEach ~ targetWaterBody:", targetWaterBodyIdx);

      if (!targetWaterBody) return;
      // if (targetWaterBody.velocity.y > maxPlatformVelocity) {
      Matter.Body.setVelocity(targetWaterBody, {
        x: 0,
        y: Math.max(
          targetWaterBody.velocity.y + t.delta.pageY,
          maxPlatformVelocity
        ),
      });
      console.log(
        `🚀 ~ .forEach ~ Math.max(
          targetWaterBody.velocity.y + t.delta.pageY,
          maxPlatformVelocity
        ):`,
        Math.max(
          targetWaterBody.velocity.y + t.delta.pageY,
          maxPlatformVelocity
        )
      );
      // }
      console.log(
        "🚀 ~ .forEach ~ targetWaterBody.velocity.y:",
        targetWaterBody.velocity.y
      );

      // const bottomPlatformsKeys = Object.keys(entities).filter((key) =>
      //   key.startsWith("platform_bottom")
      // );
      // const bottomPlatforms = bottomPlatformsKeys.map((key) => entities[key]);
      // const platformBottomsBodies = bottomPlatforms.map(
      //   (platform) => platform.body
      // );

      // const targetPaltformIdx = Math.floor(
      //   x / (windowWidth / platformBottomsBodies.length)
      // );
      // const targetPlatform = platformBottomsBodies[targetPaltformIdx];
      // if (!targetPlatform) return;
      // if (targetPlatform.velocity.y > maxPlatformVelocity) {
      //   Matter.Body.setVelocity(targetPlatform, {
      //     x: 0,
      //     y: Math.max(
      //       targetPlatform.velocity.y + t.delta.pageY,
      //       maxPlatformVelocity
      //     ),
      //   });
      //   console.log(
      //     `🚀 ~ .forEach ~ Math.max(
      //     targetPlatform.velocity.y + t.delta.pageY,
      //     maxPlatformVelocity
      //   ):`,
      //     Math.max(
      //       targetPlatform.velocity.y + t.delta.pageY,
      //       maxPlatformVelocity
      //     )
      //   );
      // }

      Matter.Engine.update(engine, time.delta);
    });

  return entities;
};
