import { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import type { ComponentStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/component';
import type { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import { MatterBodyComponentName } from '@/containers/ReactNativeSkiaGameEngine/internal/components/matterBody';
import {
  SceneComponentData,
  SceneComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/scene';
import {
  HazardBandLeadComponentData,
  HazardBandLeadComponentName,
} from '@/Game/ecs-components/HazardBandLead';
import {
  ObstacleRowComponentData,
} from '@/Game/ecs-components/ObstacleRowComponent';
import {
  createPendulumHazardHeadComponent,
  PendulumHazardHeadComponentName,
} from '@/Game/ecs-components/PendulumHazardHead';
import { pendulumHazardTuning } from '@/config/pendulumHazardTuning';
import {
  buildPendulumHeadTransformFromParams,
  pendulumAnchorWorldCenter,
  pendulumHeadTransformToWorld,
  pendulumTSecFromSpawn,
} from '@/Game/hazards/pendulumMotion';

const createMatterPendulumHeadBody = (
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  angleRad: number,
  entityId: number
): Matter.Body | null => {
  'worklet';
  if (!global._RNTGE_?.physics || !global.MatterReanimated) {
    return null;
  }
  const body = global.MatterReanimated.Bodies.rectangle(
    centerX,
    centerY,
    width,
    height,
    {
      isStatic: true,
      friction: 0,
      restitution: 0,
      angle: angleRad,
      label: 'pendulumHead',
    }
  );
  body.id = entityId;
  global.MatterReanimated.Composite.add(
    global._RNTGE_.physics.engine.world,
    body
  );
  return body;
};

export const maybeSpawnPendulumHeadBody = (args: {
  ecs: ECS;
  components: Record<string, ComponentStore<unknown>>;
  leadEntity: Entity;
  leadData: HazardBandLeadComponentData;
  rowStore: ComponentStore<ObstacleRowComponentData>;
  leftX: number;
  columnWidth: number;
  blockHeight: number;
  sceneKey: string;
}): void => {
  'worklet';
  const {
    ecs,
    components,
    leadEntity,
    leadData,
    rowStore,
    leftX,
    columnWidth,
    blockHeight,
    sceneKey,
  } = args;

  if (leadData.kind !== 'pendulum' || leadData.pendulumMatterSpawned) {
    return;
  }
  const pendulumParams = leadData.pendulumParams;
  if (!pendulumParams) {
    return;
  }

  const memberYs: number[] = [];
  for (let i = 0; i < leadData.memberRowEntityIds.length; i++) {
    const row = rowStore.get(leadData.memberRowEntityIds[i]);
    if (row) {
      memberYs.push(row.y);
    }
  }
  if (memberYs.length === 0) {
    return;
  }

  let anchorRowY = memberYs[0];
  for (let i = 1; i < memberYs.length; i++) {
    if (memberYs[i] < anchorRowY) {
      anchorRowY = memberYs[i];
    }
  }

  const tSec = pendulumTSecFromSpawn(performance.now(), leadData.spawnTimeMs ?? 0);
  const transform = buildPendulumHeadTransformFromParams(
    anchorRowY,
    pendulumParams.anchorCol,
    leftX,
    columnWidth,
    blockHeight,
    pendulumParams,
    tSec
  );
  const anchor = pendulumAnchorWorldCenter(
    anchorRowY,
    pendulumParams.anchorCol,
    leftX,
    columnWidth,
    blockHeight
  );
  const world = pendulumHeadTransformToWorld(anchor.x, anchor.y, transform);

  const headEntity = ecs.createEntity();
  const body = createMatterPendulumHeadBody(
    world.centerX,
    world.centerY,
    transform.widthPx,
    transform.heightPx,
    0,
    headEntity
  );

  if (body) {
    ecs.addComponent(headEntity, {
      name: MatterBodyComponentName,
      data: body,
    });
  }

  ecs.addComponent(
    headEntity,
    createPendulumHazardHeadComponent({
      leadEntityId: leadEntity,
      hazardId: leadData.hazardId,
    })
  );

  if (body) {
    const sceneEntities = ecs.getEntitiesWithComponents([SceneComponentName]);
    for (let i = 0; i < sceneEntities.length; i++) {
      const sceneEnt = sceneEntities[i];
      const sceneData = ecs.components[SceneComponentName]?.get(
        sceneEnt
      ) as SceneComponentData | undefined;
      if (sceneData?.sceneKey === sceneKey) {
        ecs.updateComponent<SceneComponentData>(sceneEnt, SceneComponentName, (scene) => {
          scene.objects.matterBodies.push(body.id);
        });
        break;
      }
    }
  }

  ecs.updateComponent<HazardBandLeadComponentData>(
    leadEntity,
    HazardBandLeadComponentName,
    (lead) => {
      lead.pendulumHeadEntityId = headEntity;
      lead.pendulumMatterSpawned = true;
    }
  );
};

export const syncPendulumHeadMatterBody = (args: {
  ecs: ECS;
  components: Record<string, ComponentStore<unknown>>;
  leadData: HazardBandLeadComponentData;
  leftX: number;
  columnWidth: number;
  blockHeight: number;
  memberRowYs: readonly number[];
  tSec: number;
}): void => {
  'worklet';
  const {
    components,
    leadData,
    leftX,
    columnWidth,
    blockHeight,
    memberRowYs,
    tSec,
  } = args;

  const pendulumParams = leadData.pendulumParams;
  const headEntityId = leadData.pendulumHeadEntityId;
  if (!pendulumParams || headEntityId == null || !global.MatterReanimated) {
    return;
  }

  if (memberRowYs.length === 0) {
    return;
  }

  let anchorRowY = memberRowYs[0];
  for (let i = 1; i < memberRowYs.length; i++) {
    if (memberRowYs[i] < anchorRowY) {
      anchorRowY = memberRowYs[i];
    }
  }

  const transform = buildPendulumHeadTransformFromParams(
    anchorRowY,
    pendulumParams.anchorCol,
    leftX,
    columnWidth,
    blockHeight,
    pendulumParams,
    tSec
  );
  const anchor = pendulumAnchorWorldCenter(
    anchorRowY,
    pendulumParams.anchorCol,
    leftX,
    columnWidth,
    blockHeight
  );
  const world = pendulumHeadTransformToWorld(anchor.x, anchor.y, transform);

  const matterStore = components[MatterBodyComponentName];
  const matterBody = matterStore?.get(headEntityId) as Matter.Body | undefined;
  if (matterBody) {
    global.MatterReanimated.Body.setPosition(matterBody, {
      x: world.centerX,
      y: world.centerY,
    });
    global.MatterReanimated.Body.setAngle(matterBody, 0);
  }
};

export const removePendulumHeadEntities = (args: {
  ecs: ECS;
  components: Record<string, ComponentStore<unknown>>;
  leadData: HazardBandLeadComponentData;
}): void => {
  'worklet';
  const { ecs, components, leadData } = args;
  const headEntityId = leadData.pendulumHeadEntityId;
  if (headEntityId == null) {
    return;
  }

  const matterStore = components[MatterBodyComponentName];
  const body = matterStore?.get(headEntityId) as Matter.Body | undefined;
  if (body && global._RNTGE_?.physics && global.MatterReanimated) {
    global.MatterReanimated.Composite.remove(
      global._RNTGE_.physics.engine.world,
      body
    );
  }
  if (matterStore?.get(headEntityId)) {
    ecs.removeComponent(headEntityId, MatterBodyComponentName);
  }
  if (components[PendulumHazardHeadComponentName]?.get(headEntityId)) {
    ecs.removeComponent(headEntityId, PendulumHazardHeadComponentName);
  }
};

export const pendulumHeadSizePx = (
  columnWidth: number,
  blockHeight: number
): { widthPx: number; heightPx: number } => {
  'worklet';
  return {
    widthPx: pendulumHazardTuning.HEAD_WIDTH_COLS * columnWidth,
    heightPx: pendulumHazardTuning.HEAD_HEIGHT_ROWS * blockHeight,
  };
};
