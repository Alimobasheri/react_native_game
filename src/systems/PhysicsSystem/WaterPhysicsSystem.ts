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
import { ObstacleRowComponentName, ObstacleRowComponentData } from '@/Game/ecs-components/ObstacleRowComponent';
import { RenderComponentData, RenderComponentName } from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';

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
    const swimmerEntities = ecs.getEntitiesWithComponents([
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

      const currentSpeed = waterData.baseSpeed ?? 0;
      const acceleratedSpeed =
        currentSpeed + WATER_SPEED_ACCELERATION_PER_SECOND * deltaSeconds;
      const clampedSpeed = Math.min(WATER_SPEED_MAX, acceleratedSpeed);

      if (clampedSpeed === currentSpeed) {
        return;
      }

      // ecs.updateComponent<WaterComponentData>(
      //   waterEntity,
      //   WaterComponentName,
      //   (water) => {
      //   }
      // );

      if (waterData.centerRowEntity) {
        const rowData = components[ObstacleRowComponentName].get(waterData.centerRowEntity) as ObstacleRowComponentData | undefined
        if (rowData) {
          const prevRow = rowData.prevRowEntity ? components[ObstacleRowComponentName].get(rowData.prevRowEntity) as ObstacleRowComponentData | undefined : null
          const gaps = rowData.gaps
          const rowlength = 6
          let multiply = gaps.length / rowlength
          multiply = (1 / (multiply || 1))

          let forceDirection: WaterComponentData['forceDirection'] = 0

          if (prevRow) {
            const prevRowGaps = prevRow.gaps
            const prevCenter = (Math.min(...prevRowGaps) + Math.max(...prevRowGaps)) / 2
            const currentCenter = (Math.min(...gaps) + Math.max(...gaps)) / 2
            let targetForceDirection = !gaps || gaps.length === 0 || currentCenter == prevCenter ? 0 : currentCenter < prevCenter ? -1 : 1
            let currentForceDirection = waterData.forceDirection ?? 0
            forceDirection = targetForceDirection == 0 ? targetForceDirection : targetForceDirection < 0 ? Math.max(targetForceDirection, currentForceDirection - 0.1) : Math.min(targetForceDirection, currentForceDirection + 0.1)
          }
          ecs.updateComponent<WaterComponentData>(
            waterEntity,
            WaterComponentName,
            (water) => {
              water.baseSpeed = clampedSpeed;
              water.forceDirection = forceDirection
              const targetSpeed = water.baseSpeed * (1 + multiply * 0.1);
              const diff = targetSpeed - water.baseSpeed
              if (diff > 0) {
                water.raisingSpeed = Math.min(water.raisingSpeed + diff * 0.1, targetSpeed);
              } else if (diff < 0) {
                water.raisingSpeed = Math.max(water.raisingSpeed + diff * 0.1, targetSpeed)
              }
            }
          );
          ecs.updateComponent<RenderComponentData>(
            waterEntity,
            RenderComponentName,
            (renderComponent) => {
              'worklet';
              if (!renderComponent.shader) return;
            })
        }

      }
    });
  },
};

