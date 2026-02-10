import {
  System,
} from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  WaterComponentName,
  WaterComponentData,
} from '@/Game/ecs-components/Water';
import {
  SwimmerComponentName,
  SwimmerComponentData,
} from '@/Game/ecs-components/Swimmer';

// Water difficulty progression - slowly increase water/obstacle speed over time
// to create a gentle but noticeable rise in challenge, like a hyper-casual game.
const WATER_SPEED_ACCELERATION_PER_SECOND = 3; // px/s² - +90 px/s after ~30s
const WATER_SPEED_MAX = 260; // clamp to avoid impossible speeds

/**
 * WaterPhysicsSystem - Owns water gameplay properties (speed, difficulty ramp).
 *
 * Responsibilities:
 * - Keeps water "conceptual speed" (`Water.raisingSpeed`) progressing over time.
 * - Drives difficulty curve used by swimmer physics and obstacle movement/spawning.
 * - Only ramps speed once the game has exited the initial rising phase.
 *
 * NOTE: Visual shader logic remains in `WaterShaderSystem`, and swimmer movement
 * remains in `SwimmerPhysicsSystem`. This system only mutates `Water` data.
 */
export const WaterPhysicsSystem: System = {
  requiredComponents: [WaterComponentName],
  process: ({ entities, components, deltaTime, ecs }) => {
    'worklet';

    if (entities.length === 0) {
      return;
    }

    const deltaSeconds = deltaTime / 1000;

    // Determine game phase based on first swimmer (they should all be in sync).
    // We only start ramping difficulty after the initial water rising phase.
    const swimmerEntities = ecs.value.getEntitiesWithComponents([
      SwimmerComponentName,
    ]);

    let isInInitialPhase = true;
    if (swimmerEntities.length > 0) {
      const firstSwimmer = components[SwimmerComponentName]?.get(
        swimmerEntities[0]
      ) as SwimmerComponentData | undefined;
      if (firstSwimmer) {
        isInInitialPhase = firstSwimmer.isInInitialPhase;
      }
    }

    if (isInInitialPhase) {
      return;
    }

    entities.forEach((waterEntity) => {
      const waterData = components[WaterComponentName]?.get(
        waterEntity
      ) as WaterComponentData | undefined;

      if (!waterData) {
        return;
      }

      const currentSpeed = waterData.raisingSpeed ?? 0;
      const acceleratedSpeed =
        currentSpeed + WATER_SPEED_ACCELERATION_PER_SECOND * deltaSeconds;
      const clampedSpeed = Math.min(WATER_SPEED_MAX, acceleratedSpeed);

      if (clampedSpeed === currentSpeed) {
        return;
      }

      ecs.value.updateComponent<WaterComponentData>(
        waterEntity,
        WaterComponentName,
        (water) => {
          water.raisingSpeed = clampedSpeed;
        }
      );
    });
  },
};

