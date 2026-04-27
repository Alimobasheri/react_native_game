import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  ShapeTypes,
  createRenderComponent,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { ObstacleComponentData, ObstacleComponentName } from '@/Game/ecs-components/ObstacleComponent';
import {
  ContainerComponentName,
  ContainerComponentData,
} from '@/Game/ecs-components/Container';
import {
  WaterComponentName,
  WaterComponentData,
} from '@/Game/ecs-components/Water';
import {
  SwimmerComponentName,
  SwimmerComponentData,
} from '@/Game/ecs-components/Swimmer';
import {
  createObstacleComponent,
  ObstacleTypes,
} from '@/Game/ecs-components/ObstacleComponent';
import {
  getGridPosition,
  getObstacleWidth,
  getRows,
  LAYOUT_CONSTANTS,
} from '@/Layout';
import { MatterBodyComponentData, MatterBodyComponentName } from '@/containers/ReactNativeSkiaGameEngine/internal/components/matterBody';
import {
  SceneComponentData,
  SceneComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/scene';
import {
  ObstaclesManagerComponentData,
  ObstaclesManagerComponentName,
} from '@/Game/ecs-components/ObstaclesManager';
import {
  RemoveEntityBatchRequest,
  RemoveEntityBatchRequestType,
  RemoveEntityRequest,
  RemoveEntityRequestType,
} from '@/containers/ReactNativeSkiaGameEngine/internal/events/entity';
import { createObstacleRowComponent, ObstacleRowComponentData, ObstacleRowComponentName } from '@/Game/ecs-components/ObstacleRowComponent';
import { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import { TextHeightBehavior } from '@shopify/react-native-skia';
import { RowPathTemplate } from '@/Game/ecs-systems/obstacleSystem';

const OBSTACLE_BLOCK_IMAGES = ['block2', 'block3'] as const;

function getRandomBlockImage(): string {
  'worklet';
  return OBSTACLE_BLOCK_IMAGES[
    Math.floor(Math.random() * OBSTACLE_BLOCK_IMAGES.length)
  ];
}

const COLLISION = {
  containerBoundaryCategory: 0x0002,
  swimmerCategory: 0x0004,
  obstacleCategory: 0x0008,
} as const;

function spawnObstacleEntity(args: {
  ecs: ECS;
  sceneEntity: number;
  x: number;
  y: number;
  width: number;
  height: number;
}): Entity | null {
  'worklet';
  if (!global._RNTGE_?.physics) return null;
  if (typeof global.MatterReanimated === 'undefined') return null;

  const { ecs, sceneEntity, x, y, width: argsWidth, height: argsHeight } = args;

  let width = argsWidth * 1.05
  let height = argsHeight * 1.05

  const entity = ecs.createEntity();

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
    zIndex: 2,
  });

  ecs.addComponent(entity, obstacleComponent);
  ecs.addComponent(entity, renderComponent);

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

  ecs.addComponent(entity, {
    name: MatterBodyComponentName,
    data: body,
  });

  ecs.updateComponent(
    sceneEntity,
    SceneComponentName,
    (scene: SceneComponentData) => {
      scene.objects.entities.push(entity);
      scene.objects.matterBodies.push(body.id);
    }
  );

  return entity
}

const generateGaps = (prevGaps: number[], rowLength: number): number[] => {
  'worklet'
  if (prevGaps.length === 0) {
    return [Math.floor(rowLength / 2)]
  } else {
    let nextGaps: number[] = []
    const newDir = Math.random() > 0.5 ? 'left' : 'right'
    if (newDir === 'left') {
      let leftMostGap = Math.min(...prevGaps)
      if (leftMostGap > 0) nextGaps.push(leftMostGap - 1)
      nextGaps.push(leftMostGap)
      if (leftMostGap < rowLength - 1) nextGaps.push(leftMostGap + 1)
    } else {
      let rightMostGap = Math.max(...prevGaps)
      if (rightMostGap < rowLength - 1) nextGaps.push(rightMostGap + 1)
      nextGaps.push(rightMostGap)
      if (rightMostGap > 0) nextGaps.push(rightMostGap - 1)
    }
    return nextGaps
  }
}

