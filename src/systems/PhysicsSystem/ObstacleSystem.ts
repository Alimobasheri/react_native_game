import {
  System,
} from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  ShapeTypes,
  createRenderComponent,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { ObstacleComponentName } from '@/Game/ecs-components/ObstacleComponent';
import { ContainerComponentName, ContainerComponentData } from '@/Game/ecs-components/Container';
import { WaterComponentName, WaterComponentData } from '@/Game/ecs-components/Water';
import { SwimmerComponentName, SwimmerComponentData } from '@/Game/ecs-components/Swimmer';
import { createObstacleComponent, ObstacleTypes } from '@/Game/ecs-components/ObstacleComponent';
import { getGridPosition, getObstacleWidth, getRows, LAYOUT_CONSTANTS } from '@/Layout';
import { MatterBodyComponentName } from '@/containers/ReactNativeSkiaGameEngine/internal/components/matterBody';
import { SceneComponentData, SceneComponentName } from '@/containers/ReactNativeSkiaGameEngine/internal/components/scene';
import { ObstaclesManagerComponentData, ObstaclesManagerComponentName } from '@/Game/ecs-components/ObstaclesManager';
import {
  RemoveEntityRequest,
  RemoveEntityRequestType,
} from '@/containers/ReactNativeSkiaGameEngine/internal/events/entity';

const OBSTACLE_BLOCK_IMAGES = ['block2', 'block3'] as const;

function getRandomBlockImage(): string {
  'worklet';
  return OBSTACLE_BLOCK_IMAGES[Math.floor(Math.random() * OBSTACLE_BLOCK_IMAGES.length)];
}

const COLLISION = {
  containerBoundaryCategory: 0x0002,
  swimmerCategory: 0x0004,
  obstacleCategory: 0x0008,
} as const;

