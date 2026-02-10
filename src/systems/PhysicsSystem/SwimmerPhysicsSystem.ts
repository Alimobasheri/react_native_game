import {
  System,
} from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  SwimmerComponentName,
  SwimmerComponentData,
} from '@/Game/ecs-components/Swimmer';
import {
  ContainerComponentName,
  ContainerComponentData,
} from '@/Game/ecs-components/Container';
import {
  WaterComponentName,
  WaterComponentData,
} from '@/Game/ecs-components/Water';
import {
  ObstacleComponentName,
} from '@/Game/ecs-components/ObstacleComponent';
import { LAYOUT_CONSTANTS } from '@/Layout';
import { getColumnCenterX } from '@/Layout';
import { MatterBodyComponentName } from '@/containers/ReactNativeSkiaGameEngine/internal/components/matterBody';

const SWIMMER_SIZE = 40;
const SWIMMER_HEIGHT = 60;

/**
 * SwimmerPhysicsSystem - Handles swimmer movement and game mechanics
 *
 * Game phases:
 * 1. Initial phase: Water rises to half container height, swimmer follows water surface
 * 2. Platformer phase: Water stops rising, swimmer's Y is locked to water surface,
 *    obstacles move down at water speed (creating platformer effect)
 * 3. Collision phase: If swimmer collides with obstacle, swimmer falls at obstacle speed
 *
 * This system:
 * - Manages game phase transitions
 * - Updates water surface during initial phase
 * - Moves obstacles down during platformer phase
 * - Handles swimmer collision and falling states
 * - Manages horizontal swimmer movement
 */
