import {
  System,
  SystemContext,
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
  PositionComponentName,
  PositionComponentData,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/position';
import {
  RenderComponentName,
  RenderComponentData,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import {
  ObstacleComponentName,
} from '@/Game/ecs-components/ObstacleComponent';

const SWIMMER_SIZE = 40;
const SWIMMER_HEIGHT = 60;
const SWIMMER_SPEED = 200; // pixels per second for left/right movement
const FALLING_SPEED = 100; // pixels per second when falling after collision

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
  requiredComponents: [], // Process all entities, we'll query for specific components
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

    // Get all swimmer entities
    const swimmerEntities = ecs.value.getEntitiesWithComponents([
      SwimmerComponentName,
      PositionComponentName,
    ]);

    // Determine game phase based on first swimmer (they should all be in sync)
    let isInInitialPhase = true;
    if (swimmerEntities.length > 0) {
      const firstSwimmer = components[SwimmerComponentName].get(swimmerEntities[0]);
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
        swimmerEntities.forEach((swimmerEntity) => {
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
    swimmerEntities.forEach((swimmerEntity) => {
      const swimmerComponent = components[SwimmerComponentName].get(swimmerEntity);
      const positionComponent = components[PositionComponentName].get(swimmerEntity);

      if (!swimmerComponent || !positionComponent) {
        return;
      }

      // Update swimmer's water surface reference
      swimmerComponent.waterSurfaceY = containerData.waterSurfaceY;

      // Check for collisions with obstacles (only during platformer phase)
      let hasCollision = false;
      if (!swimmerComponent.isInInitialPhase && !swimmerComponent.isCollidingWithObstacle) {
        const obstacleEntities = ecs.value.getEntitiesWithComponents([
          ObstacleComponentName,
          PositionComponentName,
        ]);

        // Swimmer bounding box
        const swimmerLeft = positionComponent.x - SWIMMER_SIZE / 2;
        const swimmerRight = positionComponent.x + SWIMMER_SIZE / 2;
        const swimmerTop = positionComponent.y - SWIMMER_HEIGHT / 2;
        const swimmerBottom = positionComponent.y + SWIMMER_HEIGHT / 2;

        obstacleEntities.forEach((obstacleEntity) => {
          const obstacleComponent = components[ObstacleComponentName].get(obstacleEntity);
          const obstaclePosition = components[PositionComponentName].get(obstacleEntity);

          if (!obstacleComponent || !obstaclePosition) return;

          // Obstacle bounding box (assuming triangular shape, use full rectangle for simplicity)
          const obstacleLeft = obstaclePosition.x - obstacleComponent.width / 2;
          const obstacleRight = obstaclePosition.x + obstacleComponent.width / 2;
          const obstacleTop = obstaclePosition.y - obstacleComponent.height / 2;
          const obstacleBottom = obstaclePosition.y + obstacleComponent.height / 2;

          // Check for bounding box collision
          if (swimmerRight > obstacleLeft &&
            swimmerLeft < obstacleRight &&
            swimmerBottom > obstacleTop &&
            swimmerTop < obstacleBottom) {
            hasCollision = true;
          }
        });
      }

      let swimmerY: number;
      let swimmerVelocityX = swimmerComponent.velocityX;

      // Handle collision state changes
      if (hasCollision && !swimmerComponent.isCollidingWithObstacle) {
        // Just collided - start falling
        swimmerComponent.isCollidingWithObstacle = true;
        swimmerComponent.fallingVelocityY = waterData.raisingSpeed;
      }

      // Determine swimmer Y position based on state
      if (swimmerComponent.isCollidingWithObstacle) {
        // PHASE 3: Falling after collision - move down at obstacle speed
        swimmerY = positionComponent.y + waterData.raisingSpeed * deltaSeconds;
        swimmerComponent.fallingVelocityY = waterData.raisingSpeed;

        // Check if swimmer has fallen below container (game over condition)
        if (swimmerY > containerBottom) {
          // For now, just keep them at bottom
          swimmerY = containerBottom - SWIMMER_HEIGHT / 2;
        }
      } else if (!swimmerComponent.isInInitialPhase) {
        // PHASE 2: Platformer phase - lock Y to water surface
        swimmerY = containerData.waterSurfaceY - SWIMMER_HEIGHT / 2;
      } else {
        // PHASE 1: Initial phase - follow rising water surface
        swimmerY = containerData.waterSurfaceY - SWIMMER_HEIGHT / 2;
      }

      // Apply horizontal movement based on velocity
      const newX = positionComponent.x + swimmerVelocityX * deltaSeconds;

      // Constrain swimmer within container bounds (rectangular)
      const minX = swimmerComponent.containerCenterX - swimmerComponent.containerWidth / 2 + SWIMMER_SIZE / 2;
      const maxX = swimmerComponent.containerCenterX + swimmerComponent.containerWidth / 2 - SWIMMER_SIZE / 2;
      const constrainedX = Math.max(minX, Math.min(maxX, newX));

      // Update both position component and render component position
      ecs.value.updateComponent<PositionComponentData>(
        swimmerEntity,
        PositionComponentName,
        (pos) => {
          'worklet';
          pos.x = constrainedX;
          pos.y = swimmerY;
        }
      );
      ecs.value.updateComponent<RenderComponentData>(
        swimmerEntity,
        RenderComponentName,
        (render) => {
          'worklet';
          if (!render.position) {
            render.position = { x: constrainedX, y: swimmerY };
          } else {
            render.position.x = constrainedX;
            render.position.y = swimmerY;
          }
        }
      );

      // Apply friction to horizontal velocity (gradually slow down)
      const friction = 0.9;
      ecs.value.updateComponent<SwimmerComponentData>(
        swimmerEntity,
        SwimmerComponentName,
        (swimmer) => {
          'worklet';
          swimmer.velocityX *= friction;
          swimmer.waterSurfaceY = containerData.waterSurfaceY;
          swimmer.fallingVelocityY = swimmerComponent.fallingVelocityY;
          swimmer.isCollidingWithObstacle = swimmerComponent.isCollidingWithObstacle;
          swimmer.isInInitialPhase = swimmerComponent.isInInitialPhase;
        }
      );
    });
  }
}