const generateObstacles = ({ gaps, rowLength, y, leftX, obstacleDimension }: {
  rowIndex: number,
  gaps: number[],
  rowLength: number,
  y: number,
  leftX: number,
  obstacleDimension: { width: number, height: number }
}): ObstacleComponentData[] => {
  'worklet'
  let obstacles: ObstacleComponentData[] = []
  for (let i = 0; i < rowLength; i++) {
    if (!gaps.includes(i)) {
      obstacles.push({
        initialPosition: { y: y, x: leftX + (i + 1) * obstacleDimension.width - obstacleDimension.width / 2 },
        type: ObstacleTypes.Stone,
        width: obstacleDimension.width,
        height: obstacleDimension.height
      })
    }
  }
  return obstacles
}

const createObstacleRow: RowPathTemplate['getRow'] = ({ rowIndex, ecs, sceneEntity, prevRow, prevRowEntity, initialY, rowLength, leftX, obstacleDimension }) => {
  'worklet';
  let gaps: number[] = []
  gaps = generateGaps(!prevRow ? [] : prevRow.gaps, rowLength)
  const obstacleDatas = generateObstacles({
    rowIndex,
    gaps,
    y: !prevRow ? initialY : prevRow.y - obstacleDimension.height,
    rowLength,
    leftX,
    obstacleDimension
  })
  let obstacleEntities: Entity[] = []
  for (let i = 0; i < obstacleDatas.length; i++) {
    const entity = spawnObstacleEntity({
      ecs,
      sceneEntity,
      x: obstacleDatas[i].initialPosition.x,
      y: obstacleDatas[i].initialPosition.y,
      width: obstacleDatas[i].width,
      height: obstacleDatas[i].height
    })
    if (entity !== null) obstacleEntities.push(entity)
  }
  const obstacleRowComp = createObstacleRowComponent({
    y: !prevRow ? initialY : prevRow.y - obstacleDimension.height,
    gaps,
    obstacles: obstacleEntities,
    prevRowEntity
  })
  const obstacleRowEntity = ecs.createEntity()
  ecs.addComponent(obstacleRowEntity, obstacleRowComp)
  ecs.updateComponent(
    sceneEntity,
    SceneComponentName,
    (scene: SceneComponentData) => {
      if (!scene.objects.entities.includes(obstacleRowEntity)) {
        scene.objects.entities.push(obstacleRowEntity);
      }
    }
  );

  return obstacleRowEntity
}

const getRowCount: RowPathTemplate['getRowCount'] = () => {
  'worklet'
  return 10 + Math.round(Math.random() * (10 - 1))
}

const BaseRowPathTemplate: RowPathTemplate = {
  getRowCount,
  getRow: createObstacleRow,
}

const restGetRowCount: RowPathTemplate['getRowCount'] = () => {
  'worklet'
  return 5 + Math.round(Math.random() * (5 - 1))
}

const restGenerateObstacles = ({ gaps, rowLength, y, leftX, obstacleDimension }: {
  rowIndex: number,
  gaps: number[],
  rowLength: number,
  y: number,
  leftX: number,
  obstacleDimension: { width: number, height: number }
}): ObstacleComponentData[] => {
  'worklet'
  let obstacles: ObstacleComponentData[] = []
  Array.from([0, rowLength - 1]).map(i => {
    obstacles.push({
      initialPosition: { y: y, x: leftX + (i + 1) * obstacleDimension.width - obstacleDimension.width / 2 },
      type: ObstacleTypes.Stone,
      width: obstacleDimension.width,
      height: obstacleDimension.height
    })
  })
  return obstacles
}


