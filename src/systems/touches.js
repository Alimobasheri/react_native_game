import Matter from "matter-js";

const maxPlatformVelocity = -100;
export const touches = (entities, { touches, time }) => {
  touches
    .filter((t) => t.type === "move")
    .forEach((t) => {
      const x = t.event.pageX;
      const engine = entities?.physics?.engine;
      const { windowWidth } = entities.physics.config;
      if (!engine) return;

      const bottomPlatformsKeys = Object.keys(entities).filter((key) =>
        key.startsWith("platform_bottom")
      );
      const bottomPlatforms = bottomPlatformsKeys.map((key) => entities[key]);
      const platformBottomsBodies = bottomPlatforms.map(
        (platform) => platform.body
      );

      const targetPaltformIdx = Math.floor(
        x / (windowWidth / platformBottomsBodies.length)
      );
      const targetPlatform = platformBottomsBodies[targetPaltformIdx];
      if (!targetPlatform) return;
      if (targetPlatform.velocity.y > maxPlatformVelocity) {
        Matter.Body.setVelocity(targetPlatform, {
          x: 0,
          y: Math.max(
            targetPlatform.velocity.y + t.delta.pageY,
            maxPlatformVelocity
          ),
        });
        console.log(
          `🚀 ~ .forEach ~ Math.max(
          targetPlatform.velocity.y + t.delta.pageY,
          maxPlatformVelocity
        ):`,
          Math.max(
            targetPlatform.velocity.y + t.delta.pageY,
            maxPlatformVelocity
          )
        );
      }

      Matter.Engine.update(engine, time.delta);
    });

  return entities;
};
