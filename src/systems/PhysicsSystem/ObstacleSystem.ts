import {
  System,
} from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  RenderComponentData,
  RenderComponentName,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { ObstacleComponentName } from '@/Game/ecs-components/ObstacleComponent';
import { ContainerComponentName, ContainerComponentData } from '@/Game/ecs-components/Container';
import { WaterComponentName, WaterComponentData } from '@/Game/ecs-components/Water';
import { SwimmerComponentName, SwimmerComponentData } from '@/Game/ecs-components/Swimmer';
import {
  PositionComponentName,
  PositionComponentData,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/position';
import {
  CreateEntityRequest,
  CreateEntityRequestType,
  RemoveEntityRequest,
  RemoveEntityRequestType,
} from '@/containers/ReactNativeSkiaGameEngine/internal/events/entity';
import { createObstacleComponent, ObstacleTypes } from '@/Game/ecs-components/ObstacleComponent';
import { createRenderComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { createPositionComponent } from '@/containers/ReactNativeSkiaGameEngine/internal/components/position';
import { getGridPosition, getObstacleWidth, getRows, LAYOUT_CONSTANTS } from '@/Layout';

/**
 * ObstacleSystem - Manages obstacle spawning, movement, and removal for the swimmer game
 *
 * This system:
 * - During initial phase: Locks obstacle positions while water rises, positions obstacles between -5% to 30% of container height
 * - After initial phase: Moves obstacles downward using water raising speed, spawns new obstacles based on time intervals
 * - Removes obstacles that pass 100% screen height
 * - Uses row-based positioning with random row selection and spacing for gameplay balance
 */
export const ObstacleSystem: System = {
  requiredComponents: [], // Process all entities, we'll query for specific components
  process: ({ entities, components, deltaTime, ecs, eventQueue, dimensions }) => {
    'worklet';

    // Get container entity
    const containerEntities = ecs.value.getEntitiesWithComponents([
      ContainerComponentName,
    ]);

    if (containerEntities.length === 0) {
      return; // No container, nothing to do
    }

    const containerEntity = containerEntities[0];
    const containerData = components[ContainerComponentName]?.get(containerEntity) as ContainerComponentData | undefined;

    if (!containerData) {
      return;
    }

    // Get water entity and data (for movement speed)
    const waterEntities = ecs.value.getEntitiesWithComponents([
      WaterComponentName,
    ]);

    if (waterEntities.length === 0) {
      return; // No water, nothing to do
    }

    const waterEntity = waterEntities[0];
    const waterData = components[WaterComponentName]?.get(waterEntity) as WaterComponentData | undefined;

    if (!waterData) {
      return;
    }

    const deltaSeconds = deltaTime / 1000;
    const containerTop = containerData.centerY - containerData.height / 2;
    const containerBottom = containerData.centerY + containerData.height / 2;

    // Determine if we're in initial phase (water rising)
    const swimmerEntities = ecs.value.getEntitiesWithComponents([
      SwimmerComponentName,
    ]);
    const isInInitialPhase = swimmerEntities.length > 0 &&
      (components[SwimmerComponentName]?.get(swimmerEntities[0]) as SwimmerComponentData | undefined)?.isInInitialPhase === true;

    // Get all existing obstacles
    const obstacleEntities = ecs.value.getEntitiesWithComponents([
      ObstacleComponentName,
      PositionComponentName,
    ]);

    // Find the lowest obstacle (highest y value)
    let lowestObstacleY = -Infinity;
    obstacleEntities.forEach((obstacleEntity) => {
      const positionComponent = components[PositionComponentName]?.get(obstacleEntity);
      if (positionComponent && positionComponent.y > lowestObstacleY) {
        lowestObstacleY = positionComponent.y;
      }
    });

    // Handle obstacle movement based on game phase
    obstacleEntities.forEach((obstacleEntity) => {
      const positionComponent = components[PositionComponentName]?.get(obstacleEntity);

      if (!positionComponent) return;

      let newY = positionComponent.y;

      if (!isInInitialPhase) {
        // Post-initial phase: Move obstacles down at water raising speed
        newY = positionComponent.y + waterData.raisingSpeed * deltaSeconds;
      }
      // During initial phase: obstacles stay locked in position

      // Remove obstacles that have passed 100% screen height (fully out of view)
      if (newY > containerBottom + LAYOUT_CONSTANTS.REMOVAL_THRESHOLD_OFFSET) {
        const removeRequest: RemoveEntityRequest = {
          type: RemoveEntityRequestType,
          payload: {
            entityId: obstacleEntity,
          },
        };
        eventQueue.addEvent(removeRequest);
        return;
      }

      // Update position (only if changed)
      if (newY !== positionComponent.y) {
        ecs.value.updateComponent<PositionComponentData>(
          obstacleEntity,
          PositionComponentName,
          (pos) => {
            pos.y = newY;
          }
        );

        // Update render position as well
        ecs.value.updateComponent<RenderComponentData>(
          obstacleEntity,
          RenderComponentName,
          (render) => {
            if (!render.position) {
              render.position = { x: positionComponent.x, y: newY };
            } else {
              render.position.y = newY;
            }
          }
        );
      }
    });

    // Handle obstacle spawning based on game phase
    if (isInInitialPhase) {
      // Initial phase: Generate 5-7 initial obstacles spanning -150% to 30% of container height for wide vertical spread
      if (obstacleEntities.length === 0) {
        const obstacleWidth = getObstacleWidth(containerData.width);

        // Position initial obstacles spanning from -150% to 30% of container height
        const minY = containerTop - containerData.height * 1.50; // -150% (well above container top)
        const maxY = containerTop + containerData.height * 0.30; // 30% from top
        const yRange = maxY - minY;

        // Generate 5-7 initial obstacles spread across the wide vertical range
        const numInitialObstacles = Math.floor(Math.random() * 3) + 5; // 5-7 obstacles

        for (let i = 0; i < numInitialObstacles; i++) {
          // Distribute across columns, avoiding clustering
          const columnSpacing = Math.floor(LAYOUT_CONSTANTS.COLUMNS / Math.max(numInitialObstacles, 1));
          const column = (i * columnSpacing + Math.floor(Math.random() * 2)) % LAYOUT_CONSTANTS.COLUMNS; // Add small random offset

          // Get grid x position
          const columnWidth = containerData.width / LAYOUT_CONSTANTS.COLUMNS;
          const x = containerData.centerX - containerData.width / 2 + columnWidth * column + columnWidth / 2;

          // Distribute y positions with some randomness but ensuring good vertical spread
          // Use a biased distribution that puts more obstacles in playable areas
          let y;
          if (i < numInitialObstacles * 0.6) {
            // First 60%: spread in upper area (-150% to -30%)
            const upperRange = containerTop + containerData.height * 0.30 - minY;
            const upperStep = upperRange / (numInitialObstacles * 0.6 + 1);
            y = minY + (i + 1) * upperStep;
          } else {
            // Remaining 40%: spread in lower area (-30% to 30%)
            const lowerMin = containerTop - containerData.height * 0.30;
            const lowerMax = maxY;
            const lowerRange = lowerMax - lowerMin;
            const lowerIndex = i - Math.floor(numInitialObstacles * 0.6);
            const remainingCount = numInitialObstacles - Math.floor(numInitialObstacles * 0.6);
            const lowerStep = lowerRange / (remainingCount + 1);
            y = lowerMin + (lowerIndex + 1) * lowerStep;
          }

          // Add small random offset to prevent perfect alignment
          y += (Math.random() - 0.5) * obstacleWidth * 0.3;

          const obstaclePosition = { x, y };

          // Create obstacle components
          const obstacleComponent = createObstacleComponent({
            type: ObstacleTypes.Stone,
            width: obstacleWidth,
            height: obstacleWidth,
            initialPosition: obstaclePosition,
          });

          const positionComponent = createPositionComponent(obstaclePosition);

          const renderComponent = createRenderComponent({
            shape: {
              type: ShapeTypes.Rectangle,
              width: obstacleWidth,
              height: obstacleWidth,
            },
            position: obstaclePosition,
            fillColor: '#d32f2f',
            visible: true,
            zIndex: 2,
          });

          // Create the entity
          const createRequest: CreateEntityRequest = {
            type: CreateEntityRequestType,
            payload: {
              components: [obstacleComponent, positionComponent, renderComponent],
              sceneKey: 'swimmerGame',
            },
          };
          eventQueue.addEvent(createRequest);
        }
      }
      // During initial phase, obstacles stay locked - no additional spawning
    } else {
      // Post-initial phase: Time-based spawning based on obstacle movement distance
      // Use a static reference to track spawning timing (this will persist across frames)
      // @ts-ignore - Dynamic property on global object
      if (!global._RNTGE_.obstacleSpawnTimer) {
        // @ts-ignore - Dynamic property on global object
        global._RNTGE_.obstacleSpawnTimer = 0;
      }

      const obstacleWidth = getObstacleWidth(containerData.width);
      const rowHeight = obstacleWidth; // Assuming square obstacles, row height equals obstacle width

      // Calculate how far obstacles should move in one "row interval"
      const distancePerRow = rowHeight;
      const timePerRow = distancePerRow / waterData.raisingSpeed; // Time to move one row at current speed

      // @ts-ignore - Dynamic property on global object
      global._RNTGE_.obstacleSpawnTimer += deltaSeconds;

      // Spawn new obstacles when timer exceeds time for one row
      // @ts-ignore - Dynamic property on global object
      if (global._RNTGE_.obstacleSpawnTimer >= timePerRow) {
        // @ts-ignore - Dynamic property on global object
        global._RNTGE_.obstacleSpawnTimer = 0; // Reset timer

        // Generate 1-2 new obstacles with row-based spacing for gameplay
        const numNewObstacles = Math.floor(Math.random() * 2) + 1;

        // Row-based obstacle placement for better gameplay spacing
        const obstacleWidth = getObstacleWidth(containerData.width);
        const totalRows = getRows(containerData.height, obstacleWidth);

        // Determine target row for new obstacles (above current obstacles)
        const targetRow = Math.max(0, Math.floor((lowestObstacleY - containerTop) / obstacleWidth) - 1);

        for (let i = 0; i < numNewObstacles; i++) {
          // Random row selection with spacing (leave gaps between rows)
          let selectedRow;
          const rowSpacingChance = Math.random();

          if (rowSpacingChance < 0.5) {
            // 50% chance: place in target row or adjacent (can create vertical stacks)
            const rowOffset = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
            selectedRow = Math.max(0, Math.min(totalRows - 1, targetRow + rowOffset));
          } else {
            // 50% chance: skip rows to create vertical gaps
            const rowSkip = Math.floor(Math.random() * 3) + 1; // Skip 1-3 rows
            selectedRow = Math.max(0, targetRow - rowSkip);
          }

          // Random column selection (independent of row logic)
          const column = Math.floor(Math.random() * LAYOUT_CONSTANTS.COLUMNS);

          // Use grid position based on selected row and column
          const gridPos = getGridPosition(
            column,
            selectedRow,
            containerData.centerX,
            containerData.centerY,
            containerData.width,
            containerData.height
          );

          // Fine-tune y position to ensure it's above existing obstacles and preferably y < 0
          let y = gridPos.y;
          if (y > lowestObstacleY - obstacleWidth) {
            // Adjust to be above lowest obstacle
            y = lowestObstacleY - obstacleWidth * (1 + Math.random() * 0.5); // Random offset
          }
          // Ensure y < 0 for buffer
          y = Math.min(y, -10);

          const obstaclePosition = { x: gridPos.x, y };

          // Create obstacle components
          const obstacleComponent = createObstacleComponent({
            type: ObstacleTypes.Stone,
            width: obstacleWidth,
            height: obstacleWidth,
            initialPosition: obstaclePosition,
          });

          const positionComponent = createPositionComponent(obstaclePosition);

          const renderComponent = createRenderComponent({
            shape: {
              type: ShapeTypes.Rectangle,
              width: obstacleWidth,
              height: obstacleWidth,
            },
            position: obstaclePosition,
            fillColor: '#d32f2f',
            visible: true,
            zIndex: 2,
          });

          // Create the entity
          const createRequest: CreateEntityRequest = {
            type: CreateEntityRequestType,
            payload: {
              components: [obstacleComponent, positionComponent, renderComponent],
              sceneKey: 'swimmerGame',
            },
          };
          eventQueue.addEvent(createRequest);
        }
      }
    }
  },
};