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
  createPivotHazardArmComponent,
  PivotHazardArmComponentName,
} from '@/Game/ecs-components/PivotHazardArm';
import {
  armWorldTransform,
  pivotHubWorldCenter,
} from '@/Game/hazards/pivotMotion';
import { pivotHazardTuning } from '@/config/pivotHazardTuning';

const createMatterArmBody = (
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
    }
  );
  body.id = entityId;
  global.MatterReanimated.Composite.add(
    global._RNTGE_.physics.engine.world,
    body
  );
  return body;
};

export const maybeSpawnPivotArmBodies = (args: {
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

  if (leadData.kind !== 'pivot' || leadData.pivotMatterSpawned) {
    return;
  }
  const pivotParams = leadData.pivotParams;
  if (!pivotParams) {
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

  const hub = pivotHubWorldCenter(
    memberYs,
    pivotParams.anchorMode,
    6,
    leftX,
    columnWidth
  );
  const armLengthPx = pivotParams.armLengthCols * columnWidth;
  const armThicknessPx = pivotParams.armThicknessRows * blockHeight;
  const armEntityIds: Entity[] = [];
  const createdBodies: Matter.Body[] = [];

  for (let armIndex = 0; armIndex < pivotParams.armCount; armIndex++) {
    const armEntity = ecs.createEntity();
    armEntityIds.push(armEntity);

    const transform = armWorldTransform(
      hub.x,
      hub.y,
      leadData.currentAngleRad ?? 0,
      armIndex,
      pivotParams.armCount,
      armLengthPx,
      armThicknessPx,
      columnWidth
    );

    const body = createMatterArmBody(
      transform.centerX,
      transform.centerY,
      transform.lengthPx,
      transform.thicknessPx,
      transform.angleRad,
      armEntity
    );

    if (body) {
      createdBodies.push(body);
      ecs.addComponent(armEntity, {
        name: MatterBodyComponentName,
        data: body,
      });
    }

    ecs.addComponent(
      armEntity,
      createPivotHazardArmComponent({
        leadEntityId: leadEntity,
        hazardId: leadData.hazardId,
        armIndex,
        armCount: pivotParams.armCount,
      })
    );
  }

  if (createdBodies.length > 0) {
    const sceneEntities = ecs.getEntitiesWithComponents([SceneComponentName]);
    for (let i = 0; i < sceneEntities.length; i++) {
      const sceneEnt = sceneEntities[i];
      const sceneData = ecs.components[SceneComponentName]?.get(
        sceneEnt
      ) as SceneComponentData | undefined;
      if (sceneData?.sceneKey === sceneKey) {
        ecs.updateComponent<SceneComponentData>(sceneEnt, SceneComponentName, (scene) => {
          scene.objects.matterBodies.push(...createdBodies.map((b) => b.id));
        });
        break;
      }
    }
  }

  ecs.updateComponent<HazardBandLeadComponentData>(
    leadEntity,
    HazardBandLeadComponentName,
    (lead) => {
      lead.pivotArmEntityIds = armEntityIds;
      lead.pivotMatterSpawned = true;
    }
  );
};

export const syncPivotArmMatterBodies = (args: {
  ecs: ECS;
  components: Record<string, ComponentStore<unknown>>;
  leadData: HazardBandLeadComponentData;
  pivotAngleRad: number;
  leftX: number;
  columnWidth: number;
  blockHeight: number;
  memberRowYs: readonly number[];
}): void => {
  'worklet';
  const {
    ecs,
    components,
    leadData,
    pivotAngleRad,
    leftX,
    columnWidth,
    blockHeight,
    memberRowYs,
  } = args;

  const pivotParams = leadData.pivotParams;
  const armEntityIds = leadData.pivotArmEntityIds;
  if (!pivotParams || !armEntityIds?.length || !global.MatterReanimated) {
    return;
  }

  const hub = pivotHubWorldCenter(
    memberRowYs,
    pivotParams.anchorMode,
    6,
    leftX,
    columnWidth
  );
  const armLengthPx = pivotParams.armLengthCols * columnWidth;
  const armThicknessPx = pivotParams.armThicknessRows * blockHeight;
  const matterStore = components[MatterBodyComponentName];

  for (let armIndex = 0; armIndex < armEntityIds.length; armIndex++) {
    const armEntity = armEntityIds[armIndex];
    const transform = armWorldTransform(
      hub.x,
      hub.y,
      pivotAngleRad,
      armIndex,
      pivotParams.armCount,
      armLengthPx,
      armThicknessPx,
      columnWidth
    );

    const matterBody = matterStore?.get(armEntity) as Matter.Body | undefined;
    if (matterBody) {
      global.MatterReanimated.Body.setPosition(matterBody, {
        x: transform.centerX,
        y: transform.centerY,
      });
      global.MatterReanimated.Body.setAngle(matterBody, transform.angleRad);
    }
  }
};

export const removePivotArmEntities = (args: {
  ecs: ECS;
  components: Record<string, ComponentStore<unknown>>;
  leadData: HazardBandLeadComponentData;
}): void => {
  'worklet';
  const { ecs, components, leadData } = args;
  const armIds = leadData.pivotArmEntityIds ?? [];
  const matterStore = components[MatterBodyComponentName];

  for (let i = 0; i < armIds.length; i++) {
    const armEntity = armIds[i];
    const body = matterStore?.get(armEntity) as Matter.Body | undefined;
    if (body && global._RNTGE_?.physics && global.MatterReanimated) {
      global.MatterReanimated.Composite.remove(
        global._RNTGE_.physics.engine.world,
        body
      );
    }
    if (matterStore?.get(armEntity)) {
      ecs.removeComponent(armEntity, MatterBodyComponentName);
    }
    if (components[PivotHazardArmComponentName]?.get(armEntity)) {
      ecs.removeComponent(armEntity, PivotHazardArmComponentName);
    }
  }
};

export const buildPivotHubSizePx = (columnWidth: number): number => {
  'worklet';
  return pivotHazardTuning.HUB_SIZE_COLS * columnWidth;
};