function spawnObstacleEntity(args: {
  ecs: any;
  sceneEntity: number;
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  'worklet';
  if (!global._RNTGE_?.physics) return;
  if (typeof global.MatterReanimated === 'undefined') return;

  const { ecs, sceneEntity, x, y, width, height } = args;

  const entity = ecs.value.createEntity();

  const obstacleComponent = createObstacleComponent({
    type: ObstacleTypes.Stone,
    width,
    height,
    initialPosition: { x, y },
  });

  const renderComponent = createRenderComponent({
    shape: {
      type: ShapeTypes.Rectangle,
      width,
      height,
    },
    image: getRandomBlockImage(),
    visible: true,
    // Render obstacles behind water and swimmer but above background/container interior
    zIndex: 1,
  });

  ecs.value.addComponent(entity, obstacleComponent);
  ecs.value.addComponent(entity, renderComponent);

  const body = global.MatterReanimated.Bodies.rectangle(x, y, width, height, {
    isStatic: true,
    inertia: Infinity,
    restitution: 0,
    friction: 0,
    frictionStatic: 0,
    frictionAir: 0,
    collisionFilter: {
      group: 0x0000,
      category: COLLISION.obstacleCategory,
      mask: COLLISION.containerBoundaryCategory | COLLISION.swimmerCategory,
    },
  });

  global.MatterReanimated.Composite.add(global._RNTGE_.physics.engine.world, [
    body,
  ]);

  ecs.value.addComponent(entity, {
    name: MatterBodyComponentName,
    data: body,
  });

  ecs.value.updateComponent(
    sceneEntity,
    SceneComponentName,
    (scene: SceneComponentData) => {
      scene.objects.entities.push(entity);
      scene.objects.matterBodies.push(body.id);
    }
  );
}

/**
 * ObstacleSystem - Manages obstacle spawning, movement, and removal for the swimmer game
 *
 * This system:
 * - Seeds 5-7 initial obstacles when none exist (above container top to ~30% from top)
 * - Moves obstacles downward at water speed (raisingSpeed) every frame
 * - Spawns new obstacles over time based on row intervals when not seeding
 * - Removes obstacles that pass below the container bottom
 * - Uses row-based positioning with random row selection and spacing for gameplay balance
 */
export const ObstacleSystem: System = {
  requiredComponents: [ObstaclesManagerComponentName],
  process: ({ entities, components, deltaTime, ecs, eventQueue }) => {
    'worklet';

    const managerEntity = entities[0];
    const managerData = components[ObstaclesManagerComponentName]?.get(
      managerEntity
    ) as ObstaclesManagerComponentData | undefined;

    if (!managerData) return;

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
      MatterBodyComponentName,
    ]);

    // Find the lowest obstacle (highest y value)
    let lowestObstacleY = -Infinity;
    obstacleEntities.forEach((obstacleEntity) => {
      const body = components[MatterBodyComponentName]?.get(obstacleEntity);
      const y = body?.position?.y;
      if (typeof y === 'number' && y > lowestObstacleY) lowestObstacleY = y;
    });

    // Handle obstacle movement based on game phase
    obstacleEntities.forEach((obstacleEntity) => {
      const body = components[MatterBodyComponentName]?.get(obstacleEntity);
      if (!body) return;

      let newY = body.position.y;

      if (!isInInitialPhase) {
        // Post-initial phase: Move obstacles down at water raising speed
        newY = body.position.y + waterData.raisingSpeed * deltaSeconds;
      }
      // During initial phase: obstacles stay locked in position

      // Remove obstacles that have passed 100% screen height (fully out of view)
      if (newY > containerBottom + LAYOUT_CONSTANTS.REMOVAL_THRESHOLD_OFFSET) {
        const removeRequest: RemoveEntityRequest = {
          type: RemoveEntityRequestType,
          payload: { entityId: obstacleEntity, sceneKey: managerData.sceneKey },
        };
        eventQueue.addEvent(removeRequest);
        return;
      }

      if (!isInInitialPhase && typeof global.MatterReanimated !== 'undefined') {
        global.MatterReanimated.Body.setPosition(body, {
          x: body.position.x,
          y: newY,
        });
      }
    });

    // Seed initial obstacles when none exist (either during initial phase or when starting with water at center)
    const shouldSeedInitialObstacles = obstacleEntities.length === 0;

    // Locate the scene entity for this manager
    const sceneEntities = ecs.value.getEntitiesWithComponents([
      SceneComponentName,
    ]);
    const sceneEntity = sceneEntities.find((e: number) => {
      const data = components[SceneComponentName]?.get(e) as
        | SceneComponentData
        | undefined;
      return data?.sceneKey === managerData.sceneKey;
    });

    if (typeof sceneEntity !== 'number') return;

    if (shouldSeedInitialObstacles) {
      // Generate 5-7 initial obstacles spanning above container top to ~30% from top (above water at center)
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

        spawnObstacleEntity({
          ecs,
          sceneEntity,
          x,
          y,
          width: obstacleWidth,
          height: obstacleWidth,
        });
      }
      // Reset timer after re-seeding
      ecs.value.updateComponent<ObstaclesManagerComponentData>(
        managerEntity,
        ObstaclesManagerComponentName,
        (m) => {
          m.spawnTimerSeconds = 0;
        }
      );
    } else if (!isInInitialPhase) {
      // Post-initial phase: Time-based spawning based on obstacle movement distance
      const obstacleWidth = getObstacleWidth(containerData.width);
      const rowHeight = obstacleWidth; // Assuming square obstacles, row height equals obstacle width

      // Calculate how far obstacles should move in one "row interval"
      const distancePerRow = rowHeight;
      const timePerRow = distancePerRow / waterData.raisingSpeed; // Time to move one row at current speed

      // Advance timer in ECS (no global storage)
      ecs.value.updateComponent<ObstaclesManagerComponentData>(
        managerEntity,
        ObstaclesManagerComponentName,
        (m) => {
          m.spawnTimerSeconds += deltaSeconds;
        }
      );

      // Spawn new obstacles when timer exceeds time for one row
      const updatedManager = components[ObstaclesManagerComponentName]?.get(
        managerEntity
      ) as ObstaclesManagerComponentData | undefined;
      if ((updatedManager?.spawnTimerSeconds ?? 0) >= timePerRow) {
        ecs.value.updateComponent<ObstaclesManagerComponentData>(
          managerEntity,
          ObstaclesManagerComponentName,
          (m) => {
            m.spawnTimerSeconds = 0;
          }
        );

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

          spawnObstacleEntity({
            ecs,
            sceneEntity,
            x: gridPos.x,
            y,
            width: obstacleWidth,
            height: obstacleWidth,
          });
        }
      }
    }
  },
};