import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  findSceneEntityByKey,
  firstDataFromStore,
} from '@/containers/ReactNativeSkiaGameEngine/services-ecs/query';
import type { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import {
  RenderComponentData,
  RenderComponentName,
  RenderSortTieBreaker,
  ShapeTypes,
  createWorldYSortedRenderComponent,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import {
  SceneComponentData,
  SceneComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/scene';
import {
  RemoveEntityBatchRequestType,
} from '@/containers/ReactNativeSkiaGameEngine/internal/events/entity';
import {
  ContainerComponentData,
  ContainerComponentName,
} from '@/Game/ecs-components/Container';
import {
  WaterComponentData,
  WaterComponentName,
} from '@/Game/ecs-components/Water';
import {
  ObstacleRowComponentData,
  ObstacleRowComponentName,
} from '@/Game/ecs-components/ObstacleRowComponent';
import {
  BlockFoamComponentData,
  BlockFoamComponentName,
  createBlockFoamComponent,
} from '@/Game/ecs-components/BlockFoam';
import { SwimmerRenderLayer } from '@/Game/render/swimmerRenderLayers';
import { collectBlockFoamContacts } from '@/Game/visual/blockFoamContacts';
import { buildBlockFoamRenderLayers, computeRowFoamSeed } from '@/Game/render/buildBlockFoamRenderLayers';
import {
  computeFoamContactLocalY,
  getFlatWaterBodyTopY,
} from '@/Game/water/flatWaterSurface';
import { blockFoamTuning, blockFoamGooeyMerge } from '@/config/blockFoamTuning';
import { getGameSession, isGameOverPhase, isStartReady } from '@/Game/session/gameSessionQuery';
import { LAYOUT_CONSTANTS } from '@/Layout';
import type { ComponentStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/component';
import { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';

const findRowAboveGaps = (
  rowStore: ComponentStore<ObstacleRowComponentData>,
  rowEntity: Entity
): number[] | null => {
  'worklet';
  let aboveGaps: number[] | null = null;
  rowStore.forEach((_otherEntity, otherRow) => {
    if (otherRow.prevRowEntity === rowEntity) {
      aboveGaps = otherRow.gaps;
    }
  });
  return aboveGaps;
};

const rowTouchesWater = (
  rowCenterY: number,
  blockHeight: number,
  waterSurfaceY: number
): boolean => {
  'worklet';
  const rowBottom = rowCenterY + blockHeight * 0.5;
  return rowBottom >= waterSurfaceY;
};

const applyFoamRenderLayers = (
  renderData: RenderComponentData,
  layers: ReturnType<typeof buildBlockFoamRenderLayers>,
  rowCenterX: number,
  rowY: number
): void => {
  'worklet';
  renderData.position = { x: rowCenterX, y: rowY };
  renderData.renderLayers = layers;
  renderData.visible = layers.length > 0;
  renderData.isDirty = true;
};

const addEntityToScene = (
  ecs: ECS,
  sceneEntity: Entity,
  entityId: Entity
): void => {
  'worklet';
  ecs.updateComponent<SceneComponentData>(sceneEntity, SceneComponentName, (scene) => {
    if (!scene.objects.entities.includes(entityId)) {
      scene.objects.entities.push(entityId);
    }
  });
};

export const BlockFoamSystem: System = {
  name: 'blockFoamSystem',
  requiredComponents: [],
  process: ({ ecs, components, deltaTime, eventQueue }) => {
    'worklet';

    const rowStore = components[ObstacleRowComponentName];
    const foamStore = components[BlockFoamComponentName];
    const renderStore = components[RenderComponentName];

    if (!rowStore || !renderStore) {
      return;
    }

    const containerData = firstDataFromStore(
      components[ContainerComponentName]
    ) as ContainerComponentData | undefined;
    const waterData = firstDataFromStore(components[WaterComponentName]) as
      | WaterComponentData
      | undefined;
    if (!containerData || !waterData) {
      return;
    }

    const session = getGameSession(components);
    const paused = isStartReady(session) || isGameOverPhase(session);
    const deltaSeconds = paused ? 0 : deltaTime / 1000;
    const flatWaterTopY = getFlatWaterBodyTopY(containerData);
    const waterRaiseSpeed = waterData.raisingSpeed ?? 0;

    const sceneEntity = findSceneEntityByKey(components, 'game');
    if (typeof sceneEntity !== 'number') {
      return;
    }

    const orphanFoamIds: Entity[] = [];
    if (foamStore) {
      foamStore.forEach((foamEntity, foamData) => {
        if (!rowStore.get(foamData.rowEntityId)) {
          orphanFoamIds.push(foamEntity);
        }
      });
    }
    if (orphanFoamIds.length > 0) {
      eventQueue.addEvent({
        type: RemoveEntityBatchRequestType,
        payload: { entityIds: orphanFoamIds, sceneKey: 'game' },
      });
    }

    rowStore.forEach((rowEntity, rowData) => {
      const render = renderStore.get(rowEntity) as RenderComponentData | undefined;
      const shape = render?.shape;
      if (!shape || shape.type !== ShapeTypes.Rectangle) {
        return;
      }
      const blockH = shape.height;
      const blockW = shape.width / Math.max(1, LAYOUT_CONSTANTS.COLUMNS);
      const rowCenterX = render?.position?.x ?? containerData.centerX;
      const rowY = rowData.y;

      const inWater = rowTouchesWater(rowY, blockH, flatWaterTopY);
      if (!inWater) {
        return;
      }

      let foamEntityId = rowData.foamEntityId;
      const existingFoam =
        foamStore && typeof foamEntityId === 'number'
          ? (foamStore.get(foamEntityId) as BlockFoamComponentData | undefined)
          : undefined;

      if (!existingFoam) {
        if (!foamStore) {
          return;
        }
        const rowAboveGaps = findRowAboveGaps(rowStore, rowEntity);
        const rowBelowGaps =
          rowData.prevRowEntity != null
            ? (rowStore.get(rowData.prevRowEntity)?.gaps ?? null)
            : null;
        const contacts = collectBlockFoamContacts(
          rowData.gaps,
          rowAboveGaps,
          rowBelowGaps,
          LAYOUT_CONSTANTS.COLUMNS
        );
        if (contacts.length === 0) {
          return;
        }

        foamEntityId = ecs.createEntity();
        const rowWidth = shape.width;
        const contactLocalY = computeFoamContactLocalY(
          flatWaterTopY,
          rowY,
          blockFoamTuning.belowSurfaceOffsetPx
        );
        const rowSeed = computeRowFoamSeed(rowEntity, rowData.gaps, rowY);
        ecs.addComponent(
          foamEntityId,
          createBlockFoamComponent({
            rowEntityId: rowEntity,
            foamAge: 0,
            contacts,
            rowLength: LAYOUT_CONSTANTS.COLUMNS,
            blockWidth: blockW,
            blockHeight: blockH,
            rowCenterX,
            contactLocalY,
            rowSeed,
          })
        );
        const initialLayers = buildBlockFoamRenderLayers({
          contacts,
          rowLength: LAYOUT_CONSTANTS.COLUMNS,
          blockWidth: blockW,
          blockHeight: blockH,
          foamAge: 0,
          waterRaiseSpeed,
          contactLocalY,
          rowSeed,
        });
        ecs.addComponent(
          foamEntityId,
          createWorldYSortedRenderComponent({
            shape: {
              type: ShapeTypes.Rectangle,
              width: rowWidth,
              height: blockH,
            },
            position: { x: rowCenterX, y: rowY },
            renderLayers: initialLayers,
            visible: initialLayers.length > 0,
            gooeyMerge: blockFoamGooeyMerge,
            renderLayer: SwimmerRenderLayer.Obstacles + 1,
            tieBreaker: RenderSortTieBreaker.WorldXAsc,
          })
        );
        addEntityToScene(ecs, sceneEntity, foamEntityId);
        ecs.updateComponent<ObstacleRowComponentData>(
          rowEntity,
          ObstacleRowComponentName,
          (row) => {
            row.foamEntityId = foamEntityId;
          }
        );
        return;
      }

      const activeFoamId = foamEntityId;
      if (typeof activeFoamId !== 'number') {
        return;
      }

      const nextAge = existingFoam.foamAge + deltaSeconds;
      ecs.updateComponent<BlockFoamComponentData>(
        activeFoamId,
        BlockFoamComponentName,
        (foam) => {
          foam.foamAge = nextAge;
        }
      );
      const foamLayers = buildBlockFoamRenderLayers({
        contacts: existingFoam.contacts,
        rowLength: existingFoam.rowLength,
        blockWidth: existingFoam.blockWidth,
        blockHeight: existingFoam.blockHeight,
        foamAge: nextAge,
        waterRaiseSpeed,
        contactLocalY: existingFoam.contactLocalY,
        rowSeed:
          existingFoam.rowSeed ??
          computeRowFoamSeed(rowEntity, rowData.gaps, rowY),
      });
      ecs.updateComponent<RenderComponentData>(
        activeFoamId,
        RenderComponentName,
        (renderData) => {
          applyFoamRenderLayers(renderData, foamLayers, rowCenterX, rowY);
        }
      );
    });
  },
};
