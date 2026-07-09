import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  findSceneEntityByKey,
  firstDataFromStore,
} from '@/containers/ReactNativeSkiaGameEngine/services-ecs/query';
import type { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import {
  RenderComponentData,
  RenderComponentName,
  ShapeTypes,
  createWorldYSortedRenderComponent,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import {
  SceneComponentData,
  SceneComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/scene';
import {
  ContainerComponentData,
  ContainerComponentName,
} from '@/Game/ecs-components/Container';
import {
  WaterComponentData,
  WaterComponentName,
} from '@/Game/ecs-components/Water';
import {
  WaterSurfaceFoamComponentData,
  WaterSurfaceFoamComponentName,
  createWaterSurfaceFoamComponent,
} from '@/Game/ecs-components/WaterSurfaceFoam';
import { SwimmerRenderLayer } from '@/Game/render/swimmerRenderLayers';
import {
  buildWaterSurfaceFoamRenderLayers,
  computeWaterSurfaceFoamStrength,
} from '@/Game/render/buildWaterSurfaceFoamRenderLayers';
import {
  computeGapTransitionT,
  getBlendedPrimaryGapSpan,
  smoothFoamGapSpan,
  type WaterSurfaceProfileParams,
} from '@/Game/water/waterSurfaceProfile';
import { buildProfileFromShaderUniforms } from '@/Game/water/buildWaterSurfaceProfileParams';
import { getFlatWaterBodyTopY } from '@/Game/water/flatWaterSurface';
import {
  waterSurfaceFoamGooeyMerge,
  waterSurfaceFoamTuning,
} from '@/config/waterSurfaceFoamTuning';
import { getGameSession, isGameOverPhase, isStartReady } from '@/Game/session/gameSessionQuery';
import { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';

const DEFAULT_GAP: [number, number] = [1 / 6, 5 / 6];

export const computeWaterSurfaceFoamSeed = (
  containerEntityId: Entity,
  waterEntityId: Entity
): number => {
  'worklet';
  return containerEntityId * 13.71 + waterEntityId * 29.317;
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

const readUniformNumber = (uniforms: Record<string, unknown>, key: string, fallback: number): number => {
  'worklet';
  const value = uniforms[key];
  return typeof value === 'number' ? value : fallback;
};

const readUniformTuple4 = (
  uniforms: Record<string, unknown>,
  key: string,
  fallback: [number, number, number, number]
): [number, number, number, number] => {
  'worklet';
  const value = uniforms[key];
  if (!Array.isArray(value) || value.length < 4) {
    return fallback;
  }
  return [value[0], value[1], value[2], value[3]];
};

const readUniformTuple2 = (
  uniforms: Record<string, unknown>,
  key: string,
  fallback: [number, number]
): [number, number] => {
  'worklet';
  const value = uniforms[key];
  if (!Array.isArray(value) || value.length < 2) {
    return fallback;
  }
  return [value[0], value[1]];
};

export const WaterSurfaceFoamSystem: System = {
  name: 'waterSurfaceFoamSystem',
  requiredComponents: [],
  process: ({ ecs, components, deltaTime }) => {
    'worklet';

    const waterStore = components[WaterComponentName];
    const renderStore = components[RenderComponentName];
    const foamStore = components[WaterSurfaceFoamComponentName];
    const containerStore = components[ContainerComponentName];
    const containerData = firstDataFromStore(containerStore) as
      | ContainerComponentData
      | undefined;
    let containerEntityId: Entity | undefined;
    containerStore?.forEach((entityId) => {
      if (containerEntityId == null) {
        containerEntityId = entityId;
      }
    });

    if (!waterStore || !renderStore || !containerData || typeof containerEntityId !== 'number') {
      return;
    }

    const session = getGameSession(components);
    const startReady = isStartReady(session);
    const gameOver = isGameOverPhase(session);
    const deltaSeconds = gameOver ? 0 : deltaTime / 1000;
    const flatWaterTopY = getFlatWaterBodyTopY(containerData);

    const sceneEntity = findSceneEntityByKey(components, 'game');
    if (typeof sceneEntity !== 'number') {
      return;
    }

    waterStore.forEach((waterEntity, waterData) => {
      if (waterData.containerEntityId !== containerEntityId) {
        return;
      }

      const waterRender = renderStore.get(waterEntity) as RenderComponentData | undefined;
      const uniforms = waterRender?.shader?.uniforms as Record<string, unknown> | undefined;
      if (!uniforms) {
        return;
      }

      let foamEntityId: Entity | undefined;
      foamStore?.forEach((entityId, foamData) => {
        if (foamData.waterEntityId === waterEntity) {
          foamEntityId = entityId;
        }
      });

      const profileBase = buildProfileFromShaderUniforms(waterData, uniforms);
      const targetSpan = getBlendedPrimaryGapSpan(
        profileBase.gapBlend,
        profileBase.gapCurrent,
        profileBase.gapPrev,
        profileBase.flowVelocity,
        waterData.flowPerRange
      );
      if (!targetSpan) {
        return;
      }

      let foamStrength = computeWaterSurfaceFoamStrength({
        raisingSpeed: waterData.raisingSpeed ?? 0,
        flowVelocity: profileBase.flowVelocity,
        surgeEnergy: profileBase.surgeEnergy,
        gapWidthNorm: waterData.gapWidthNorm ?? 2 / 3,
        visualIntensity: profileBase.visualIntensity,
      });
      if (startReady) {
        foamStrength = Math.max(
          foamStrength,
          waterSurfaceFoamTuning.startReadyFoamStrength
        );
      }

      const foamAgeForRender = (age: number): number =>
        startReady ? Math.max(age, waterSurfaceFoamTuning.startReadyMinFoamAge) : age;

      if (!foamStore || typeof foamEntityId !== 'number') {
        const newFoamEntity = ecs.createEntity();
        const foamSeed = computeWaterSurfaceFoamSeed(containerEntityId, waterEntity);
        const initialFoamAge = startReady ? waterSurfaceFoamTuning.startReadyMinFoamAge : 0;
        ecs.addComponent(
          newFoamEntity,
          createWaterSurfaceFoamComponent({
            waterEntityId: waterEntity,
            foamAge: initialFoamAge,
            foamSeed,
            displayStartNorm: targetSpan.startNorm,
            displayEndNorm: targetSpan.endNorm,
          })
        );
        const initialLayers = buildWaterSurfaceFoamRenderLayers({
          spans: [targetSpan],
          containerWidth: containerData.width,
          containerHeight: containerData.height,
          foamAge: foamAgeForRender(initialFoamAge),
          foamSeed,
          foamStrength,
          waterRaiseSpeed: waterData.raisingSpeed ?? 0,
          profileBase,
          gapTransitionT: 0,
        });
        ecs.addComponent(
          newFoamEntity,
          createWorldYSortedRenderComponent({
            shape: {
              type: ShapeTypes.Rectangle,
              width: containerData.width,
              height: waterSurfaceFoamTuning.bandHeightPx,
            },
            position: { x: containerData.centerX, y: flatWaterTopY },
            renderLayers: initialLayers,
            visible: initialLayers.length > 0,
            gooeyMerge: waterSurfaceFoamGooeyMerge,
            renderLayer: SwimmerRenderLayer.WaterSurfaceFoam,
          })
        );
        addEntityToScene(ecs, sceneEntity, newFoamEntity);
        return;
      }

      const foamData = foamStore.get(foamEntityId) as WaterSurfaceFoamComponentData | undefined;
      if (!foamData) {
        return;
      }

      const nextAge = foamData.foamAge + deltaSeconds;
      const smoothed = smoothFoamGapSpan(
        foamData.displayStartNorm,
        foamData.displayEndNorm,
        targetSpan,
        deltaSeconds,
        waterSurfaceFoamTuning.gapSpanSmoothPerSecond
      );
      const displaySpan = {
        ...targetSpan,
        startNorm: smoothed.startNorm,
        endNorm: smoothed.endNorm,
      };
      const gapTransitionT = computeGapTransitionT(
        profileBase.gapBlend,
        smoothed.startNorm,
        smoothed.endNorm,
        targetSpan.startNorm,
        targetSpan.endNorm
      );

      ecs.updateComponent<WaterSurfaceFoamComponentData>(
        foamEntityId,
        WaterSurfaceFoamComponentName,
        (foam) => {
          foam.foamAge = nextAge;
          foam.displayStartNorm = smoothed.startNorm;
          foam.displayEndNorm = smoothed.endNorm;
        }
      );

      const foamLayers = buildWaterSurfaceFoamRenderLayers({
        spans: [displaySpan],
        containerWidth: containerData.width,
        containerHeight: containerData.height,
        foamAge: foamAgeForRender(nextAge),
        foamSeed: foamData.foamSeed,
        foamStrength,
        waterRaiseSpeed: waterData.raisingSpeed ?? 0,
        profileBase,
        gapTransitionT,
      });

      ecs.updateComponent<RenderComponentData>(foamEntityId, RenderComponentName, (renderData) => {
        renderData.position = { x: containerData.centerX, y: flatWaterTopY };
        renderData.renderLayer = SwimmerRenderLayer.WaterSurfaceFoam;
        renderData.renderLayers = foamLayers;
        renderData.visible = foamLayers.length > 0;
        renderData.isDirty = true;
      });
    });
  },
};
