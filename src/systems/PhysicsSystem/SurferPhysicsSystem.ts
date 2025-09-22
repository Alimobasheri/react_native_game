import {
  System,
  SystemContext,
} from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  SurferComponentName,
  SurferComponentData,
} from '@/Game/ecs-components/Surfer';
import { SeaLayerComponentName } from '@/Game/ecs-components/SeaLayer';
import { MatterBodyComponentName } from '@/containers/ReactNativeSkiaGameEngine/internal/components/matterBody';
import {
  PositionComponentName,
  PositionComponentData,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/position';
import {
  applySurferBuoyancy,
  applySurferFriction,
  positionSurferOnSea,
} from './surferWorklets';

// No longer need external tracking - using component data instead

/**
 * SurferPhysicsSystem - A worklet-based physics system for the surfer character
 *
 * This system handles:
 * - Buoyancy forces based on sea wave heights
 * - Friction when in contact with water
 * - Positioning the surfer on the centered sea layer
 * - Integration with Matter.js physics bodies through RNTGE
 */
export const SurferPhysicsSystem: System = {
  requiredComponents: [SurferComponentName, MatterBodyComponentName],
  process: ({ entities, components, deltaTime, ecs }) => {
    'worklet';

    // Get all sea layer entities to find the main/centered layer
    const seaLayerEntities = ecs.value.getEntitiesWithComponents([
      SeaLayerComponentName,
    ]);

    if (seaLayerEntities.length === 0) {
      // No sea layers available, skip physics
      return;
    }

    // Find the centered sea layer (typically layer index 1 for 3-layer setup)
    let centeredSeaLayer = null;
    let centeredLayerEntity = -1;

    for (let i = 0; i < seaLayerEntities.length; i++) {
      const seaLayerEntity = seaLayerEntities[i];
      const seaLayerData =
        components[SeaLayerComponentName].get(seaLayerEntity);

      if (seaLayerData && seaLayerData.layerIndex === 1) {
        centeredSeaLayer = seaLayerData;
        centeredLayerEntity = seaLayerEntity;
        break;
      }
    }

    // If no centered layer found, use the first available layer
    if (!centeredSeaLayer && seaLayerEntities.length > 0) {
      centeredLayerEntity = seaLayerEntities[0];
      centeredSeaLayer =
        components[SeaLayerComponentName].get(centeredLayerEntity);
    }

    if (!centeredSeaLayer) {
      return;
    }

    // Process all surfer entities
    entities.forEach((surferEntity) => {
      const surferComponent = components[SurferComponentName].get(surferEntity);
      const matterBody = components[MatterBodyComponentName].get(surferEntity);
      const positionComponent =
        components[PositionComponentName].get(surferEntity);

      if (!surferComponent || !matterBody || !positionComponent) {
        return;
      }

      // Check if this surfer needs initial positioning
      const needsInitialPosition = !surferComponent.isPhysicsInitialized;

      // Position surfer on the sea surface
      positionSurferOnSea(
        matterBody,
        centeredSeaLayer,
        (x: number, y: number) => {
          // Update position component
          ecs.value.updateComponent<PositionComponentData>(
            surferEntity,
            PositionComponentName,
            (pos) => {
              pos.x = x;
              pos.y = y;
            }
          );

          // Update Matter.js body position
          if (typeof global.MatterReanimated !== 'undefined') {
            global.MatterReanimated.Body.setPosition(matterBody, { x, y });
          }

          // Mark as initialized in the component
          if (needsInitialPosition) {
            ecs.value.updateComponent<SurferComponentData>(
              surferEntity,
              SurferComponentName,
              (surfer) => {
                surfer.isPhysicsInitialized = true;
              }
            );
          }
        },
        needsInitialPosition // Force update for initial positioning
      );

      // Apply buoyancy forces
      applySurferBuoyancy(
        matterBody,
        centeredSeaLayer,
        deltaTime,
        (
          position: { x: number; y: number },
          force: { x: number; y: number }
        ) => {
          // Apply force through Matter.js
          if (typeof global.MatterReanimated !== 'undefined') {
            global.MatterReanimated.Body.applyForce(
              matterBody,
              position,
              force
            );
          }
        }
      );

      // Apply water friction
      applySurferFriction(
        matterBody,
        centeredSeaLayer,
        (property: string, value: any) => {
          // Update Matter.js body properties
          if (typeof global.MatterReanimated !== 'undefined') {
            global.MatterReanimated.Body.set(matterBody, property, value);
          }
        }
      );
    });
  },
};
