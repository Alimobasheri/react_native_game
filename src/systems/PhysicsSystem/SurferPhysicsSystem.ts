import {
  System,
  SystemContext,
} from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  SurferComponentName,
  SurferComponentData,
  SurferStateData,
  SurferArcadeState,
} from '@/Game/ecs-components/Surfer';
import { SeaLayerComponentName } from '@/Game/ecs-components/SeaLayer';
import { MatterBodyComponentName } from '@/containers/ReactNativeSkiaGameEngine/internal/components/matterBody';
import {
  PositionComponentName,
  PositionComponentData,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/position';
import {
  applyPlatformerSurferPhysics,
  applySurferFriction,
} from './surferWorklets';

// No longer need external tracking - using component data instead

/**
 * SurferPhysicsSystem - A worklet-based physics system for the surfer character
 *
 * This system handles:
 * - Platformer-style physics with locked x position
 * - Vertical movement and rotation based on wave forces
 * - Friction when in contact with water
 * - Integration with Matter.js physics bodies through RNTGE
 */
export const SurferPhysicsSystem: System = {
  requiredComponents: [SurferComponentName, MatterBodyComponentName],
  process: ({ entities, components, deltaTime, ecs, eventQueue }) => {
    'worklet';

    // Get all sea layer entities to find the main/centered layer
    const seaLayerEntities = ecs.getEntitiesWithComponents([
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
      let surferComponent = components[SurferComponentName].get(surferEntity);
      const matterBody = components[MatterBodyComponentName].get(surferEntity);
      const positionComponent =
        components[PositionComponentName].get(surferEntity);

      if (!surferComponent || !matterBody || !positionComponent) {
        return;
      }

      // Check if this surfer needs initial setup
      const needsInitialSetup = !surferComponent.isPhysicsInitialized;

      if (needsInitialSetup) {
        // Initialize the initialX position from the current position
        const currentX = matterBody.position.x;

        ecs.updateComponent<SurferComponentData>(
          surferEntity,
          SurferComponentName,
          (surfer) => {
            surfer.initialX = currentX;
            surfer.isPhysicsInitialized = true;
            // Initialize stateData if not present
            if (!surfer.stateData) {
              surfer.stateData = {
                state: SurferArcadeState.STABLE_SURFING,
                timeInStateMs: 0,
                rotationsCompleted: 0,
                currentRotationRad: 0,
                launchPower: 0,
                targetRotations: null,
                lastLandingWasPerfect: false,
                scorePending: 0,
              };
            }
          }
        );
        // Refresh component reference after initialization
        surferComponent = components[SurferComponentName].get(surferEntity);
      }

      // Get or initialize stateData
      let surferStateData = surferComponent.stateData;
      if (!surferStateData) {
        // Initialize default state if not present
        surferStateData = {
          state: SurferArcadeState.STABLE_SURFING,
          timeInStateMs: 0,
          rotationsCompleted: 0,
          currentRotationRad: 0,
          launchPower: 0,
          targetRotations: null,
          lastLandingWasPerfect: false,
          scorePending: 0,
        };
        // Save it to the component
        ecs.updateComponent<SurferComponentData>(
          surferEntity,
          SurferComponentName,
          (surfer) => {
            surfer.stateData = surferStateData;
          }
        );
      }

      // Create setter function for stateData
      const setSurferStateData = (data: SurferStateData) => {
        ecs.updateComponent<SurferComponentData>(
          surferEntity,
          SurferComponentName,
          (surfer) => {
            surfer.stateData = data;
          }
        );
      };

      // Apply platformer-style physics
      applyPlatformerSurferPhysics(
        matterBody,
        centeredSeaLayer,
        deltaTime,
        surferComponent.initialX,
        needsInitialSetup,
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
        },
        (position: { x: number; y: number }) => {
          // Set body position (used for x position locking)
          if (typeof global.MatterReanimated !== 'undefined') {
            global.MatterReanimated.Body.setPosition(matterBody, position);
          }
        },
        (property: string, value: any) => {
          // Update Matter.js body properties
          if (typeof global.MatterReanimated !== 'undefined') {
            global.MatterReanimated.Body.set(matterBody, property, value);
          }
        },
        surferStateData,
        setSurferStateData,
        eventQueue
      );

      // Update position component to reflect Matter.js body position
      ecs.updateComponent<PositionComponentData>(
        surferEntity,
        PositionComponentName,
        (pos) => {
          pos.x = matterBody.position.x;
          pos.y = matterBody.position.y;
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
        },
        surferStateData
      );
    });
  },
};