export const SwimmerPhysicsSystem: System = {
  requiredComponents: [SwimmerComponentName, MatterBodyComponentName],
  process: ({ entities, components, deltaTime, ecs }) => {
    'worklet';

    // Get container entity
    const containerEntities = ecs.value.getEntitiesWithComponents([
      ContainerComponentName,
    ]);

    if (containerEntities.length === 0) {
      return; // No container, nothing to do
    }

    const containerEntity = containerEntities[0];
    const containerData = components[ContainerComponentName].get(containerEntity);

    if (!containerData) {
      return;
    }

    // Get water entity and data
    const waterEntities = ecs.value.getEntitiesWithComponents([
      WaterComponentName,
    ]);

    if (waterEntities.length === 0) {
      return; // No water, nothing to do
    }

    const waterEntity = waterEntities[0];
    const waterData = components[WaterComponentName].get(waterEntity);

    if (!waterData) {
      return;
    }

    const deltaSeconds = deltaTime / 1000;
    const containerTop = containerData.centerY - containerData.height / 2;
    const containerBottom = containerData.centerY + containerData.height / 2;
    const halfContainerHeight = containerData.centerY; // Half way up from bottom

    // Determine game phase based on first swimmer (they should all be in sync)
    let isInInitialPhase = true;
    if (entities.length > 0) {
      const firstSwimmer = components[SwimmerComponentName].get(entities[0]);
      if (firstSwimmer) {
        isInInitialPhase = firstSwimmer.isInInitialPhase;
      }
    }

    // PHASE 1: Initial water rising phase
    if (isInInitialPhase) {
      // Update water level - rise until half container height
      const newWaterSurfaceY = containerData.waterSurfaceY - waterData.raisingSpeed * deltaSeconds;
      const targetHeight = halfContainerHeight;
      const constrainedWaterY = Math.max(newWaterSurfaceY, targetHeight);

      // Check if we've reached the target height
      const hasReachedHalfHeight = constrainedWaterY <= targetHeight;

      ecs.value.updateComponent<ContainerComponentData>(
        containerEntity,
        ContainerComponentName,
        (container: ContainerComponentData) => {
          container.waterSurfaceY = constrainedWaterY;
        }
      );

      // If we've reached half height, transition to platformer phase
      if (hasReachedHalfHeight) {
        entities.forEach((swimmerEntity: number) => {
          ecs.value.updateComponent<SwimmerComponentData>(
            swimmerEntity,
            SwimmerComponentName,
            (swimmer) => {
              swimmer.isInInitialPhase = false;
            }
          );
        });
      }
    }
    // PHASE 2 & 3: Platformer phase (water stays at half height, obstacles move down)
    else {
      // Water stays at current level (half height)
      // Obstacle movement is now handled by ObstacleSystem
    }

    // Update all swimmers
    // Pre-compute obstacle body ids for collision checks (resolved by Matter)
    const obstacleEntities = ecs.value.getEntitiesWithComponents([
      ObstacleComponentName,
      MatterBodyComponentName,
    ]);
    const obstacleBodyIds: Record<number, true> = {};
    for (let i = 0; i < obstacleEntities.length; i++) {
      const b = components[MatterBodyComponentName].get(obstacleEntities[i]);
      if (b?.id) obstacleBodyIds[b.id] = true;
    }

    const engine = global._RNTGE_?.physics?.engine;
    const pairs = engine?.pairs?.list ?? [];

    entities.forEach((swimmerEntity) => {
      const swimmerComponent = components[SwimmerComponentName].get(swimmerEntity) as
        | SwimmerComponentData
        | undefined;
      const matterBody = components[MatterBodyComponentName].get(swimmerEntity);

      if (!swimmerComponent || !matterBody) {
        return;
      }

      // Update swimmer's water surface reference
      const desiredY = containerData.waterSurfaceY - SWIMMER_HEIGHT / 2;

      // Check collisions from Matter engine pairs (no custom overlap resolution)
      let isCollidingWithObstacle = false;
      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        const a = pair.bodyA;
        const b = pair.bodyB;
        if (a === matterBody && obstacleBodyIds[b.id]) {
          isCollidingWithObstacle = true;
          break;
        }
        if (b === matterBody && obstacleBodyIds[a.id]) {
          isCollidingWithObstacle = true;
          break;
        }
      }

      let swimmerVelocityX = swimmerComponent.velocityX;

      // Apply horizontal movement: column-based (tap) or velocity-based (pan)
      let constrainedX: number;
      if (swimmerComponent.useColumnControl && typeof swimmerComponent.column === 'number') {
        const column = Math.max(0, Math.min(LAYOUT_CONSTANTS.COLUMNS - 1, swimmerComponent.column));
        constrainedX = getColumnCenterX(
          column,
          swimmerComponent.containerCenterX,
          swimmerComponent.containerWidth
        );
        // Keep column in sync (clamped)
        swimmerComponent.column = column;
      } else {
        const newX = matterBody.position.x + swimmerVelocityX * deltaSeconds;
        const minX = swimmerComponent.containerCenterX - swimmerComponent.containerWidth / 2 + SWIMMER_SIZE / 2;
        const maxX = swimmerComponent.containerCenterX + swimmerComponent.containerWidth / 2 - SWIMMER_SIZE / 2;
        constrainedX = Math.max(minX, Math.min(maxX, newX));
      }

      // Only force swimmer back to water surface when NOT colliding.
      // When colliding, let Matter resolve overlap and allow obstacles to push the swimmer down.
      const targetY = isCollidingWithObstacle ? matterBody.position.y : desiredY;

      if (typeof global.MatterReanimated !== 'undefined') {
        global.MatterReanimated.Body.setPosition(matterBody, {
          x: constrainedX,
          y: targetY,
        });
        // Keep velocities from accumulating (arcade feel, no gravity)
        if (global.MatterReanimated.Body.setVelocity) {
          global.MatterReanimated.Body.setVelocity(matterBody, { x: 0, y: 0 });
        }
        if (global.MatterReanimated.Body.setAngularVelocity) {
          global.MatterReanimated.Body.setAngularVelocity(matterBody, 0);
        }
      }

      // Apply friction to horizontal velocity (only when not using column control)
      const friction = 0.9;
      ecs.value.updateComponent<SwimmerComponentData>(
        swimmerEntity,
        SwimmerComponentName,
        (swimmer) => {
          'worklet';
          if (!swimmer.useColumnControl) {
            swimmer.velocityX *= friction;
          }
          swimmer.waterSurfaceY = containerData.waterSurfaceY;
          swimmer.isCollidingWithObstacle = isCollidingWithObstacle;
          swimmer.isInInitialPhase = swimmerComponent.isInInitialPhase;
          swimmer.column = swimmerComponent.column;
          swimmer.useColumnControl = swimmerComponent.useColumnControl;
        }
      );
    });
  }
}