const restGetRow: RowPathTemplate['getRow'] = (params) => {
  'worklet'
  const { ecs, prevRow, initialY, obstacleDimension, prevRowEntity, rowLength, sceneEntity } = params
  const obstaclesIndexes = restGenerateObstacles({ ...params, y: !prevRow ? initialY : prevRow.y - obstacleDimension.height, gaps: [] })
  let obstacleEntities: Entity[] = []
  for (let i = 0; i < obstaclesIndexes.length; i++) {
    const entity = spawnObstacleEntity({
      ecs,
      sceneEntity,
      x: obstaclesIndexes[i].initialPosition.x,
      y: obstaclesIndexes[i].initialPosition.y,
      width: obstaclesIndexes[i].width,
      height: obstaclesIndexes[i].height
    })
    if (entity !== null) obstacleEntities.push(entity)
  }
  const obstacleRowComp = createObstacleRowComponent({
    y: !prevRow ? initialY : prevRow.y - obstacleDimension.height,
    gaps: [],
    obstacles: obstacleEntities,
    prevRowEntity
  })
  const obstacleRowEntity = ecs.createEntity()
  ecs.addComponent(obstacleRowEntity, obstacleRowComp)
  ecs.updateComponent(
    sceneEntity,
    SceneComponentName,
    (scene: SceneComponentData) => {
      if (!scene.objects.entities.includes(obstacleRowEntity)) {
        scene.objects.entities.push(obstacleRowEntity);
      }
    }
  );

  return obstacleRowEntity
}

const RestRowPathTemplate: RowPathTemplate = {
  getRowCount: restGetRowCount,
  getRow: restGetRow
}

