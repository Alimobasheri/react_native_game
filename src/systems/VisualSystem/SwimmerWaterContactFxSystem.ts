import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  createWorldYSortedRenderComponent,
  RenderComponentData,
  RenderComponentName,
  RenderSortOrigin,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import {
  ContainerComponentData,
  ContainerComponentName,
} from '@/Game/ecs-components/Container';
import {
  WaterComponentData,
  WaterComponentName,
} from '@/Game/ecs-components/Water';
import {
  SwimmerComponentData,
  SwimmerComponentName,
} from '@/Game/ecs-components/Swimmer';
import {
  SwimmerAnticipationDentEventType,
  SwimmerDirectionalSplashEventType,
  SwimmerPinnedSplashEventType,
  SwimmerPivotSplashEventType,
  SwimmerWallBumpEventType,
  type SwimmerAnticipationDentPayload,
  type SwimmerDirectionalSplashPayload,
  type SwimmerPinnedSplashPayload,
  type SwimmerPivotSplashPayload,
  type SwimmerWallBumpPayload,
} from '@/Game/characters/swimmerLocomotionEvents';
import { SwimmerRenderLayer } from '@/Game/render/swimmerRenderLayers';
import { swimmerVisualTuning } from '@/config/swimmerVisualTuning';
import {
  swimmerContactFoamCollarGooeyMerge,
  swimmerContactFoamGooeyMerge,
  swimmerWaterFxTuning,
  usesAccentGooeyKind,
  type SwimmerContactFoamKind,
} from '@/config/swimmerWaterFxTuning';
import {
  blendFoamFillColors,
  buildSwimmerContactFoamLayers,
  getPresetForKind,
  isSwimmerContactingWaterSurface,
  isSwimmerAtWaterForCollarFoam,
  swimmerXToNormSpan,
  type FoamLayerMode,
} from '@/Game/render/buildSwimmerContactFoamLayers';
import { VisualStrokePhase } from '@/Game/characters/visualStrokePhase';
import { getFlatWaterBodyTopY } from '@/Game/water/flatWaterSurface';
import type { WaterSurfaceProfileParams } from '@/Game/water/waterSurfaceProfile';
import { buildProfileFromShaderUniforms } from '@/Game/water/buildWaterSurfaceProfileParams';
import {
  getGameSession,
  isGameOverPhase,
  isStartReady,
} from '@/Game/session/gameSessionQuery';
import { RestartGameplayRequestType } from '@/Game/session/restartGameplayEvents';
import {
  findSceneEntityByKey,
  firstDataFromStore,
} from '@/containers/ReactNativeSkiaGameEngine/services-ecs/query';
import {
  SceneComponentData,
  SceneComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/scene';
import type { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import type { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import { evictPictureCacheEntry } from '@/containers/ReactNativeSkiaGameEngine/internal/utils/pictureCache';
import {
  clearSwimmerWaterFx,
  getSwimmerWaterFxBurstStore,
  getSwimmerWaterFxPhasePrevStore,
  type SwimmerWaterFxBurstRecord,
} from '@/Game/water/swimmerWaterFxLifecycle';

type WaterFxContext = {
  profileBase: Omit<WaterSurfaceProfileParams, 'xNorm'>;
  containerCenterX: number;
  containerWidth: number;
  containerHeight: number;
  flatWaterTopY: number;
};

const readWaterFxContext = (
  components: Record<string, unknown>
): WaterFxContext | null => {
  'worklet';
  const containerStore = components[ContainerComponentName] as
    | Map<Entity, ContainerComponentData>
    | undefined;
  const waterStore = components[WaterComponentName] as
    | Map<Entity, WaterComponentData>
    | undefined;
  const renderStore = components[RenderComponentName] as
    | Map<Entity, RenderComponentData>
    | undefined;
  if (!containerStore || !waterStore || !renderStore) {
    return null;
  }

  let containerData = firstDataFromStore(containerStore) as
    | ContainerComponentData
    | undefined;
  let containerEntityId: Entity | undefined;
  containerStore.forEach((entityId) => {
    if (containerEntityId == null) {
      containerEntityId = entityId;
    }
  });
  if (!containerData || typeof containerEntityId !== 'number') {
    return null;
  }

  let profileBase: Omit<WaterSurfaceProfileParams, 'xNorm'> | undefined;
  waterStore.forEach((waterEntity, waterData) => {
    if (profileBase) {
      return;
    }
    if (waterData.containerEntityId !== containerEntityId) {
      return;
    }
    const waterRender = renderStore.get(waterEntity);
    const uniforms = (waterRender?.shader?.uniforms ?? {}) as Record<
      string,
      unknown
    >;
    profileBase = buildProfileFromShaderUniforms(waterData, uniforms);
  });

  if (!profileBase) {
    return null;
  }

  return {
    profileBase,
    containerCenterX: containerData.centerX,
    containerWidth: containerData.width,
    containerHeight: containerData.height,
    flatWaterTopY: getFlatWaterBodyTopY(containerData),
  };
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

const removeEntityFromScene = (
  ecs: ECS,
  sceneEntity: Entity,
  entityId: Entity
): void => {
  'worklet';
  ecs.updateComponent<SceneComponentData>(sceneEntity, SceneComponentName, (scene) => {
    scene.objects.entities = scene.objects.entities.filter((id) => id !== entityId);
  });
};

const swimmerVisualHalfHeight = (swimmer: SwimmerComponentData): number => {
  'worklet';
  const meshH =
    swimmer.meshBaseHeight ??
    (swimmer.containerWidth / 6) * swimmerVisualTuning.VISUAL_HEIGHT_TO_WIDTH_RATIO;
  return meshH * 0.5;
};

const swimmerVisualHeight = (swimmer: SwimmerComponentData): number => {
  'worklet';
  return swimmerVisualHalfHeight(swimmer) * 2;
};

const swimmerTouchesWater = (swimmer: SwimmerComponentData): boolean => {
  'worklet';
  return isSwimmerContactingWaterSurface(
    swimmer.y,
    swimmer.waterSurfaceY,
    swimmerVisualHalfHeight(swimmer)
  );
};

const isWakeTrailPhase = (
  locomotion: SwimmerComponentData['locomotion']
): boolean => {
  'worklet';
  const visualPhase = locomotion.visualPhase ?? VisualStrokePhase.IDLE;
  return (
    visualPhase === VisualStrokePhase.STROKE ||
    visualPhase === VisualStrokePhase.GLIDE
  );
};

const countActiveWakeDroplets = (): number => {
  'worklet';
  const store = getSwimmerWaterFxBurstStore();
  let count = 0;
  for (let i = 0; i < store.length; i++) {
    if (store[i].kind === 'wake') {
      count++;
    }
  }
  return count;
};

const swimmerAtWaterForCollar = (swimmer: SwimmerComponentData): boolean => {
  'worklet';
  return isSwimmerAtWaterForCollarFoam(
    swimmer.y,
    swimmer.waterSurfaceY,
    swimmerVisualHeight(swimmer),
    swimmer.isPinnedFromAbove === true
  );
};

const smoothstep01 = (t: number): number => {
  'worklet';
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

const collarActiveForSwimmer = (
  swimmer: SwimmerComponentData,
  locomotion: SwimmerComponentData['locomotion'],
  startReady: boolean,
  showCollar: boolean
): boolean => {
  'worklet';
  if (!showCollar) {
    return false;
  }
  if (startReady) {
    return true;
  }
  if (swimmer.isPinnedFromAbove === true) {
    return false;
  }
  if (!swimmerTouchesWater(swimmer)) {
    return false;
  }
  if (locomotion.collarAwaitingRegrow === true) {
    return locomotion.collarFloatDepthReached === true;
  }
  if (locomotion.collarRegrowComplete === true) {
    return true;
  }
  return swimmerAtWaterForCollar(swimmer);
};

/** Keep ripple timeline alive whenever swimmer is in water (not pin/dry). */
const collarShouldAdvanceAge = (
  swimmer: SwimmerComponentData,
  startReady: boolean,
  showCollar: boolean
): boolean => {
  'worklet';
  return (
    showCollar &&
    (startReady ||
      (swimmer.isPinnedFromAbove !== true &&
        swimmerTouchesWater(swimmer)))
  );
};

/** True when collar should render anything (including drain fade). */
const collarShouldRender = (
  swimmer: SwimmerComponentData,
  locomotion: SwimmerComponentData['locomotion'],
  startReady: boolean,
  showCollar: boolean,
  collarDrain01: number
): boolean => {
  'worklet';
  if (!showCollar) {
    return false;
  }
  if (startReady) {
    return true;
  }
  if (locomotion.collarAwaitingRegrow === true) {
    if (locomotion.collarFloatDepthReached !== true) {
      return collarDrain01 > 0.02;
    }
    return true;
  }
  return collarDrain01 > 0.02 || collarActiveForSwimmer(swimmer, locomotion, startReady, showCollar);
};

const foamBandPosition = (
  ctx: WaterFxContext,
  bandCenterX: number
): { x: number; y: number } => {
  'worklet';
  return {
    x: bandCenterX,
    y: ctx.flatWaterTopY + swimmerWaterFxTuning.entityYOffsetPx,
  };
};

const createCollarFoamRenderComponent = (
  ctx: WaterFxContext,
  bandCenterX: number,
  renderLayers: ReturnType<typeof buildSwimmerContactFoamLayers>
) => {
  'worklet';
  return createWorldYSortedRenderComponent({
    shape: {
      type: ShapeTypes.Rectangle,
      width: swimmerWaterFxTuning.localBandWidthPx,
      height: swimmerWaterFxTuning.bandHeightPx,
    },
    position: foamBandPosition(ctx, bandCenterX),
    renderLayers,
    visible: renderLayers.length > 0,
    gooeyMerge: swimmerContactFoamCollarGooeyMerge,
    renderLayer: SwimmerRenderLayer.WaterSurfaceFoam,
    origin: RenderSortOrigin.Bottom,
    originOffset: swimmerWaterFxTuning.depthSortOffset,
    isDirty: true,
  });
};

const createCrispFoamRenderComponent = (
  ctx: WaterFxContext,
  bandCenterX: number,
  renderLayers: ReturnType<typeof buildSwimmerContactFoamLayers>
) => {
  'worklet';
  return createWorldYSortedRenderComponent({
    shape: {
      type: ShapeTypes.Rectangle,
      width: swimmerWaterFxTuning.localBandWidthPx,
      height: swimmerWaterFxTuning.bandHeightPx,
    },
    position: foamBandPosition(ctx, bandCenterX),
    renderLayers,
    visible: renderLayers.length > 0,
    renderLayer: SwimmerRenderLayer.WaterSurfaceFoam,
    origin: RenderSortOrigin.Bottom,
    originOffset: swimmerWaterFxTuning.depthSortOffset,
    isDirty: true,
  });
};

const createAccentFoamRenderComponent = (
  ctx: WaterFxContext,
  bandCenterX: number,
  renderLayers: ReturnType<typeof buildSwimmerContactFoamLayers>
) => {
  'worklet';
  return createWorldYSortedRenderComponent({
    shape: {
      type: ShapeTypes.Rectangle,
      width: swimmerWaterFxTuning.localBandWidthPx,
      height: swimmerWaterFxTuning.bandHeightPx,
    },
    position: foamBandPosition(ctx, bandCenterX),
    renderLayers,
    visible: renderLayers.length > 0,
    gooeyMerge: swimmerContactFoamGooeyMerge,
    renderLayer: SwimmerRenderLayer.WaterSurfaceFoam,
    origin: RenderSortOrigin.Bottom,
    originOffset: swimmerWaterFxTuning.depthSortOffset + 1,
    isDirty: true,
  });
};

const buildLayersForBurst = (
  ctx: WaterFxContext,
  burst: Pick<
    SwimmerWaterFxBurstRecord,
    'kind' | 'swimmerX' | 'foamSeed' | 'strength' | 'age' | 'maxAge' | 'direction'
  >,
  fillColor: string,
  layerMode: FoamLayerMode = 'all'
) => {
  'worklet';
  const preset = getPresetForKind(burst.kind);
  const life01 = Math.max(0, 1 - burst.age / burst.maxAge);
  const span = swimmerXToNormSpan(
    burst.swimmerX,
    ctx.containerCenterX,
    ctx.containerWidth,
    preset.halfWidthNorm
  );
  return buildSwimmerContactFoamLayers({
    kind: burst.kind,
    span,
    foamAge: burst.age,
    life01,
    foamSeed: burst.foamSeed,
    foamStrength: burst.strength,
    bandCenterX: burst.swimmerX,
    profileBase: ctx.profileBase,
    containerWidth: ctx.containerWidth,
    containerHeight: ctx.containerHeight,
    containerCenterX: ctx.containerCenterX,
    fillColor,
    direction: (Math.sign(burst.direction) || 0) as -1 | 0 | 1,
    layerMode,
  });
};

const spawnSplashBurst = (
  ecs: ECS,
  ctx: WaterFxContext,
  sceneEntity: Entity,
  args: {
    swimmerX: number;
    direction: -1 | 1;
    strength: number;
    maxAge?: number;
    foamSeed?: number;
  }
): void => {
  'worklet';
  const preset = swimmerWaterFxTuning.preset.splash;
  const foamSeed = args.foamSeed ?? args.swimmerX * 0.31 + 17.3;
  const strength = Math.max(preset.strength, args.strength);
  const layers = buildSwimmerContactFoamLayers({
    kind: 'splash',
    span: swimmerXToNormSpan(
      args.swimmerX,
      ctx.containerCenterX,
      ctx.containerWidth,
      preset.halfWidthNorm
    ),
    foamAge: 0,
    life01: 1,
    foamSeed,
    foamStrength: strength,
    bandCenterX: args.swimmerX,
    profileBase: ctx.profileBase,
    containerWidth: ctx.containerWidth,
    containerHeight: ctx.containerHeight,
    containerCenterX: ctx.containerCenterX,
    direction: args.direction,
    layerMode: 'all',
  });

  const entityId = ecs.createEntity();
  ecs.addComponent(entityId, createCrispFoamRenderComponent(ctx, args.swimmerX, layers));
  addEntityToScene(ecs, sceneEntity, entityId);

  getSwimmerWaterFxBurstStore().push({
    entityId,
    age: 0,
    maxAge: args.maxAge ?? preset.maxAge,
    swimmerX: args.swimmerX,
    kind: 'splash',
    direction: args.direction,
    strength,
    foamSeed,
  });
};

const spawnFoamBurst = (
  ecs: ECS,
  ctx: WaterFxContext,
  sceneEntity: Entity,
  burst: Omit<SwimmerWaterFxBurstRecord, 'entityId' | 'age' | 'foamSeed' | 'accentEntityId'> & {
    foamSeed?: number;
  }
): void => {
  'worklet';
  const preset = getPresetForKind(burst.kind);
  const foamSeed = burst.foamSeed ?? burst.swimmerX * 0.31 + burst.kind.length * 17.3;
  const strength = Math.max(preset.strength, burst.strength);
  const direction = (Math.sign(burst.direction) || 0) as -1 | 0 | 1;
  const span = swimmerXToNormSpan(
    burst.swimmerX,
    ctx.containerCenterX,
    ctx.containerWidth,
    preset.halfWidthNorm
  );
  const layerArgs = {
    kind: burst.kind,
    span,
    foamAge: 0,
    life01: 1,
    foamSeed,
    foamStrength: strength,
    bandCenterX: burst.swimmerX,
    profileBase: ctx.profileBase,
    containerWidth: ctx.containerWidth,
    containerHeight: ctx.containerHeight,
    containerCenterX: ctx.containerCenterX,
    direction,
  };

  const accentKind = usesAccentGooeyKind(burst.kind);
  const crispLayers = buildSwimmerContactFoamLayers({
    kind: layerArgs.kind,
    span: layerArgs.span,
    foamAge: layerArgs.foamAge,
    life01: layerArgs.life01,
    foamSeed: layerArgs.foamSeed,
    foamStrength: layerArgs.foamStrength,
    bandCenterX: layerArgs.bandCenterX,
    profileBase: layerArgs.profileBase,
    containerWidth: layerArgs.containerWidth,
    containerHeight: layerArgs.containerHeight,
    containerCenterX: layerArgs.containerCenterX,
    direction: layerArgs.direction,
    layerMode: accentKind ? 'spinesOnly' : 'all',
  });

  const entityId = ecs.createEntity();
  ecs.addComponent(entityId, createCrispFoamRenderComponent(ctx, burst.swimmerX, crispLayers));
  addEntityToScene(ecs, sceneEntity, entityId);

  let accentEntityId: number | undefined;
  if (accentKind) {
    const accentLayers = buildSwimmerContactFoamLayers({
      kind: layerArgs.kind,
      span: layerArgs.span,
      foamAge: layerArgs.foamAge,
      life01: layerArgs.life01,
      foamSeed: layerArgs.foamSeed,
      foamStrength: layerArgs.foamStrength,
      bandCenterX: layerArgs.bandCenterX,
      profileBase: layerArgs.profileBase,
      containerWidth: layerArgs.containerWidth,
      containerHeight: layerArgs.containerHeight,
      containerCenterX: layerArgs.containerCenterX,
      direction: layerArgs.direction,
      layerMode: 'blobsOnly',
    });
    accentEntityId = ecs.createEntity();
    ecs.addComponent(
      accentEntityId,
      createAccentFoamRenderComponent(ctx, burst.swimmerX, accentLayers)
    );
    addEntityToScene(ecs, sceneEntity, accentEntityId);
  }

  getSwimmerWaterFxBurstStore().push({
    entityId,
    accentEntityId,
    age: 0,
    maxAge: burst.maxAge,
    swimmerX: burst.swimmerX,
    kind: burst.kind,
    direction: burst.direction,
    strength,
    foamSeed,
  });
};

const spawnWakeDroplet = (
  ecs: ECS,
  ctx: WaterFxContext,
  sceneEntity: Entity,
  args: {
    swimmerX: number;
    direction: -1 | 1;
    strength: number;
    foamSeed: number;
  }
): void => {
  'worklet';
  if (
    countActiveWakeDroplets() >= swimmerWaterFxTuning.wakeCurl.maxConcurrent
  ) {
    return;
  }
  spawnFoamBurst(ecs, ctx, sceneEntity, {
    maxAge: swimmerWaterFxTuning.preset.wake.maxAge,
    swimmerX: args.swimmerX,
    kind: 'wake',
    direction: args.direction,
    strength: args.strength,
    foamSeed: args.foamSeed,
  });
};

const updateBurstRender = (
  burst: SwimmerWaterFxBurstRecord,
  render: RenderComponentData,
  ctx: WaterFxContext,
  fillColor: string,
  components: Record<string, unknown>
): void => {
  'worklet';
  const accentKind = usesAccentGooeyKind(burst.kind);
  const crispLayers = buildLayersForBurst(
    ctx,
    burst,
    fillColor,
    accentKind ? 'spinesOnly' : 'all'
  );
  render.renderLayers = crispLayers;
  render.visible = crispLayers.length > 0;
  render.position = foamBandPosition(ctx, burst.swimmerX);
  render.isDirty = true;

  if (accentKind && typeof burst.accentEntityId === 'number') {
    const accentRender = components[RenderComponentName]?.get(
      burst.accentEntityId
    ) as RenderComponentData | undefined;
    if (accentRender) {
      const accentLayers = buildLayersForBurst(ctx, burst, fillColor, 'blobsOnly');
      accentRender.renderLayers = accentLayers;
      accentRender.visible = accentLayers.length > 0;
      accentRender.position = foamBandPosition(ctx, burst.swimmerX);
      accentRender.isDirty = true;
    }
  }
};

const updateCollarRender = (
  render: RenderComponentData,
  swimmerX: number,
  ctx: WaterFxContext,
  clearance01: number,
  foamSeed: number,
  collarFoamAge: number,
  facingDirection: -1 | 1,
  collarSpawnActive: boolean,
  collarDrain01: number,
  collarRegrow01: number
): void => {
  'worklet';
  const nearPin = clearance01 < swimmerWaterFxTuning.NEAR_PIN_CLEARANCE01;
  const danger01 = nearPin
    ? 1 - clearance01 / swimmerWaterFxTuning.NEAR_PIN_CLEARANCE01
    : 0;
  const kind: SwimmerContactFoamKind = nearPin ? 'dangerEdge' : 'collar';
  const preset = getPresetForKind(kind);
  const fillColor = blendFoamFillColors(
    swimmerWaterFxTuning.fillColor,
    swimmerWaterFxTuning.dangerFillColor,
    danger01
  );
  const span = swimmerXToNormSpan(
    swimmerX,
    ctx.containerCenterX,
    ctx.containerWidth,
    preset.halfWidthNorm
  );
  const layers = buildSwimmerContactFoamLayers({
    kind,
    span,
    foamAge: collarFoamAge,
    life01: 1,
    foamSeed,
    foamStrength: preset.strength,
    bandCenterX: swimmerX,
    profileBase: ctx.profileBase,
    containerWidth: ctx.containerWidth,
    containerHeight: ctx.containerHeight,
    containerCenterX: ctx.containerCenterX,
    fillColor,
    direction: facingDirection,
    layerMode: 'all',
    collarSpawnActive,
    collarDrain01,
    collarRegrow01,
  });
  render.renderLayers = layers;
  render.visible = layers.length > 0;
  render.position = foamBandPosition(ctx, swimmerX);
  render.isDirty = true;
};

const removeBurstEntity = (
  ecs: ECS,
  sceneEntity: Entity,
  entityId: Entity
): void => {
  'worklet';
  removeEntityFromScene(ecs, sceneEntity, entityId);
  evictPictureCacheEntry(entityId);
  ecs.removeEntity(entityId);
};

/**
 * Swimmer water-contact FX — foam collar, directional splashes, wake streaks.
 * Spine-first crisp rendering; gooey accent blobs for big impacts only.
 */
export const SwimmerWaterContactFxSystem: System = {
  name: 'SwimmerWaterContactFxSystem',
  requiredComponents: [SwimmerComponentName],
  process: ({ entities, components, deltaTime, ecs, eventQueue }) => {
    'worklet';

    const deltaSeconds = deltaTime / 1000;
    const events = eventQueue.readEvents();
    const session = getGameSession(components);
    const startReady = isStartReady(session);
    const gameOver = isGameOverPhase(session);
    const ctx = readWaterFxContext(components);
    const sceneEntity = findSceneEntityByKey(components, 'game');
    const swimmerStoreForEvents = components[SwimmerComponentName] as
      | Map<Entity, SwimmerComponentData>
      | undefined;

    for (let e = 0; e < events.length; e++) {
      const event = events[e];
      if (event.type === RestartGameplayRequestType) {
        if (typeof sceneEntity === 'number') {
          const swimmerStore = components[SwimmerComponentName] as
            | Map<Entity, SwimmerComponentData>
            | undefined;
          if (swimmerStore) {
            swimmerStore.forEach((swimmerEntity, swimmer) => {
              clearSwimmerWaterFx(
                ecs,
                sceneEntity,
                swimmer.locomotion.foamCollarEntityId
              );
              swimmer.locomotion.foamCollarEntityId = undefined;
              swimmer.locomotion.collarFoamAge = 0;
              swimmer.locomotion.collarDrainAge = 0;
              swimmer.locomotion.collarFreezeAge = undefined;
              swimmer.locomotion.collarRegrowAge = 0;
              swimmer.locomotion.collarRegrowComplete = undefined;
              swimmer.locomotion.collarAwaitingRegrow = undefined;
              swimmer.locomotion.collarFloatDepthReached = undefined;
              swimmer.locomotion.wakeSpawnTimer = 0;
            });
          } else {
            clearSwimmerWaterFx(ecs, sceneEntity);
          }
        }
        continue;
      }

      if (gameOver || !ctx || typeof sceneEntity !== 'number') {
        continue;
      }

      if (event.type === SwimmerPivotSplashEventType) {
        const payload = event.payload as SwimmerPivotSplashPayload;
        const strength = Math.min(1.5, payload.impactSpeed / 280);
        spawnFoamBurst(ecs, ctx, sceneEntity, {
          maxAge: swimmerWaterFxTuning.preset.pivotFan.maxAge,
          swimmerX: payload.x,
          kind: 'pivotFan',
          direction: payload.direction,
          strength,
        });
      } else if (event.type === SwimmerAnticipationDentEventType) {
        const payload = event.payload as SwimmerAnticipationDentPayload;
        spawnFoamBurst(ecs, ctx, sceneEntity, {
          maxAge: swimmerWaterFxTuning.preset.dent.maxAge,
          swimmerX: payload.x - payload.direction * swimmerWaterFxTuning.dentOffsetPx,
          kind: 'dent',
          direction: payload.direction,
          strength: swimmerWaterFxTuning.preset.dent.strength,
        });
      } else if (event.type === SwimmerDirectionalSplashEventType) {
        const payload = event.payload as SwimmerDirectionalSplashPayload;
        const splashSwimmer = swimmerStoreForEvents?.get(payload.entityId);
        if (splashSwimmer && !swimmerTouchesWater(splashSwimmer)) {
          continue;
        }
        spawnSplashBurst(ecs, ctx, sceneEntity, {
          swimmerX: payload.x - payload.direction * swimmerWaterFxTuning.splashOffsetPx,
          direction: payload.direction,
          strength: payload.strength,
        });
      } else if (event.type === SwimmerPinnedSplashEventType) {
        const payload = event.payload as SwimmerPinnedSplashPayload;
        const strength = Math.min(1.5, payload.impactSpeed / 220);
        spawnFoamBurst(ecs, ctx, sceneEntity, {
          maxAge: swimmerWaterFxTuning.preset.pinnedBurst.maxAge,
          swimmerX: payload.x,
          kind: 'pinnedBurst',
          direction: 0,
          strength: Math.max(strength, swimmerWaterFxTuning.preset.pinnedBurst.strength),
        });
      } else if (event.type === SwimmerWallBumpEventType) {
        const payload = event.payload as SwimmerWallBumpPayload;
        const bumpSwimmer = swimmerStoreForEvents?.get(payload.entityId);
        if (bumpSwimmer && !swimmerTouchesWater(bumpSwimmer)) {
          continue;
        }
        const strength = Math.min(
          1.1,
          (payload.impactSpeed / 280) *
            swimmerWaterFxTuning.preset.wallBump.strength
        );
        spawnFoamBurst(ecs, ctx, sceneEntity, {
          maxAge: swimmerWaterFxTuning.preset.wallBump.maxAge,
          swimmerX: payload.x,
          kind: 'wallBump',
          direction: payload.direction,
          strength: Math.max(strength, 0.35),
        });
      }
    }

    const swimmerStore = components[SwimmerComponentName];
    if (!swimmerStore) {
      return;
    }

    const phasePrev = getSwimmerWaterFxPhasePrevStore();

    for (let i = 0; i < entities.length; i++) {
      const entityId = entities[i];
      const swimmer = swimmerStore.get(entityId) as
        | SwimmerComponentData
        | undefined;
      if (!swimmer) {
        continue;
      }

      const locomotion = swimmer.locomotion;
      const prevPhase = phasePrev[entityId] as VisualStrokePhase | undefined;
      const currentPhase = locomotion.visualPhase ?? VisualStrokePhase.IDLE;

      if (
        !gameOver &&
        ctx &&
        typeof sceneEntity === 'number' &&
        !startReady &&
        prevPhase === VisualStrokePhase.ANTICIPATION &&
        currentPhase === VisualStrokePhase.STROKE &&
        swimmerTouchesWater(swimmer)
      ) {
        const direction = locomotion.visualStrokeDirection ?? locomotion.facingDirection;
        const tier = locomotion.visualStrokeTier ?? locomotion.currentTier;
        const strength = Math.min(
          1.35,
          swimmerWaterFxTuning.preset.splash.strength * (0.75 + tier * 0.12)
        );
        spawnSplashBurst(ecs, ctx, sceneEntity, {
          swimmerX: swimmer.x - direction * swimmerWaterFxTuning.splashOffsetPx,
          direction,
          strength,
        });
        spawnWakeDroplet(ecs, ctx, sceneEntity, {
          swimmerX:
            swimmer.x -
            direction * swimmerWaterFxTuning.wakeCurl.spawnOffsetPx,
          direction,
          strength: Math.max(
            0.45,
            Math.min(
              1,
              Math.abs(swimmer.velocityX) / swimmerVisualTuning.MAX_VISUAL_SPEED
            )
          ),
          foamSeed: swimmer.x * 0.317 + entityId * 13.7,
        });
        locomotion.wakeSpawnTimer = 0;
      }
      phasePrev[entityId] = currentPhase;

      const atWater = swimmerTouchesWater(swimmer);
      const showCollar = (startReady || !swimmer.isInInitialPhase) && !gameOver;

      const existingCollarId = locomotion.foamCollarEntityId;
      if (typeof existingCollarId === 'number') {
        const existingCollarRender = components[RenderComponentName]?.get(
          existingCollarId
        );
        if (!existingCollarRender) {
          locomotion.foamCollarEntityId = undefined;
        }
      }

      if (
        showCollar &&
        (locomotion.foamCollarEntityId ?? 0) === 0 &&
        ctx &&
        typeof sceneEntity === 'number'
      ) {
        const collarId = ecs.createEntity();
        ecs.addComponent(collarId, createCollarFoamRenderComponent(ctx, swimmer.x, []));
        addEntityToScene(ecs, sceneEntity, collarId);
        locomotion.foamCollarEntityId = collarId;
        locomotion.collarFoamAge = 0;
        locomotion.collarDrainAge = 0;
        locomotion.collarFreezeAge = undefined;
        locomotion.collarRegrowAge = 0;
        locomotion.collarRegrowComplete = undefined;
        locomotion.collarAwaitingRegrow = undefined;
        locomotion.collarFloatDepthReached = undefined;
      }

      const collarEntityId = locomotion.foamCollarEntityId;
      if (typeof collarEntityId === 'number' && ctx && typeof sceneEntity === 'number') {
        const collarRender = components[RenderComponentName]?.get(
          collarEntityId
        ) as RenderComponentData | undefined;
        if (collarRender) {
          addEntityToScene(ecs, sceneEntity, collarEntityId);
          const collarCfg = swimmerWaterFxTuning.collar;
          const pinned = swimmer.isPinnedFromAbove === true;
          const atFloatDepth = swimmerAtWaterForCollar(swimmer);
          let collarRegrow01 = 1;
          let collarActive = false;
          let collarDrain01 = 1;
          let collarAnimAge = locomotion.collarFoamAge ?? 0;
          let collarSpawnActive = false;

          if (!gameOver) {
            const touchingWater = swimmerTouchesWater(swimmer);

            if (pinned) {
              locomotion.collarAwaitingRegrow = true;
              locomotion.collarFloatDepthReached = false;
              locomotion.collarRegrowComplete = false;
              locomotion.collarRegrowAge = 0;
            }

            const awaitingRegrow = locomotion.collarAwaitingRegrow === true;
            const floatReached = locomotion.collarFloatDepthReached === true;

            if (awaitingRegrow && atFloatDepth && !pinned) {
              locomotion.collarFloatDepthReached = true;
            }

            if (
              !startReady &&
              !pinned &&
              touchingWater &&
              atFloatDepth &&
              !awaitingRegrow &&
              locomotion.collarRegrowComplete !== true
            ) {
              locomotion.collarRegrowComplete = true;
            }

            if (collarShouldAdvanceAge(swimmer, startReady, showCollar)) {
              const slideEmpty =
                awaitingRegrow && !floatReached && !pinned;
              if (!slideEmpty) {
                locomotion.collarFoamAge =
                  (locomotion.collarFoamAge ?? 0) + deltaSeconds;
              }
            }

            collarActive = collarActiveForSwimmer(
              swimmer,
              locomotion,
              startReady,
              showCollar
            );

            const leavingWater = !startReady && (pinned || !touchingWater);
            const slideEmpty =
              awaitingRegrow && !floatReached && !pinned && !leavingWater;

            if (leavingWater) {
              if (locomotion.collarFreezeAge == null) {
                locomotion.collarFreezeAge = locomotion.collarFoamAge ?? 0;
              }
              locomotion.collarDrainAge =
                (locomotion.collarDrainAge ?? 0) + deltaSeconds;
              collarDrain01 = Math.max(
                0,
                1 - (locomotion.collarDrainAge ?? 0) / collarCfg.drainSec
              );
              collarAnimAge = locomotion.collarFreezeAge ?? 0;
              collarSpawnActive = false;
              collarRegrow01 = 0;
            } else if (slideEmpty) {
              locomotion.collarDrainAge = 0;
              locomotion.collarFreezeAge = undefined;
              collarDrain01 = 0;
              collarAnimAge = locomotion.collarFoamAge ?? 0;
              collarSpawnActive = false;
              collarRegrow01 = 0;
              collarActive = false;
            } else if (collarActive) {
              const justReachedFloat =
                awaitingRegrow &&
                floatReached &&
                (locomotion.collarRegrowAge ?? 0) < 0.001;

              if (justReachedFloat) {
                locomotion.collarFoamAge = 0;
                locomotion.collarRegrowAge = 0;
                locomotion.collarDrainAge = 0;
                locomotion.collarFreezeAge = undefined;
              }

              collarAnimAge = locomotion.collarFoamAge ?? 0;
              locomotion.collarDrainAge = 0;
              locomotion.collarFreezeAge = undefined;
              collarDrain01 = 1;
              collarSpawnActive = true;

              if (startReady || locomotion.collarRegrowComplete === true) {
                locomotion.collarRegrowComplete = true;
                collarRegrow01 = 1;
              } else if (awaitingRegrow) {
                locomotion.collarRegrowAge =
                  (locomotion.collarRegrowAge ?? 0) + deltaSeconds;
                const age = locomotion.collarRegrowAge ?? 0;
                const delay = collarCfg.regrowDelaySec;
                const regrowSec = collarCfg.regrowSec;
                if (age <= delay) {
                  collarRegrow01 = 0;
                  collarSpawnActive = false;
                } else {
                  collarRegrow01 = smoothstep01((age - delay) / regrowSec);
                  if (age >= delay + regrowSec) {
                    locomotion.collarRegrowComplete = true;
                    locomotion.collarAwaitingRegrow = false;
                    collarRegrow01 = 1;
                  }
                }
              } else {
                collarRegrow01 = 1;
                locomotion.collarRegrowComplete = true;
              }
            } else {
              collarAnimAge = locomotion.collarFoamAge ?? 0;
              collarRegrow01 = 0;
              collarSpawnActive = false;
              collarDrain01 = 0;
            }
          }

          const bob = startReady
            ? Math.sin((swimmer.bobbingPhase ?? 0) * 0.9) * 2
            : 0;
          const collarX = swimmer.x + bob * 0.15;
          const shouldRender = collarShouldRender(
            swimmer,
            locomotion,
            startReady,
            showCollar,
            collarDrain01
          );

          if (shouldRender) {
            updateCollarRender(
              collarRender,
              collarX,
              ctx,
              locomotion.clearance01 ?? 1,
              entityId * 19.7 + 3.1,
              collarAnimAge,
              locomotion.facingDirection,
              collarSpawnActive,
              collarDrain01,
              collarRegrow01
            );
          } else {
            collarRender.renderLayers = [];
            collarRender.visible = false;
            collarRender.isDirty = true;
          }
          collarRender.visible =
            showCollar && shouldRender && collarRender.renderLayers.length > 0;
        }
      } else if (gameOver && typeof collarEntityId === 'number') {
        const collarRender = components[RenderComponentName]?.get(
          collarEntityId
        ) as RenderComponentData | undefined;
        if (collarRender) {
          collarRender.visible = false;
        }
      }

      const isWakeTrail =
        !gameOver &&
        !startReady &&
        atWater &&
        isWakeTrailPhase(locomotion) &&
        Math.abs(swimmer.velocityX) >= swimmerVisualTuning.WAKE_MIN_SPEED;

      if (isWakeTrail) {
        locomotion.wakeSpawnTimer =
          (locomotion.wakeSpawnTimer ?? 0) + deltaSeconds;
        if (
          locomotion.wakeSpawnTimer >=
          swimmerVisualTuning.WAKE_SPAWN_INTERVAL_SEC
        ) {
          locomotion.wakeSpawnTimer = 0;
          const direction =
            locomotion.visualStrokeDirection ?? locomotion.facingDirection;
          const strength = Math.min(
            1,
            Math.abs(swimmer.velocityX) / swimmerVisualTuning.MAX_VISUAL_SPEED
          );
          const spawnX =
            swimmer.x -
            direction * swimmerWaterFxTuning.wakeCurl.spawnOffsetPx;
          if (ctx && typeof sceneEntity === 'number') {
            spawnWakeDroplet(ecs, ctx, sceneEntity, {
              swimmerX: spawnX,
              direction,
              strength: Math.max(0.45, strength),
              foamSeed:
                spawnX * 0.317 +
                entityId * 13.7 +
                getSwimmerWaterFxBurstStore().length * 41.3,
            });
          }
        }
      } else {
        locomotion.wakeSpawnTimer = 0;
      }
    }

    if (!ctx || typeof sceneEntity !== 'number') {
      return;
    }

    const store = getSwimmerWaterFxBurstStore();
    for (let i = store.length - 1; i >= 0; i--) {
      const burst = store[i];
      burst.age += deltaSeconds;
      const render = components[RenderComponentName]?.get(
        burst.entityId
      ) as RenderComponentData | undefined;
      if (render) {
        updateBurstRender(
          burst,
          render,
          ctx,
          swimmerWaterFxTuning.fillColor,
          components
        );
      }
      if (burst.age >= burst.maxAge) {
        removeBurstEntity(ecs, sceneEntity, burst.entityId);
        if (typeof burst.accentEntityId === 'number') {
          removeBurstEntity(ecs, sceneEntity, burst.accentEntityId);
        }
        store.splice(i, 1);
      }
    }
  },
};