const MappedTemplates: Record<string, RowPathTemplate> = {
  'base': BaseRowPathTemplate,
  'rest': RestRowPathTemplate
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
  name: 'obstacleSystem',
  requiredComponents: [ObstaclesManagerComponentName],
  process: ({ entities, components, deltaTime, ecs, eventQueue, dimensions }) => {
    'worklet';

    const managerEntity = entities[0];
    const managerData = components[ObstaclesManagerComponentName]?.get(
      managerEntity
    ) as ObstaclesManagerComponentData | undefined;

    if (!managerData) return;

    // Get container entity
    const containerEntities = ecs.getEntitiesWithComponents([
      ContainerComponentName,
    ]);

    if (containerEntities.length === 0) {
      return; // No container, nothing to do
    }

    const containerEntity = containerEntities[0];
    const containerData = components[ContainerComponentName]?.get(
      containerEntity
    ) as ContainerComponentData | undefined;

    if (!containerData) {
      return;
    }

    // Get water entity and data (for movement speed)
    const waterEntities = ecs.getEntitiesWithComponents([
      WaterComponentName,
    ]);

    if (waterEntities.length === 0) {
      return; // No water, nothing to do
    }

    const waterEntity = waterEntities[0];
    const waterData = components[WaterComponentName]?.get(waterEntity) as
      | WaterComponentData
      | undefined;

    if (!waterData) {
      return;
    }

    const deltaSeconds = deltaTime / 1000;
    const containerTop = containerData.centerY - containerData.height / 2;
    const containerBottom = containerData.centerY + containerData.height / 2;

    // Determine if we're in initial phase (water rising)
    const swimmerEntities = ecs.getEntitiesWithComponents([
      SwimmerComponentName,
    ]);
    const isInInitialPhase =
      swimmerEntities.length > 0 &&
      (
        components[SwimmerComponentName]?.get(swimmerEntities[0]) as
        | SwimmerComponentData
        | undefined
      )?.isInInitialPhase === true;

    // Locate the scene entity for this manager
    const sceneEntities = ecs.getEntitiesWithComponents([
      SceneComponentName,
    ]);
    const sceneEntity = sceneEntities.find((e: number) => {
      const data = components[SceneComponentName]?.get(e) as
        | SceneComponentData
        | undefined;
      return data?.sceneKey === managerData.sceneKey;
    });

    const deltaY = waterData.raisingSpeed * deltaSeconds;

    if (typeof sceneEntity !== 'number') return;

    const maxY = containerTop + containerData.height * 0.3; // 30% from top

    const leftX = containerData.centerX -
      containerData.width / 2
    const columnWidth = getObstacleWidth(containerData.width);
    const obstacleRowEntities = ecs.getEntitiesWithComponents([ObstacleRowComponentName])
    const waterSurfaceY = containerData.waterSurfaceY;
    const currentCenterRowEntity = waterData.centerRowEntity;
    // Lock slightly ahead of the visible surface so the water can start reacting
    // as a row enters the flow band, not after it is already centered.
    const lockAheadY = waterSurfaceY - columnWidth * 0.42;
    // Transition target is even higher to begin cross-row shaping before center alignment.
    const transitionTargetY = lockAheadY - columnWidth * 0.42;
    let nearestRowEntity: number | undefined;
    let nearestRowDistance = Number.POSITIVE_INFINITY;
    let nearestOverlapRowEntity: number | undefined;
    let nearestOverlapDistance = Number.POSITIVE_INFINITY;
    let currentRowDistance = Number.POSITIVE_INFINITY;
    obstacleRowEntities.forEach((obstacleRowEntity) => {
      const rowData = components[ObstacleRowComponentName].get(obstacleRowEntity) as ObstacleRowComponentData | undefined
      if (!rowData) return

      let newY = rowData.y + deltaY

      if (newY > containerBottom + LAYOUT_CONSTANTS.REMOVAL_THRESHOLD_OFFSET) {
        const removeRequest: RemoveEntityBatchRequest = {
          type: RemoveEntityBatchRequestType,
          payload: { entityIds: [obstacleRowEntity, ...rowData.obstacles], sceneKey: managerData.sceneKey },
        };
        eventQueue.addEvent(removeRequest);
        return;
      } else {
        ecs.updateComponent<ObstacleRowComponentData>(obstacleRowEntity, ObstacleRowComponentName, (rowData) => {
          rowData.y = newY
        })
        const rowTop = newY - columnWidth / 2;
        const rowBottom = newY + columnWidth / 2;
        const rowCenterDistance = Math.abs(newY - transitionTargetY);
        const overlapsTransitionBand =
          transitionTargetY >= rowTop && transitionTargetY <= rowBottom + columnWidth * 0.42;
        if (overlapsTransitionBand && rowCenterDistance < nearestOverlapDistance) {
          nearestOverlapDistance = rowCenterDistance;
          nearestOverlapRowEntity = obstacleRowEntity;
        }
        if (rowCenterDistance < nearestRowDistance) {
          nearestRowDistance = rowCenterDistance;
          nearestRowEntity = obstacleRowEntity;
        }
        if (obstacleRowEntity === currentCenterRowEntity) {
          currentRowDistance = rowCenterDistance;
        }
        rowData.obstacles.forEach((oEnt) => {
          const body = components[MatterBodyComponentName].get(oEnt) as MatterBodyComponentData | undefined

          if (body) {
            global.MatterReanimated.Body.setPosition(body as Matter.Body, {
              x: body.position?.x || 0,
              y: newY,
            });
          }
        })
      }
    })
    const candidateCenterRowEntity = nearestOverlapRowEntity ?? nearestRowEntity;
    let centerRowEntity = candidateCenterRowEntity;
    if (
      typeof currentCenterRowEntity === 'number' &&
      Number.isFinite(currentRowDistance)
    ) {
      const holdDistance = columnWidth * 0.62;
      const switchAdvantage = columnWidth * 0.18;
      const candidateDistance =
        typeof candidateCenterRowEntity === 'number'
          ? (candidateCenterRowEntity === nearestOverlapRowEntity
            ? nearestOverlapDistance
            : nearestRowDistance)
          : Number.POSITIVE_INFINITY;
      const shouldHoldCurrent =
        currentRowDistance <= holdDistance &&
        candidateDistance + switchAdvantage >= currentRowDistance;
      if (shouldHoldCurrent) {
        centerRowEntity = currentCenterRowEntity;
      }
    }
    if (typeof centerRowEntity === 'number') {
      ecs.updateComponent<WaterComponentData>(waterEntity, WaterComponentName, (waterData) => {
        waterData.centerRowEntity = centerRowEntity;
      });
    }

    // Seed initial obstacles when none exist (either during initial phase or when starting with water at center)
    const shouldSeedInitialObstacles = obstacleRowEntities.length === 0;

    if (shouldSeedInitialObstacles) {
      let lastRowEntity: Entity | null = null

      let template = BaseRowPathTemplate

      const numInitialRows = BaseRowPathTemplate.getRowCount()

      const rowsInDisplay = Math.ceil((maxY - columnWidth) / columnWidth) + 1

      for (let i = 0; i < rowsInDisplay; i++) {
        const prevRow = lastRowEntity ? ecs.components[ObstacleRowComponentName].get(lastRowEntity) as ObstacleRowComponentData : null
        lastRowEntity = template.getRow({
          rowIndex: i,
          ecs,
          sceneEntity,
          prevRow,
          prevRowEntity: lastRowEntity,
          initialY: maxY,
          rowLength: LAYOUT_CONSTANTS.COLUMNS,
          leftX,
          obstacleDimension: {
            width: columnWidth,
            height: columnWidth
          }
        })
      }
      // Reset timer after re-seeding
      ecs.updateComponent<ObstaclesManagerComponentData>(
        managerEntity,
        ObstaclesManagerComponentName,
        (m) => {
          m.spawnTimerSeconds = 0;
          m.templateInfo = {
            currentTemplateName: 'base',
            currentTempalteTotalRow: numInitialRows,
            currentRowIndex: rowsInDisplay,
            lastRowEntity: lastRowEntity
          }
        }
      );
    } else if (!isInInitialPhase) {
      // Post-initial phase: Time-based spawning based on obstacle movement distance
      const obstacleWidth = getObstacleWidth(containerData.width);
      const rowHeight = obstacleWidth; // Assuming square obstacles, row height equals obstacle width

      // Calculate how far obstacles should move in one "row interval"
      const distancePerRow = rowHeight;
      const timePerRow = distancePerRow / waterData.raisingSpeed; // Time to move one row at current speed

      ecs.updateComponent<ObstaclesManagerComponentData>(
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
      let lastRowEnt = updatedManager?.templateInfo?.lastRowEntity
      const lastRowData = lastRowEnt ? components[ObstacleRowComponentName].get(lastRowEnt) as ObstacleRowComponentData : null

      if (lastRowData && lastRowData.y > (- columnWidth) && updatedManager?.templateInfo) {
        ecs.updateComponent<ObstaclesManagerComponentData>(
          managerEntity,
          ObstaclesManagerComponentName,
          (m) => {
            m.spawnTimerSeconds = 0;
          }
        );
        const templateInfo = updatedManager.templateInfo

        const template = MappedTemplates[templateInfo.currentTemplateName]

        const lastRowEntinty = templateInfo.lastRowEntity

        let lastRowIndex = templateInfo.currentRowIndex
        let totalRow = templateInfo.currentTempalteTotalRow

        if (lastRowIndex > totalRow - 1) {
          const tempalteNames = Object.keys(MappedTemplates)
          let newTemplateRandIndex = Math.round(Math.random() * (tempalteNames.length - 1))

          let newTemplateName = tempalteNames[newTemplateRandIndex]
          let newTemplate = MappedTemplates[newTemplateName]
          let newRowCount = newTemplate.getRowCount()
          const prevRow = templateInfo.lastRowEntity ? ecs.components[ObstacleRowComponentName].get(templateInfo.lastRowEntity) as ObstacleRowComponentData : null

          let newRowEntity = newTemplate.getRow({
            rowIndex: 0,
            ecs,
            sceneEntity,
            prevRow: prevRow,
            prevRowEntity: templateInfo.lastRowEntity,
            initialY: maxY,
            rowLength: LAYOUT_CONSTANTS.COLUMNS,
            leftX,
            obstacleDimension: {
              width: columnWidth,
              height: columnWidth
            }
          })
          // Reset timer after re-seeding
          ecs.updateComponent<ObstaclesManagerComponentData>(
            managerEntity,
            ObstaclesManagerComponentName,
            (m) => {
              m.templateInfo = {
                currentTemplateName: newTemplateName,
                currentTempalteTotalRow: newRowCount,
                currentRowIndex: 0,
                lastRowEntity: newRowEntity
              }
            }
          );
        } else if (updatedManager.templateInfo) {
          const prevRow = templateInfo.lastRowEntity ? ecs.components[ObstacleRowComponentName].get(templateInfo.lastRowEntity) as ObstacleRowComponentData : null

          let newRowEntity = template.getRow({
            rowIndex: 0,
            ecs,
            sceneEntity,
            prevRow: prevRow,
            prevRowEntity: templateInfo.lastRowEntity,
            initialY: maxY,
            rowLength: LAYOUT_CONSTANTS.COLUMNS,
            leftX,
            obstacleDimension: {
              width: columnWidth,
              height: columnWidth
            }
          })

          ecs.updateComponent<ObstaclesManagerComponentData>(
            managerEntity,
            ObstaclesManagerComponentName,
            (m) => {
              if (updatedManager.templateInfo) {
                m.templateInfo = {
                  ...updatedManager.templateInfo,
                  currentRowIndex: (updatedManager.templateInfo.currentRowIndex || 0) + 1,
                  lastRowEntity: newRowEntity
                }
              }

            })

        }

        //     // Generate 1-2 new obstacles with row-based spacing for gameplay
        //     const numNewObstacles = Math.floor(Math.random() * 2) + 1;

        //     // Row-based obstacle placement for better gameplay spacing
        //     const obstacleWidth = getObstacleWidth(containerData.width);
        //     const totalRows = getRows(containerData.height, obstacleWidth);

        //     // Determine target row for new obstacles (above current obstacles)
        //     const targetRow = Math.max(
        //       0,
        //       Math.floor((lowestObstacleY - containerTop) / obstacleWidth) - 1
        //     );

        //     for (let i = 0; i < numNewObstacles; i++) {
        //       // Random row selection with spacing (leave gaps between rows)
        //       let selectedRow;
        //       const rowSpacingChance = Math.random();

        //       if (rowSpacingChance < 0.5) {
        //         // 50% chance: place in target row or adjacent (can create vertical stacks)
        //         const rowOffset = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
        //         selectedRow = Math.max(
        //           0,
        //           Math.min(totalRows - 1, targetRow + rowOffset)
        //         );
        //       } else {
        //         // 50% chance: skip rows to create vertical gaps
        //         const rowSkip = Math.floor(Math.random() * 3) + 1; // Skip 1-3 rows
        //         selectedRow = Math.max(0, targetRow - rowSkip);
        //       }

        //       // Random column selection (independent of row logic)
        //       const column = Math.floor(Math.random() * LAYOUT_CONSTANTS.COLUMNS);

        //       // Use grid position based on selected row and column
        //       const gridPos = getGridPosition(
        //         column,
        //         selectedRow,
        //         containerData.centerX,
        //         containerData.centerY,
        //         containerData.width,
        //         containerData.height
        //       );

        //       // Fine-tune y position to ensure it's above existing obstacles and preferably y < 0
        //       let y = gridPos.y;
        //       if (y > lowestObstacleY - obstacleWidth) {
        //         // Adjust to be above lowest obstacle
        //         y = lowestObstacleY - obstacleWidth * (1 + Math.random() * 0.5); // Random offset
        //       }
        //       // Ensure y < 0 for buffer
        //       y = Math.min(y, -10);

        //       spawnObstacleEntity({
        //         ecs,
        //         sceneEntity,
        //         x: gridPos.x,
        //         y,
        //         width: obstacleWidth,
        //         height: obstacleWidth,
        //       });
        //     }
        //   }
      }
    }
  },
};
