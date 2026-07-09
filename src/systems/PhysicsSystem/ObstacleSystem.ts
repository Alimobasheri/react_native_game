import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  firstDataFromStore,
  firstEntityFromStore,
  findSceneEntityByKey,
} from '@/containers/ReactNativeSkiaGameEngine/services-ecs/query';
import {
  ShapeTypes,
  RenderSortTieBreaker,
  createWorldYSortedRenderComponent,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { SwimmerRenderLayer } from '@/Game/render/swimmerRenderLayers';
import { ObstacleRowComponentData, ObstacleRowComponentName, createObstacleRowComponent } from '@/Game/ecs-components/ObstacleRowComponent';
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
import { getGameSession, isStartReady, isGameOverPhase } from '@/Game/session/gameSessionQuery';
import { buildObstacleRowRenderLayers } from '@/Game/render/buildObstacleRowRenderLayers';
import {
  getNextObstacleRowY,
  getObstacleRowPitch,
  pickSwimmerBlockImageStable,
  obstacleBlockDimensionsFromColumnWidth,
  type ObstacleBlockDimensions,
} from '@/assets/swimmerBlocks';
import {
  getColumnCenterX,
  getObstacleWidth,
  LAYOUT_CONSTANTS,
  FALSE_WALL_MIN_PHASE_ROWS_SINGLE_SEGMENT,
} from '@/Layout';
import {
  gapShiftRunwayDupRowsFromTotalRows,
  pathSegmentClimaxFalseWallSoloRows,
  pathSegmentClimaxFalseWallTotalRows,
  pathSegmentClimaxPinballSegmentRows,
  pathSegmentReleaseRestZoneRows,
  pathSegmentTensionFunnelDurationRows,
} from '@/config/gapDifficultyRamp';
import {
  RenderComponentData,
  RenderComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
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
import { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import { TextHeightBehavior } from '@shopify/react-native-skia';
import {
  RowPathTemplate,
  TemplateCtx,
  TemplateInitArgs,
  type GetRowArgs,
  type StoryLockedProceduralSegment,
  type StoryLockedShaftRecipe,
} from '@/Game/ecs-systems/obstacleSystem';
import {
  getOrCreateTemplateContextEntity,
  TemplateContextComponentData,
  TemplateContextComponentName,
} from '@/Game/ecs-components/TemplateContextComponent';
import { createJsonLevelRowPathTemplate } from '@/Game/templates/obstacles/jsonLevelRowPathTemplate';
import { mixU32 } from '@/Game/path/deterministicMix';
import { runProgressionTuning } from '@/config/runProgression';
import {
  clearFlowOpeningCtx,
  generateFlowOpeningRowGaps,
} from '@/Game/path/flowOpeningRows';
import type { OpeningArchetype, ClimaxPreference, SignaturePattern } from '@/Game/path/runBlueprint';
import { resolvePacingRunContext, type PacingRunContext } from '@/Game/path/cyclePersonality';
import {
  macroCycleIndex1Based,
  resolveSignaturePattern,
  signaturePinballRowBudget,
  signaturePinballCycleRowCount,
} from '@/Game/path/signatureCadence';
import {
  generateGapsDeterministic,
  generateMultiPathGapsDeterministic,
  templateRowCountDeterministic,
} from '@/Game/path/proceduralGaps';
import {
  gapsFromRow,
  rowFromGaps,
  unionMinimalSeam,
  finalizeGapsForObstacleRow,
} from '@/Game/path/swimmerGrid';
import {
  getPacingCycleState,
  pacingPhaseAtTotalRows,
  pacingPhaseToMacroPhase,
} from '@/Game/path/pacingDirector';
import { releaseCatharticRestZoneGaps } from '@/Game/path/releaseGenerators';
import type { MacroPhase } from '@/Game/path/macroPacing';
import {
  tensionFunnelRow,
  tensionGapCenterFromPrevGaps,
  tensionParadoxSplitRow,
} from '@/Game/path/tensionGenerators';
import {
  climaxFalseWallRow,
  createClimaxPinballRollState,
  createSignaturePinballHopState,
  climaxPinballStep,
  type ClimaxPinballState,
} from '@/Game/path/climaxGenerators';
import {
  buildSpawnDiagSnapshot,
  maybeLogObstacleRowGeneration,
  maybeLogPlayerActiveObstacleRowTemplate,
} from '@/Game/path/obstacleRowGenDiag';
import { logSignatureBossDebug } from '@/Game/debug/signatureBossDebug';
import { smilyLevelJson } from '@/Game/templates/obstacles/smily';
import { jellyfishLevelJson } from '@/Game/templates/obstacles/jellyfish';
import { mickyLevelJson } from '@/Game/templates/obstacles/micky';
import { kittyLevelJson } from '@/Game/templates/obstacles/kitty';
import { deadpoolLevelJson } from '@/Game/templates/obstacles/deadpool';
import { megamanLevelJson } from '@/Game/templates/obstacles/megaman';
import {
  createPlatformShaftRowPathTemplate,
  type PlatformShaftSpawnRowArgs,
  type PlatformShaftTemplateCtx,
} from '@/Game/path/platformShaft/platformShaftRowPathTemplate';
import { maybeSpawnMovingHazardsForRow } from '@/Game/hazards/hazardSpawnFromBeat';
import { PLATFORM_SHAFT_ROW_HAZARD_BANDS } from '@/Game/hazards/platformShaftTODO';
import { mergeRowHazardPass } from '@/Game/grid/mergeRowHazardPass';
import {
  rowOverlapsTransitionBand,
  waterTransitionBandFromSurface,
} from '@/Game/grid/waterTransitionBand';

function readStoryLockedProceduralSegment(
  components: Record<string, any>,
  managerEntity: Entity
): StoryLockedProceduralSegment | undefined {
  'worklet';
  const mgr = components[ObstaclesManagerComponentName]?.get(
    managerEntity
  ) as ObstaclesManagerComponentData | undefined;
  return mgr?.storyLockedProceduralSegment;
}


function readStoryLockedShaftRecipe(
  components: Record<string, any>,
  managerEntity: Entity
): StoryLockedShaftRecipe | undefined {
  'worklet';
  const mgr = components[ObstaclesManagerComponentName]?.get(
    managerEntity
  ) as ObstaclesManagerComponentData | undefined;
  return mgr?.storyLockedShaftRecipe;
}

function readStoryLockShaftLoop(
  components: Record<string, any>,
  managerEntity: Entity
): boolean {
  'worklet';
  const mgr = components[ObstaclesManagerComponentName]?.get(
    managerEntity
  ) as ObstaclesManagerComponentData | undefined;
  return mgr?.storyLockShaftLoop === true;
}

function resolveEffectiveTemplateName(
  components: Record<string, any>,
  managerEntity: Entity,
  lock?: string
): string {
  'worklet';
  if (readStoryLockedShaftRecipe(components, managerEntity)) {
    return 'platformShaftIntro';
  }
  return lock ?? 'directed';
}

function resolveTemplateNameOnRollover(
  components: Record<string, any>,
  managerEntity: Entity,
  lock?: string
): string {
  'worklet';
  const shaftRecipe = readStoryLockedShaftRecipe(components, managerEntity);
  if (shaftRecipe && readStoryLockShaftLoop(components, managerEntity)) {
    return 'platformShaftIntro';
  }
  if (shaftRecipe) {
    return lock ?? 'directed';
  }
  return lock ?? 'directed';
}

function effectiveMacroPhaseForProceduralRow(params: GetRowArgs): MacroPhase {
  'worklet';
  const seg = params.storyLockedProceduralSegment;
  if (!seg) {
    return params.pacingMacroPhase ?? 'flow';
  }
  if (
    seg === 'funnel' ||
    seg === 'paradoxSplit' ||
    seg === 'tensionMultipath'
  ) {
    return 'tension';
  }
  if (
    seg === 'pinball' ||
    seg === 'falseWall' ||
    seg === 'climaxMultipath'
  ) {
    return 'climax';
  }
  if (seg === 'releaseRestZone' || seg === 'releaseMultipath') {
    return 'release';
  }
  if (seg === 'flowMultipath') {
    return 'flow';
  }
  return params.pacingMacroPhase ?? 'flow';
}

function rowSpawnDiagFromParams(
  ctx: TemplateCtx,
  params: GetRowArgs
): Pick<ObstacleRowComponentData, 'spawnDiagTemplateName' | 'spawnDiagBranchKey'> | Record<string, never> {
  'worklet';
  const name = params.spawnDiagTemplateName;
  if (!name) {
    return {};
  }
  const macro = params.storyLockedProceduralSegment
    ? effectiveMacroPhaseForProceduralRow(params)
    : (params.pacingMacroPhase ?? 'flow');
  return buildSpawnDiagSnapshot(name, macro, ctx as Record<string, unknown>, params.rowIndex);
}

function spawnObstacleRowY(
  prevRow: ObstacleRowComponentData | null,
  initialY: number,
  blockHeight: number
): number {
  'worklet';
  return !prevRow
    ? initialY
    : getNextObstacleRowY(prevRow.y, blockHeight);
}

function spawnObstacleRowEntity(args: {
  ecs: ECS;
  sceneEntity: Entity;
  y: number;
  gaps: number[];
  rowLength: number;
  leftX: number;
  obstacleDimension: { width: number; height: number };
  prevRowEntity: Entity | null;
  beatRowIndex?: number;
  shaftSegmentEpoch?: number;
  spawnDiag?: Pick<
    ObstacleRowComponentData,
    'spawnDiagTemplateName' | 'spawnDiagBranchKey'
  >;
}): Entity {
  'worklet';
  const {
    ecs,
    sceneEntity,
    y,
    gaps,
    rowLength,
    leftX,
    obstacleDimension,
    prevRowEntity,
    beatRowIndex,
    shaftSegmentEpoch,
    spawnDiag,
  } = args;

  const containerWidth = rowLength * obstacleDimension.width;
  const rowCenterX = leftX + containerWidth / 2;

  const prevRowData = prevRowEntity
    ? (ecs.components[ObstacleRowComponentName].get(prevRowEntity) as
      | ObstacleRowComponentData
      | undefined)
    : undefined;
  const prevBelowGaps =
    prevRowData?.prevRowEntity != null
      ? (ecs.components[ObstacleRowComponentName].get(
        prevRowData.prevRowEntity
      ) as ObstacleRowComponentData | undefined)?.gaps ?? null
      : null;

  const layerArgs = {
    rowLength,
    leftX,
    blockWidth: obstacleDimension.width,
    blockHeight: obstacleDimension.height,
    rowCenterX,
    pickImage: pickSwimmerBlockImageStable,
  };

  const blockLayers = buildObstacleRowRenderLayers({
    ...layerArgs,
    gaps,
    rowY: y,
    rowBelowGaps: prevRowData?.gaps ?? null,
    rowAboveGaps: null,
  });
  const renderLayers = blockLayers;

  const rowEntity = ecs.createEntity();

  const columnGridWidth = obstacleDimension.width * LAYOUT_CONSTANTS.COLUMNS;
  const containerCenterX = leftX + columnGridWidth * 0.5;
  const solidColumnCentersX: number[] = [];
  for (let col = 0; col < rowLength; col++) {
    let isGap = false;
    for (let g = 0; g < gaps.length; g++) {
      if (gaps[g] === col) {
        isGap = true;
        break;
      }
    }
    if (!isGap) {
      solidColumnCentersX.push(
        getColumnCenterX(col, containerCenterX, columnGridWidth)
      );
    }
  }

  const obstacleRowComp = createObstacleRowComponent({
    y,
    gaps,
    solidColumnCentersX,
    prevRowEntity,
    beatRowIndex,
    shaftSegmentEpoch,
    ...spawnDiag,
  });

  const renderComponent = createWorldYSortedRenderComponent({
    shape: {
      type: ShapeTypes.Rectangle,
      width: containerWidth,
      height: obstacleDimension.height,
    },
    position: { x: rowCenterX, y },
    renderLayers,
    visible: true,
    renderLayer: SwimmerRenderLayer.Obstacles,
    tieBreaker: RenderSortTieBreaker.WorldXAsc,
  });

  ecs.addComponent(rowEntity, obstacleRowComp);
  ecs.addComponent(rowEntity, renderComponent);

  if (prevRowEntity && prevRowData) {
    const refreshedPrevLayers = buildObstacleRowRenderLayers({
      ...layerArgs,
      gaps: prevRowData.gaps,
      rowY: prevRowData.y,
      rowBelowGaps: prevBelowGaps,
      rowAboveGaps: gaps,
    });
    ecs.updateComponent<RenderComponentData>(
      prevRowEntity,
      RenderComponentName,
      (render) => {
        render.renderLayers = refreshedPrevLayers;
        render.isDirty = true;
      }
    );
  }

  ecs.updateComponent(
    sceneEntity,
    SceneComponentName,
    (scene: SceneComponentData) => {
      if (!scene.objects.entities.includes(rowEntity)) {
        scene.objects.entities.push(rowEntity);
      }
    }
  );

  return rowEntity;
}

const bumpTotalRowsGenerated = (ecs: ECS, managerEntity: Entity) => {
  'worklet';
  ecs.updateComponent<ObstaclesManagerComponentData>(
    managerEntity,
    ObstaclesManagerComponentName,
    (m) => {
      m.totalRowsGenerated = (m.totalRowsGenerated ?? 0) + 1;
    }
  );
};

const readPacingRunContextFromComponents = (
  components: Record<string, any>
): PacingRunContext | undefined => {
  'worklet';
  const session = getGameSession(components);
  return resolvePacingRunContext(
    session?.runBlueprint,
    session?.runAttemptIndex ?? 0
  );
};

const readPacingMacroPhase = (
  components: Record<string, any>,
  managerEntity: Entity
): MacroPhase => {
  'worklet';
  const mgr = components[ObstaclesManagerComponentName]?.get(
    managerEntity
  ) as ObstaclesManagerComponentData | undefined;
  const tr = mgr?.totalRowsGenerated ?? 0;
  const pacingCtx = readPacingRunContextFromComponents(components);
  return pacingPhaseToMacroPhase(pacingPhaseAtTotalRows(tr, pacingCtx));
};

/**
 * After each full macro cycle, re-roll `pathRunId` so multipath / proc rows don't repeat the same
 * layout stream while template ctx (chute, funnel, …) stays on one run.
 */
const bumpPathRunIdAfterCompletedMacroCycle = (
  ecs: ECS,
  components: Record<string, any>,
  managerEntity: Entity,
  templateCtxEntity: Entity
) => {
  'worklet';
  const mgr = components[ObstaclesManagerComponentName]?.get(managerEntity) as
    | ObstaclesManagerComponentData
    | undefined;
  const tr = mgr?.totalRowsGenerated ?? 0;
  if (mgr?.storyLockedProceduralSegment) {
    return;
  }
  const cycle = getPacingCycleState(tr, readPacingRunContextFromComponents(components));
  if (tr <= 0 || cycle.rowInCycle !== 0 || cycle.cycleStartTotalRows !== tr) {
    return;
  }
  ecs.updateComponent<TemplateContextComponentData>(
    templateCtxEntity,
    TemplateContextComponentName,
    (data) => {
      const c = data.ctx as Record<string, unknown>;
      const base = (c.baseRunSeed as number) ?? (c.pathRunId as number) ?? 0;
      c.pathRunId = mixU32(base >>> 0, cycle.cycleStartTotalRows >>> 0, 0x6379636c);
    }
  );
};

function sortGapsCopy(gaps: readonly number[] | undefined | null): number[] {
  'worklet';
  if (!gaps || gaps.length === 0) return [];
  const a = gaps.slice();
  a.sort((x, y) => x - y);
  return a;
}

function gapsEqual(
  a: readonly number[] | undefined | null,
  b: readonly number[] | undefined | null
): boolean {
  'worklet';
  const sa = sortGapsCopy(a);
  const sb = sortGapsCopy(b);
  if (sa.length !== sb.length) return false;
  for (let i = 0; i < sa.length; i++) {
    if (sa[i] !== sb[i]) return false;
  }
  return true;
}

/**
 * After a gap **set** change vs the previous band, stack extra rows that repeat the **new**
 * row’s gaps (runway for higher water speed). Does not call `template.getRow` again.
 * Declared after `spawnObstacleRowEntity` / `bumpTotalRowsGenerated` so the
 * Reanimated UI worklet closure sees defined callees (no TDZ / missing symbol at runtime).
 */
function signatureRunwayDupMinFromTemplateCtx(
  templateCtx: TemplateCtx
): number | undefined {
  'worklet';
  const kind = (templateCtx as Record<string, unknown>).lastSignatureSpawnKind as
    | string
    | undefined;
  if (kind === 'chute' || kind === 'hop') {
    return runProgressionTuning.SIGNATURE_TRANSFER_RUNWAY_DUP_MIN;
  }
  return undefined;
}

function appendGapShiftRunwayRows(args: {
  ecs: ECS;
  sceneEntity: Entity;
  managerEntity: Entity;
  prevRowBeforeNew: ObstacleRowComponentData | null;
  newRowEntity: Entity;
  newRowData: ObstacleRowComponentData;
  rowIndexForDiag: number;
  macroForRow: MacroPhase;
  spawnDiagTemplateName: string | undefined;
  templateCtx: TemplateCtx;
  leftX: number;
  rowLength: number;
  obstacleDimension: ObstacleBlockDimensions;
  /** Same basis as `proceduralStreamSalt` for this spawn — rows generated before the new band row. */
  runwayDupRowsBasisRows: number;
  /** When set, never stack fewer runway dup rows than this (signature chute / SNAP). */
  runwayDupMin?: number;
}): Entity {
  'worklet';
  // Platform shaft rows use exact beat-index timing for hazard bands. Injecting duplicate
  // runway rows here creates visible safe rows with no beatRowIndex, no hazard band, and no
  // collision between real shaft beats.
  if (args.spawnDiagTemplateName === 'platformShaftIntro') {
    return args.newRowEntity;
  }
  let dupCount = gapShiftRunwayDupRowsFromTotalRows(
    args.runwayDupRowsBasisRows,
    mixU32(args.runwayDupRowsBasisRows >>> 0, args.rowIndexForDiag, 0x72756e77)
  );
  if (typeof args.runwayDupMin === 'number' && args.runwayDupMin > dupCount) {
    dupCount = args.runwayDupMin;
  }
  if (dupCount <= 0) return args.newRowEntity;
  if (!args.prevRowBeforeNew) return args.newRowEntity;
  if (gapsEqual(args.prevRowBeforeNew.gaps, args.newRowData.gaps)) {
    return args.newRowEntity;
  }

  const { obstacleDimension } = args;
  const gapsToRepeat = args.newRowData.gaps.slice();
  let lastEntity = args.newRowEntity;
  let lastY = args.newRowData.y;

  for (let d = 0; d < dupCount; d++) {
    const y = getNextObstacleRowY(lastY, obstacleDimension.height);
    const rowEntity = spawnObstacleRowEntity({
      ecs: args.ecs,
      sceneEntity: args.sceneEntity,
      y,
      gaps: gapsToRepeat.slice(),
      rowLength: args.rowLength,
      leftX: args.leftX,
      obstacleDimension,
      prevRowEntity: lastEntity,
      spawnDiag: rowSpawnDiagFromParams(args.templateCtx, {
        rowIndex: args.rowIndexForDiag,
        ecs: args.ecs,
        sceneEntity: args.sceneEntity,
        prevRow: args.ecs.components[ObstacleRowComponentName].get(
          lastEntity
        ) as ObstacleRowComponentData | undefined ?? args.newRowData,
        prevRowEntity: lastEntity,
        initialY: y,
        rowLength: args.rowLength,
        leftX: args.leftX,
        obstacleDimension,
        pacingMacroPhase: args.macroForRow,
        spawnDiagTemplateName: args.spawnDiagTemplateName,
      }),
    });

    bumpTotalRowsGenerated(args.ecs, args.managerEntity);
    lastEntity = rowEntity;
    lastY = y;
  }

  return lastEntity;
}

const createObstacleRow: RowPathTemplate['getRow'] = (_ctx, params) => {
  'worklet';
  const { rowIndex, ecs, sceneEntity, prevRow, prevRowEntity, initialY, rowLength, leftX, obstacleDimension } = params;
  const pathRunId = ((_ctx as Record<string, unknown>).pathRunId as number) ?? 0;
  const macroPhase = params.pacingMacroPhase ?? 'flow';
  const stream = params.proceduralStreamSalt ?? 0;
  const tctx = _ctx as Record<string, unknown>;

  let gaps: number[];

  if (macroPhase !== 'flow') {
    clearFlowOpeningCtx(tctx);
    gaps = generateGapsDeterministic(
      !prevRow ? [] : prevRow.gaps,
      rowLength,
      rowIndex,
      pathRunId,
      macroPhase,
      stream,
      stream
    );
  } else {
    const lastSw =
      prevRow && prevRow.gaps?.length
        ? rowFromGaps(prevRow.gaps, rowLength)
        : null;
    const archetype = (tctx.openingArchetype as OpeningArchetype) ?? 'warmChute';
    const baseSeed = (tctx.baseRunSeed as number) ?? pathRunId;
    gaps = generateFlowOpeningRowGaps(
      tctx,
      lastSw,
      rowLength,
      stream,
      pathRunId,
      archetype,
      baseSeed
    );
  }
  gaps = finalizeGapsForObstacleRow(prevRow?.gaps, gaps, rowLength);
  const y = spawnObstacleRowY(prevRow, initialY, obstacleDimension.height);
  return spawnObstacleRowEntity({
    ecs,
    sceneEntity,
    y,
    gaps,
    rowLength,
    leftX,
    obstacleDimension,
    prevRowEntity,
    spawnDiag: rowSpawnDiagFromParams(_ctx, params),
  });
}

const getRowCount: RowPathTemplate['getRowCount'] = (ctx) => {
  'worklet';
  return templateRowCountDeterministic(ctx as Record<string, unknown>, 10, 10);
};

const BaseRowPathTemplate: RowPathTemplate = {
  getRowCount,
  getRow: createObstacleRow,
}

const baseMultiPathGetRow: RowPathTemplate['getRow'] = (_ctx, params) => {
  'worklet';
  const { rowIndex, ecs, sceneEntity, prevRow, prevRowEntity, initialY, rowLength, leftX, obstacleDimension } = params;
  const pathRunId = ((_ctx as Record<string, unknown>).pathRunId as number) ?? 0;
  const storySeg = params.storyLockedProceduralSegment;
  const macroPhase = effectiveMacroPhaseForProceduralRow(params);
  const stream = params.proceduralStreamSalt ?? 0;
  const xctx = _ctx as Record<string, unknown>;
  // Live session blueprint — template ctx can be stale if seeded before beginGameplay.
  const sessionForPacing = getGameSession(ecs.components);
  const pacingCtx = resolvePacingRunContext(
    sessionForPacing?.runBlueprint,
    sessionForPacing?.runAttemptIndex ?? 0
  );
  const climaxPreference = (xctx.climaxPreference as ClimaxPreference | undefined) ?? 'mixed';
  const pacingSnap = getPacingCycleState(stream, pacingCtx);

  if (macroPhase !== 'tension') {
    xctx.tensionStage = undefined;
    xctx.tensionFunnelStep = undefined;
    xctx.tensionFunnelDurationRows = undefined;
    xctx.tensionCenter = undefined;
    xctx.tensionParadoxEmitted = undefined;
  }
  if (macroPhase !== 'climax') {
    xctx.climaxStage = undefined;
    xctx.climaxPinballRows = undefined;
    xctx.climaxPinballState = undefined;
    xctx.climaxPinballSegmentTargetRows = undefined;
    xctx.climaxFalseSubRow = undefined;
    xctx.climaxFalseWallTotalRows = undefined;
    xctx.signaturePattern = undefined;
    xctx.signatureRowsEmitted = undefined;
    xctx.signatureRowBudget = undefined;
    xctx.signaturePinballState = undefined;
  }
  if (macroPhase !== 'release') {
    xctx.releaseRestZoneRowsEmitted = undefined;
    xctx.releaseRestZoneTargetRows = undefined;
  }
  if (macroPhase !== 'flow') {
    clearFlowOpeningCtx(xctx);
  }

  let gaps: number[];
  let pendingSignatureBossStartLog: string | undefined;
  let pendingSignatureRowLog:
    | {
      rowInBlock: number;
      sigBudget: number;
      stepLabel: string;
      isEnd: boolean;
    }
    | undefined;

  if (macroPhase === 'tension') {
    if (!xctx.tensionStage) {
      if (storySeg === 'paradoxSplit') {
        xctx.tensionStage = 'paradox';
        xctx.tensionParadoxEmitted = 0;
        xctx.tensionCenter = tensionGapCenterFromPrevGaps(
          !prevRow ? [] : prevRow.gaps,
          rowLength
        );
      } else if (storySeg === 'tensionMultipath') {
        xctx.tensionStage = 'free';
      } else {
        xctx.tensionStage = 'funnel';
        xctx.tensionFunnelStep = 0;
        xctx.tensionFunnelDurationRows = pathSegmentTensionFunnelDurationRows(
          stream,
          mixU32(pathRunId >>> 0, stream >>> 0, 0x66756e31),
          pacingSnap.tensionRows
        );
        xctx.tensionCenter = tensionGapCenterFromPrevGaps(
          !prevRow ? [] : prevRow.gaps,
          rowLength
        );
        xctx.tensionParadoxEmitted = 0;
      }
    }

    if (xctx.tensionStage === 'funnel') {
      const step = (xctx.tensionFunnelStep as number) ?? 0;
      const center = (xctx.tensionCenter as number) ?? Math.floor(rowLength / 2);
      const row = tensionFunnelRow(step, center, rowLength);
      gaps = gapsFromRow(row);
      const funnelCap = (xctx.tensionFunnelDurationRows as number) ?? 6;
      xctx.tensionFunnelStep = step + 1;
      if ((xctx.tensionFunnelStep as number) >= funnelCap) {
        if (storySeg === 'funnel') {
          xctx.tensionFunnelStep = 0;
          xctx.tensionFunnelDurationRows = pathSegmentTensionFunnelDurationRows(
            stream,
            mixU32(pathRunId >>> 0, stream >>> 0, 0x66756e32),
            pacingSnap.tensionRows
          );
        } else {
          xctx.tensionStage = 'paradox';
        }
      }
    } else if (xctx.tensionStage === 'paradox' && (xctx.tensionParadoxEmitted as number) < 1) {
      const center = (xctx.tensionCenter as number) ?? Math.floor(rowLength / 2);
      const row = tensionParadoxSplitRow(
        center,
        rowLength,
        !prevRow ? [] : prevRow.gaps
      );
      gaps = gapsFromRow(row);
      xctx.tensionParadoxEmitted = 1;
      if (storySeg === 'paradoxSplit') {
        xctx.tensionParadoxEmitted = 0;
      } else {
        xctx.tensionStage = 'free';
      }
    } else {
      gaps = generateMultiPathGapsDeterministic(
        !prevRow ? [] : prevRow.gaps,
        rowLength,
        rowIndex,
        pathRunId,
        macroPhase,
        stream,
        stream
      );
    }

  } else if (macroPhase === 'climax') {
    const signatureSliceFromCtx = (ctx: PacingRunContext | undefined) =>
      ctx
        ? {
          runSeed: ctx.blueprintRunSeed >>> 0,
          signaturePatternPool: ctx.signaturePatternPool,
          firstSignatureAtCycle: ctx.firstSignatureAtCycle,
          signatureEveryNCycles: ctx.signatureEveryNCycles,
        }
        : undefined;

    if (
      !xctx.climaxStage &&
      !xctx.signaturePattern &&
      !storySeg &&
      signatureSliceFromCtx(pacingCtx)
    ) {
      const cycleIndex = macroCycleIndex1Based(stream, pacingCtx);
      const consumedCycle = xctx.signatureConsumedCycleIndex as number | undefined;
      if (consumedCycle !== cycleIndex) {
        const sigSlice = signatureSliceFromCtx(pacingCtx)!;
        const pattern = resolveSignaturePattern(sigSlice, cycleIndex);
        if (pattern === 'pinballHop') {
          const budget = signaturePinballRowBudget();
          xctx.signatureConsumedCycleIndex = cycleIndex;
          xctx.signaturePattern = pattern;
          xctx.signatureRowsEmitted = 0;
          xctx.signatureRowBudget = budget;
          xctx.signaturePinballState = createSignaturePinballHopState(
            !prevRow ? [] : prevRow.gaps,
            rowLength,
            mixU32(pathRunId >>> 0, stream >>> 0, 0x73696770)
          );
          pendingSignatureBossStartLog = `[SignatureBoss] START pinballHop | macroCycle=${cycleIndex} | totalRows=${stream} | budget=${budget} rows (tap-tap-chute×${runProgressionTuning.SIGNATURE_PINBALL_BRIDGE_ROWS}-SNAP × ${runProgressionTuning.SIGNATURE_PINBALL_HOP_CYCLES})`;
        }
      }
    }

    const sigPattern = xctx.signaturePattern as SignaturePattern | undefined;
    const sigEmitted = (xctx.signatureRowsEmitted as number) ?? 0;
    const sigBudget = (xctx.signatureRowBudget as number) ?? 0;
    const inSignatureBlock =
      sigPattern === 'pinballHop' && sigEmitted < sigBudget && xctx.signaturePinballState;

    if (inSignatureBlock) {
      const st = xctx.signaturePinballState as ClimaxPinballState;
      const { row, state } = climaxPinballStep(st, rowLength);
      xctx.signaturePinballState = state;
      xctx.signatureRowsEmitted = sigEmitted + 1;
      gaps = gapsFromRow(row);
      const rowInBlock = sigEmitted + 1;
      const cycleLen = signaturePinballCycleRowCount();
      const stepInCycle = ((rowInBlock - 1) % cycleLen) + 1;
      const driftRows = runProgressionTuning.SIGNATURE_PINBALL_DRIFT_ROWS;
      const bridgeRows = runProgressionTuning.SIGNATURE_PINBALL_BRIDGE_ROWS;
      let stepLabel: string;
      if (stepInCycle <= driftRows) {
        stepLabel = `drift ${stepInCycle}`;
        xctx.lastSignatureSpawnKind = 'drift';
      } else if (stepInCycle <= driftRows + bridgeRows) {
        const chuteStep = stepInCycle - driftRows;
        stepLabel = `chute ${chuteStep}/${bridgeRows}`;
        xctx.lastSignatureSpawnKind = 'chute';
      } else {
        stepLabel = 'HOP (SNAP)';
        xctx.lastSignatureSpawnKind = 'hop';
      }
      pendingSignatureRowLog = {
        rowInBlock,
        sigBudget,
        stepLabel,
        isEnd: sigEmitted + 1 >= sigBudget,
      };
      if (sigEmitted + 1 >= sigBudget) {
        xctx.signaturePattern = undefined;
        xctx.signaturePinballState = undefined;
        xctx.signatureRowBudget = undefined;
      }
    } else {
      xctx.lastSignatureSpawnKind = undefined;
      if (!xctx.climaxStage) {
        if (storySeg === 'falseWall') {
          xctx.climaxStage = 'falseWall';
          xctx.climaxFalseSubRow = 0;
          xctx.climaxFalseWallTotalRows = pathSegmentClimaxFalseWallTotalRows(
            stream,
            mixU32(pathRunId >>> 0, stream >>> 0, 0x666c7731),
            pacingSnap.climaxRows
          );
        } else if (storySeg === 'climaxMultipath') {
          xctx.climaxStage = 'free';
        } else if (climaxPreference === 'falseWall') {
          xctx.climaxStage = 'falseWall';
          xctx.climaxFalseSubRow = 0;
          xctx.climaxFalseWallTotalRows = pathSegmentClimaxFalseWallSoloRows(
            stream,
            mixU32(pathRunId >>> 0, stream >>> 0, 0x666c7731),
            pacingSnap.climaxRows
          );
        } else {
          xctx.climaxStage = 'pinball';
          xctx.climaxPinballRows = 0;
          xctx.climaxPinballSegmentTargetRows = pathSegmentClimaxPinballSegmentRows(
            stream,
            mixU32(pathRunId >>> 0, stream >>> 0, 0x706e6231),
            pacingSnap.climaxRows
          );
          xctx.climaxPinballState = createClimaxPinballRollState(
            !prevRow ? [] : prevRow.gaps,
            rowLength,
            mixU32(pathRunId >>> 0, stream >>> 0, 0x706e6230)
          );
        }
      }

      if (xctx.climaxStage === 'pinball') {
        const rows = (xctx.climaxPinballRows as number) ?? 0;
        const pinCap = (xctx.climaxPinballSegmentTargetRows as number) ?? 8;
        if (rows < pinCap) {
          const st = xctx.climaxPinballState as ClimaxPinballState;
          const { row, state } = climaxPinballStep(st, rowLength);
          xctx.climaxPinballState = state;
          xctx.climaxPinballRows = rows + 1;
          gaps = gapsFromRow(row);
          if (rows + 1 >= pinCap) {
            if (storySeg === 'pinball') {
              xctx.climaxPinballRows = 0;
              xctx.climaxPinballSegmentTargetRows = pathSegmentClimaxPinballSegmentRows(
                stream,
                mixU32(pathRunId >>> 0, stream >>> 0, 0x706e6232),
                pacingSnap.climaxRows
              );
              xctx.climaxPinballState = createClimaxPinballRollState(
                !prevRow ? [] : prevRow.gaps,
                rowLength,
                mixU32(pathRunId >>> 0, stream >>> 0, 0x706e6232)
              );
            } else if (climaxPreference === 'mixed') {
              xctx.climaxStage = 'falseWall';
              xctx.climaxFalseSubRow = 0;
              xctx.climaxFalseWallTotalRows = pathSegmentClimaxFalseWallTotalRows(
                stream,
                mixU32(pathRunId >>> 0, stream >>> 0, 0x666c7733),
                pacingSnap.climaxRows,
                pinCap
              );
            } else {
              xctx.climaxStage = 'free';
            }
          }
        } else {
          gaps = generateMultiPathGapsDeterministic(
            !prevRow ? [] : prevRow.gaps,
            rowLength,
            rowIndex,
            pathRunId,
            macroPhase,
            stream,
            stream
          );
        }
      } else if (xctx.climaxStage === 'falseWall') {
        const sub = (xctx.climaxFalseSubRow as number) ?? 0;
        const fwTotal = (xctx.climaxFalseWallTotalRows as number) ?? FALSE_WALL_MIN_PHASE_ROWS_SINGLE_SEGMENT;
        const falseWallLayoutSalt = mixU32(pathRunId >>> 0, stream >>> 0, 0x666c7741);
        const row = climaxFalseWallRow(sub, rowLength, fwTotal, falseWallLayoutSalt);
        gaps = gapsFromRow(row);
        xctx.climaxFalseSubRow = sub + 1;
        if (sub + 1 >= fwTotal) {
          if (storySeg === 'falseWall') {
            xctx.climaxFalseSubRow = 0;
            xctx.climaxFalseWallTotalRows = pathSegmentClimaxFalseWallTotalRows(
              stream,
              mixU32(pathRunId >>> 0, stream >>> 0, 0x666c7732),
              pacingSnap.climaxRows
            );
          } else {
            xctx.climaxStage = 'free';
          }
        }
      } else {
        gaps = generateMultiPathGapsDeterministic(
          !prevRow ? [] : prevRow.gaps,
          rowLength,
          rowIndex,
          pathRunId,
          macroPhase,
          stream,
          stream
        );
      }
    }

  } else if (macroPhase === 'release') {
    if (storySeg === 'releaseRestZone') {
      gaps = releaseCatharticRestZoneGaps(rowLength);
    } else if (storySeg === 'releaseMultipath') {
      gaps = generateMultiPathGapsDeterministic(
        !prevRow ? [] : prevRow.gaps,
        rowLength,
        rowIndex,
        pathRunId,
        macroPhase,
        stream,
        stream
      );
    } else {
      const emitted = (xctx.releaseRestZoneRowsEmitted as number) ?? 0;
      if ((xctx.releaseRestZoneTargetRows as number) === undefined) {
        xctx.releaseRestZoneTargetRows = pathSegmentReleaseRestZoneRows(
          stream,
          mixU32(pathRunId >>> 0, stream >>> 0, 0x72656c31),
          pacingSnap.releaseRows
        );
      }
      const restCap = (xctx.releaseRestZoneTargetRows as number) ?? 10;
      if (emitted < restCap) {
        gaps = releaseCatharticRestZoneGaps(rowLength);
        xctx.releaseRestZoneRowsEmitted = emitted + 1;
      } else {
        gaps = generateMultiPathGapsDeterministic(
          !prevRow ? [] : prevRow.gaps,
          rowLength,
          rowIndex,
          pathRunId,
          macroPhase,
          stream,
          stream
        );
      }
    }
  } else if (
    macroPhase === 'flow' &&
    !storySeg &&
    stream < runProgressionTuning.OPENING_ARCHETYPE_MAX_ROWS
  ) {
    const lastSw =
      prevRow && prevRow.gaps?.length
        ? rowFromGaps(prevRow.gaps, rowLength)
        : null;
    const archetype = (xctx.openingArchetype as OpeningArchetype) ?? 'warmChute';
    const baseSeed = (xctx.baseRunSeed as number) ?? pathRunId;
    if (archetype === 'earlyFork') {
      gaps = generateMultiPathGapsDeterministic(
        !prevRow ? [] : prevRow.gaps,
        rowLength,
        rowIndex,
        pathRunId,
        macroPhase,
        stream,
        stream
      );
    } else {
      gaps = generateFlowOpeningRowGaps(
        xctx,
        lastSw,
        rowLength,
        stream,
        pathRunId,
        archetype,
        baseSeed
      );
    }
  } else {
    gaps = generateMultiPathGapsDeterministic(
      !prevRow ? [] : prevRow.gaps,
      rowLength,
      rowIndex,
      pathRunId,
      macroPhase,
      stream,
      stream
    );
  }
  gaps = finalizeGapsForObstacleRow(prevRow?.gaps, gaps, rowLength);
  if (pendingSignatureBossStartLog) {
    logSignatureBossDebug(pendingSignatureBossStartLog);
  }
  if (pendingSignatureRowLog) {
    const { rowInBlock, sigBudget, stepLabel, isEnd } = pendingSignatureRowLog;
    logSignatureBossDebug(
      `[SignatureBoss] row ${rowInBlock}/${sigBudget} | ${stepLabel} | gaps=[${gaps.join(',')}]`
    );
    if (isEnd) {
      logSignatureBossDebug(
        `[SignatureBoss] END → normal CLIMAX (climaxPreference=${climaxPreference})`
      );
    }
  }
  const y = spawnObstacleRowY(prevRow, initialY, obstacleDimension.height);
  return spawnObstacleRowEntity({
    ecs,
    sceneEntity,
    y,
    gaps,
    rowLength,
    leftX,
    obstacleDimension,
    prevRowEntity,
    spawnDiag: rowSpawnDiagFromParams(_ctx, params),
  });
};

const BaseMultiPathRowPathTemplate: RowPathTemplate = {
  getRowCount,
  getRow: baseMultiPathGetRow,
};

/** Default run: multipath for every phase so FLOW is not stuck on chute+chicane only (~36% of rows). */
const directedGetRow: RowPathTemplate['getRow'] = (_ctx, params) => {
  'worklet';
  return baseMultiPathGetRow(_ctx, params);
};

/** Keep `directed` on one template run so macro pacing (FLOW→…→RELEASE) stays continuous — no periodic rollover. */
const directedGetRowCount: RowPathTemplate['getRowCount'] = (_ctx) => {
  'worklet';
  return 2000000;
};

const DirectedRowPathTemplate: RowPathTemplate = {
  getRowCount: directedGetRowCount,
  getRow: directedGetRow,
};

const restGetRowCount: RowPathTemplate['getRowCount'] = (ctx) => {
  'worklet';
  return templateRowCountDeterministic(ctx as Record<string, unknown>, 10, 5);
};

const restGetRow: RowPathTemplate['getRow'] = (_ctx, params) => {
  'worklet';
  const { ecs, prevRow, initialY, obstacleDimension, prevRowEntity, rowLength, sceneEntity, leftX } = params;
  const y = spawnObstacleRowY(prevRow, initialY, obstacleDimension.height);
  const interior: number[] = [];
  for (let c = 1; c < rowLength - 1; c++) {
    interior.push(c);
  }
  const prevGaps = !prevRow ? [] : prevRow.gaps ?? [];
  let gaps = unionMinimalSeam(prevGaps, interior.slice(), rowLength);
  gaps = finalizeGapsForObstacleRow(prevGaps, gaps, rowLength);
  return spawnObstacleRowEntity({
    ecs,
    sceneEntity,
    y,
    gaps,
    rowLength,
    leftX,
    obstacleDimension,
    prevRowEntity,
    spawnDiag: rowSpawnDiagFromParams(_ctx, params),
  });
};

const RestRowPathTemplate: RowPathTemplate = {
  getRowCount: restGetRowCount,
  getRow: restGetRow
}


const spawnPlatformShaftRow = (params: PlatformShaftSpawnRowArgs): Entity => {
  'worklet';
  return spawnObstacleRowEntity(params);
};

function maybeSpawnPlatformShaftHazardsForRow(args: {
  ecs: ECS;
  sceneEntity: Entity;
  templateName: string;
  ctx: TemplateCtx;
  rowIndex: number;
  rowEntity: Entity;
  leftX: number;
  obstacleDimension: { width: number; height: number };
}): void {
  'worklet';
  if (!PLATFORM_SHAFT_ROW_HAZARD_BANDS) {
    return;
  }
  if (args.templateName !== 'platformShaftIntro') {
    return;
  }
  const rowData = args.ecs.components[ObstacleRowComponentName].get(
    args.rowEntity
  ) as ObstacleRowComponentData | undefined;
  if (!rowData) {
    return;
  }
  maybeSpawnMovingHazardsForRow({
    ecs: args.ecs,
    sceneEntity: args.sceneEntity,
    ctx: args.ctx as PlatformShaftTemplateCtx,
    rowIndex: args.rowIndex,
    rowEntity: args.rowEntity,
    rowData,
    leftX: args.leftX,
    rowLength: LAYOUT_CONSTANTS.COLUMNS,
    obstacleDimension: args.obstacleDimension,
  });
}

const spawnObstacleRowFromTemplate = (params: {
  ecs: ECS;
  sceneEntity: Entity;
  y: number;
  gaps: number[];
  rowLength: number;
  leftX: number;
  obstacleDimension: { width: number; height: number };
  prevRowEntity: Entity | null;
  spawnDiag?: Pick<
    ObstacleRowComponentData,
    'spawnDiagTemplateName' | 'spawnDiagBranchKey'
  >;
}): Entity => {
  'worklet';
  return spawnObstacleRowEntity(params);
};

const SmilyRowPathTemplate: RowPathTemplate = createJsonLevelRowPathTemplate({
  levelJson: smilyLevelJson,
  spawnRow: spawnObstacleRowFromTemplate,
  diagTemplateName: 'smily',
});

const JellyfishRowPathTemplate: RowPathTemplate = createJsonLevelRowPathTemplate({
  levelJson: jellyfishLevelJson,
  spawnRow: spawnObstacleRowFromTemplate,
  diagTemplateName: 'jellyfish',
});

const MickyRowPathTemplate: RowPathTemplate = createJsonLevelRowPathTemplate({
  levelJson: mickyLevelJson,
  spawnRow: spawnObstacleRowFromTemplate,
  diagTemplateName: 'micky',
});

const KittyRowPathTemplate: RowPathTemplate = createJsonLevelRowPathTemplate({
  levelJson: kittyLevelJson,
  spawnRow: spawnObstacleRowFromTemplate,
  diagTemplateName: 'kitty',
});

const DeadpoolRowPathTemplate: RowPathTemplate = createJsonLevelRowPathTemplate({
  levelJson: deadpoolLevelJson,
  spawnRow: spawnObstacleRowFromTemplate,
  diagTemplateName: 'deadpool',
});

const MegamanRowPathTemplate: RowPathTemplate = createJsonLevelRowPathTemplate({
  levelJson: megamanLevelJson,
  spawnRow: spawnObstacleRowFromTemplate,
  diagTemplateName: 'megaman',
});


const PlatformShaftIntroRowPathTemplate: RowPathTemplate = createPlatformShaftRowPathTemplate({
  spawnRow: spawnPlatformShaftRow,
  diagTemplateName: 'platformShaftIntro',
});

const MappedTemplates: Record<string, RowPathTemplate> = {
  platformShaftIntro: PlatformShaftIntroRowPathTemplate,
  directed: DirectedRowPathTemplate,
  base: BaseRowPathTemplate,
  baseMulti: BaseMultiPathRowPathTemplate,
  rest: RestRowPathTemplate,
  'smily': SmilyRowPathTemplate,
  'jellyfish': JellyfishRowPathTemplate,
  'micky': MickyRowPathTemplate,
  'kitty': KittyRowPathTemplate,
  'deadpool': DeadpoolRowPathTemplate,
  'megaman': MegamanRowPathTemplate,
};

/** Story / debug lock only — must match a key in {@link MappedTemplates}. */
function resolveLockedTemplateName(
  lockedTemplateName: string | undefined
): string | undefined {
  'worklet';
  if (!lockedTemplateName) return undefined;
  return MappedTemplates[lockedTemplateName] ? lockedTemplateName : undefined;
}

function selectTemplate(args: {
  ecs: ECS;
  components: Record<string, any>;
  managerEntity: Entity;
  currentTemplateContextEntity: Entity | null | undefined;
  templateName: string;
  initArgs: TemplateInitArgs;
}): {
  template: RowPathTemplate;
  templateName: string;
  ctxEntity: Entity;
  ctx: TemplateCtx;
  rowCount: number;
  runId: number;
} {
  'worklet';
  const { ecs, components, currentTemplateContextEntity, templateName, initArgs } = args;

  const template = MappedTemplates[templateName] ?? BaseRowPathTemplate;
  const ctxEntity =
    typeof currentTemplateContextEntity === 'number'
      ? currentTemplateContextEntity
      : getOrCreateTemplateContextEntity(ecs);

  const session = getGameSession(components);
  const nextRunId = (session?.runSeed ?? 0) >>> 0;
  const openingArchetype = session?.runBlueprint?.openingArchetype ?? 'warmChute';
  const cyclePersonality = session?.runBlueprint?.cyclePersonality ?? 'flowHeavy';
  const climaxPreference = session?.runBlueprint?.climaxPreference ?? 'mixed';
  const pacingRunContext = resolvePacingRunContext(
    session?.runBlueprint,
    session?.runAttemptIndex ?? 0
  );
  const ctx: TemplateCtx = template.createCtx ? template.createCtx() : {};
  (ctx as Record<string, unknown>).pathRunId = nextRunId;
  (ctx as Record<string, unknown>).baseRunSeed = nextRunId;
  (ctx as Record<string, unknown>).openingArchetype = openingArchetype;
  (ctx as Record<string, unknown>).cyclePersonality = cyclePersonality;
  (ctx as Record<string, unknown>).climaxPreference = climaxPreference;
  (ctx as Record<string, unknown>).pacingRunContext = pacingRunContext;

  const ctxData = components[TemplateContextComponentName]?.get(
    ctxEntity
  ) as TemplateContextComponentData | undefined;

  if (templateName === 'platformShaftIntro') {
    const mgr = components[ObstaclesManagerComponentName]?.get(args.managerEntity) as
      | ObstaclesManagerComponentData
      | undefined;
    const prevEpoch =
      ((ctxData?.ctx ?? {}) as PlatformShaftTemplateCtx).shaftSegmentEpoch ?? 0;
    (ctx as Record<string, unknown>).platformShaftRecipe = mgr?.storyLockedShaftRecipe;
    (ctx as Record<string, unknown>).platformShaftSeed = mgr?.storyLockedShaftSeed ?? 42;
    (ctx as Record<string, unknown>).platformShaftDifficulty =
      mgr?.storyLockedShaftDifficulty ?? 0.4;
    (ctx as Record<string, unknown>).columns = initArgs.rowLength;
    if (template.init) {
      template.init(ctx, initArgs);
    }
    (ctx as PlatformShaftTemplateCtx).shaftSegmentEpoch = prevEpoch + 1;
  } else if (template.init) {
    template.init(ctx, initArgs);
  }

  const rowCount = template.getRowCount(ctx);

  ecs.updateComponent<TemplateContextComponentData>(
    ctxEntity,
    TemplateContextComponentName,
    (data) => {
      data.templateName = templateName;
      data.ctx = ctx;
      data.runId = nextRunId;
    }
  );

  return {
    template,
    templateName,
    ctxEntity,
    ctx,
    rowCount,
    runId: nextRunId,
  };
}

/**
 * ObstacleSystem - Manages obstacle spawning, movement, and removal for the swimmer game
 *
 * This system:
 * - Seeds initial obstacle rows when none exist (above container top to ~30% from top)
 * - Moves obstacles downward at water speed (raisingSpeed) every frame
 * - Spawns new rows on a timer after the initial phase
 * - Removes obstacles that pass below the container bottom
 * - Default path templates: `base` (single-corridor when not FLOW) and `baseMulti` / `directed`
 *   (multipath). `directed` uses the same multipath row generator for all macro phases so FLOW
 *   still gets branching corridors. JSON-shaped levels are only used when `ObstacleView` passes
 *   `lockedTemplateName` (e.g. Storybook).
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

    const lockedTemplateName = managerData.lockedTemplateName;
    const lock = resolveLockedTemplateName(lockedTemplateName);

    const containerEntity = firstEntityFromStore(
      components[ContainerComponentName]
    );
    if (containerEntity === undefined) {
      return;
    }

    const containerData = components[ContainerComponentName]?.get(
      containerEntity
    ) as ContainerComponentData | undefined;

    if (!containerData) {
      return;
    }

    const waterEntity = firstEntityFromStore(components[WaterComponentName]);
    if (waterEntity === undefined) {
      return;
    }

    const waterData = components[WaterComponentName]?.get(waterEntity) as
      | WaterComponentData
      | undefined;

    if (!waterData) {
      return;
    }

    const deltaSeconds = deltaTime / 1000;
    const containerTop = containerData.centerY - containerData.height / 2;
    const containerBottom = containerData.centerY + containerData.height / 2;

    const firstSwimmer = firstDataFromStore(components[SwimmerComponentName]) as
      | SwimmerComponentData
      | undefined;
    const isInInitialPhase = firstSwimmer?.isInInitialPhase === true;
    const session = getGameSession(components);
    const isStartReadyPhase = isStartReady(session);
    const isGameOver = isGameOverPhase(session);

    const sceneEntity = findSceneEntityByKey(components, managerData.sceneKey);

    const deltaY =
      isStartReadyPhase || isGameOver ? 0 : waterData.raisingSpeed * deltaSeconds;

    if (typeof sceneEntity !== 'number') return;

    const maxY = containerTop + containerData.height * 0.3; // 30% from top

    const leftX = containerData.centerX -
      containerData.width / 2
    const columnWidth = getObstacleWidth(containerData.width);
    const obstacleDimension = obstacleBlockDimensionsFromColumnWidth(columnWidth);
    const blockHeight = obstacleDimension.height;
    const rowStore = components[ObstacleRowComponentName];
    if (!rowStore) {
      return;
    }
    const waterSurfaceY = containerData.waterSurfaceY;
    const transitionBand = waterTransitionBandFromSurface(waterSurfaceY, blockHeight);
    const transitionTargetY = transitionBand.transitionTargetY;
    const currentCenterRowEntity = waterData.centerRowEntity;
    let nearestRowEntity: number | undefined;
    let nearestRowDistance = Number.POSITIVE_INFINITY;
    let nearestOverlapRowEntity: number | undefined;
    let nearestOverlapDistance = Number.POSITIVE_INFINITY;
    let currentRowDistance = Number.POSITIVE_INFINITY;
    rowStore.forEach((obstacleRowEntity, rowData) => {
      let newY = rowData.y + deltaY

      if (newY > containerBottom + LAYOUT_CONSTANTS.REMOVAL_THRESHOLD_OFFSET) {
        const removeRequest: RemoveEntityBatchRequest = {
          type: RemoveEntityBatchRequestType,
          payload: { entityIds: [obstacleRowEntity], sceneKey: managerData.sceneKey },
        };
        eventQueue.addEvent(removeRequest);
        return;
      }

      ecs.updateComponent<ObstacleRowComponentData>(obstacleRowEntity, ObstacleRowComponentName, (row) => {
        row.y = newY
      })
      ecs.updateComponent<RenderComponentData>(
        obstacleRowEntity,
        RenderComponentName,
        (render) => {
          render.position = {
            x: containerData.centerX,
            y: newY,
          };
        }
      );
      const rowTop = newY - blockHeight / 2;
      const rowBottom = newY + blockHeight / 2;
      const rowCenterDistance = Math.abs(newY - transitionTargetY);
      const overlapsTransitionBand = rowOverlapsTransitionBand(
        newY,
        blockHeight,
        transitionBand
      );
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
    })
    // Heal broken prevRowEntity links after rows scroll off (removal does not patch pointers).
    let needsHeal = false;
    rowStore.forEach((_rowEntity, rowData) => {
      if (needsHeal) {
        return;
      }
      if (
        rowData.prevRowEntity != null &&
        !rowStore.get(rowData.prevRowEntity)
      ) {
        needsHeal = true;
      }
    });
    if (needsHeal) {
      rowStore.forEach((rowEntity, rowData) => {
        if (!rowData.prevRowEntity) {
          return;
        }
        const prevLive = rowStore.get(rowData.prevRowEntity) as
          | ObstacleRowComponentData
          | undefined;
        if (prevLive) {
          return;
        }
        let bestEnt: Entity | null = null;
        let bestDy = Number.POSITIVE_INFINITY;
        const y0 = rowData.y;
        rowStore.forEach((other, od) => {
          if (other === rowEntity) {
            return;
          }
          const dy = od.y - y0;
          if (dy > 0 && dy < bestDy) {
            bestDy = dy;
            bestEnt = other;
          }
        });
        ecs.updateComponent<ObstacleRowComponentData>(
          rowEntity,
          ObstacleRowComponentName,
          (r) => {
            r.prevRowEntity = bestEnt;
          }
        );
      });
    }
    const candidateCenterRowEntity = nearestOverlapRowEntity ?? nearestRowEntity;
    let centerRowEntity = candidateCenterRowEntity;
    if (
      typeof currentCenterRowEntity === 'number' &&
      Number.isFinite(currentRowDistance)
    ) {
      const holdDistance = blockHeight * 0.62;
      const switchAdvantage = blockHeight * 0.18;
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
    const trForPacing = managerData.totalRowsGenerated ?? 0;
    const pacingCtxForRelease = readPacingRunContextFromComponents(components);
    const inReleaseRestZone =
      pacingPhaseToMacroPhase(pacingPhaseAtTotalRows(trForPacing, pacingCtxForRelease)) ===
      'release';

    ecs.updateComponent<WaterComponentData>(waterEntity, WaterComponentName, (waterData) => {
      waterData.releaseRestZoneActive = inReleaseRestZone;
      if (typeof centerRowEntity === 'number') {
        waterData.centerRowEntity = centerRowEntity;
      }
    });
    const postWater = components[WaterComponentName]?.get(waterEntity) as WaterComponentData | undefined;
    const centerForPlayerDiag =
      postWater && typeof postWater.centerRowEntity === 'number'
        ? postWater.centerRowEntity
        : undefined;
    maybeLogPlayerActiveObstacleRowTemplate(ecs, components, managerEntity, centerForPlayerDiag);

    if (PLATFORM_SHAFT_ROW_HAZARD_BANDS) {
      mergeRowHazardPass({ ecs, components, deltaTime, eventQueue });
    }

    // Seed initial obstacles when none exist (either during initial phase or when starting with water at center)
    const shouldSeedInitialObstacles =
      rowStore.count() === 0 && !isGameOver;

    if (shouldSeedInitialObstacles) {
      let lastRowEntity: Entity | null = null
      const initArgs: TemplateInitArgs = {
        ecs,
        sceneEntity,
        rowLength: LAYOUT_CONSTANTS.COLUMNS,
        leftX,
        obstacleDimension,
        initialY: maxY,
      };

      const initialTemplateName = resolveEffectiveTemplateName(components, managerEntity, lock);

      // Initial segment: `directed` = phase-driven base vs baseMulti; story lock may pick JSON etc.
      const selected = selectTemplate({
        ecs,
        components,
        managerEntity,
        currentTemplateContextEntity: managerData.templateInfo?.templateContextEntity,
        templateName: initialTemplateName,
        initArgs,
      });

      let activeTemplateName = selected.templateName;
      let activeTemplate = selected.template;
      let activeCtx = selected.ctx;
      let activeRowCount = selected.rowCount;
      let activeCtxEntity = selected.ctxEntity;
      let activeRowIndex = 0; // next row index within current template

      const rowsInDisplay = Math.ceil((maxY - blockHeight) / blockHeight) + 1

      for (let i = 0; i < rowsInDisplay; i++) {
        const prevRow = lastRowEntity ? ecs.components[ObstacleRowComponentName].get(lastRowEntity) as ObstacleRowComponentData : null

        // If we've reached the end of the active template, switch to the next template
        // and continue filling the seed rows.
        if (activeRowIndex > activeRowCount - 1) {
          const newTemplateName = resolveTemplateNameOnRollover(components, managerEntity, lock);
          const nextSelected = selectTemplate({
            ecs,
            components,
            managerEntity,
            currentTemplateContextEntity: activeCtxEntity,
            templateName: newTemplateName,
            initArgs,
          });
          activeTemplateName = nextSelected.templateName;
          activeTemplate = nextSelected.template;
          activeCtx = nextSelected.ctx;
          activeRowCount = nextSelected.rowCount;
          activeCtxEntity = nextSelected.ctxEntity;
          activeRowIndex = 0;
        }

        const macroForRow = readPacingMacroPhase(components, managerEntity);
        const proceduralStreamSalt =
          (components[ObstaclesManagerComponentName]?.get(managerEntity) as
            | ObstaclesManagerComponentData
            | undefined)?.totalRowsGenerated ?? 0;
        const spawnedRowIndex = activeRowIndex;
        lastRowEntity = activeTemplate.getRow(activeCtx, {
          rowIndex: spawnedRowIndex,
          ecs,
          sceneEntity,
          prevRow,
          prevRowEntity: lastRowEntity,
          initialY: maxY,
          rowLength: LAYOUT_CONSTANTS.COLUMNS,
          leftX,
          obstacleDimension,
          pacingMacroPhase: macroForRow,
          spawnDiagTemplateName: activeTemplateName,
          proceduralStreamSalt,
          storyLockedProceduralSegment: readStoryLockedProceduralSegment(
            components,
            managerEntity
          ),
        });
        const newRowData = ecs.components[ObstacleRowComponentName].get(
          lastRowEntity
        ) as ObstacleRowComponentData;
        lastRowEntity = appendGapShiftRunwayRows({
          ecs,
          sceneEntity,
          managerEntity,
          prevRowBeforeNew: prevRow,
          newRowEntity: lastRowEntity,
          newRowData,
          rowIndexForDiag: spawnedRowIndex,
          macroForRow: macroForRow,
          spawnDiagTemplateName: activeTemplateName,
          templateCtx: activeCtx,
          leftX,
          rowLength: LAYOUT_CONSTANTS.COLUMNS,
          obstacleDimension,
          runwayDupRowsBasisRows: proceduralStreamSalt,
          runwayDupMin: signatureRunwayDupMinFromTemplateCtx(activeCtx),
        });
        bumpTotalRowsGenerated(ecs, managerEntity);
        bumpPathRunIdAfterCompletedMacroCycle(ecs, components, managerEntity, activeCtxEntity);
        maybeLogObstacleRowGeneration(ecs, components, managerEntity, {
          templateName: activeTemplateName,
          macroPhase: macroForRow,
          templateCtx: activeCtx as Record<string, unknown>,
          rowIndex: spawnedRowIndex,
        });
        maybeSpawnPlatformShaftHazardsForRow({
          ecs,
          sceneEntity,
          templateName: activeTemplateName,
          ctx: activeCtx,
          rowIndex: spawnedRowIndex,
          rowEntity: lastRowEntity,
          leftX,
          obstacleDimension,
        });
        activeRowIndex += 1;
      }
      // Reset timer after re-seeding
      ecs.updateComponent<ObstaclesManagerComponentData>(
        managerEntity,
        ObstaclesManagerComponentName,
        (m) => {
          m.spawnTimerSeconds = 0;
          m.templateInfo = {
            // Persist the currently active template after seeding so subsequent frames
            // continue spawning from the correct template + row index.
            currentTemplateName: activeTemplateName,
            currentTempalteTotalRow: activeRowCount,
            currentRowIndex: activeRowIndex,
            lastRowEntity: lastRowEntity,
            templateContextEntity: activeCtxEntity,
          }
        }
      );
    } else if (!isInInitialPhase && !isStartReadyPhase && !isGameOver) {
      // Post-initial phase: Time-based spawning based on obstacle movement distance
      const rowHeight = blockHeight;
      const distancePerRow = getObstacleRowPitch(rowHeight);
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

      if (lastRowData && lastRowData.y > (- blockHeight) && updatedManager?.templateInfo) {
        ecs.updateComponent<ObstaclesManagerComponentData>(
          managerEntity,
          ObstaclesManagerComponentName,
          (m) => {
            m.spawnTimerSeconds = 0;
          }
        );
        const templateInfo = updatedManager.templateInfo

        const activeCtxEntity = templateInfo.templateContextEntity
        const ctxEntity =
          typeof activeCtxEntity === 'number'
            ? activeCtxEntity
            : getOrCreateTemplateContextEntity(ecs);
        const ctxData = components[TemplateContextComponentName]?.get(
          ctxEntity
        ) as TemplateContextComponentData | undefined;
        // Use live ctx from ECS (do not shallow-copy): getRow mutates flow/tension/climax state in place.
        const ctx: TemplateCtx = (ctxData?.ctx ?? {}) as TemplateCtx;
        (ctx as Record<string, unknown>).pathRunId =
          (ctx as Record<string, unknown>).pathRunId ?? ctxData?.runId ?? 0;

        const template = MappedTemplates[templateInfo.currentTemplateName]

        const lastRowEntinty = templateInfo.lastRowEntity

        let lastRowIndex = templateInfo.currentRowIndex
        let totalRow = templateInfo.currentTempalteTotalRow

        if (lastRowIndex > totalRow - 1) {
          const newTemplateName = resolveTemplateNameOnRollover(components, managerEntity, lock);
          // Do not purge hazard bands on loop rollover: prior-epoch rows are still on screen
          // for many frames. Epoch-tagged spawn + merge pass strip when members scroll off.
          const initArgs: TemplateInitArgs = {
            ecs,
            sceneEntity,
            rowLength: LAYOUT_CONSTANTS.COLUMNS,
            leftX,
            obstacleDimension,
            initialY: maxY,
          };

          const selected = selectTemplate({
            ecs,
            components,
            managerEntity,
            currentTemplateContextEntity: ctxEntity,
            templateName: newTemplateName,
            initArgs,
          });
          let newTemplate = selected.template
          let newRowCount = selected.rowCount
          const prevRow = templateInfo.lastRowEntity ? ecs.components[ObstacleRowComponentName].get(templateInfo.lastRowEntity) as ObstacleRowComponentData : null

          const macroForRow = readPacingMacroPhase(components, managerEntity);
          const proceduralStreamSalt = updatedManager?.totalRowsGenerated ?? 0;
          let newRowEntity = newTemplate.getRow(selected.ctx, {
            rowIndex: 0,
            ecs,
            sceneEntity,
            prevRow: prevRow,
            prevRowEntity: templateInfo.lastRowEntity,
            initialY: maxY,
            rowLength: LAYOUT_CONSTANTS.COLUMNS,
            leftX,
            obstacleDimension,
            pacingMacroPhase: macroForRow,
            spawnDiagTemplateName: newTemplateName,
            proceduralStreamSalt,
            storyLockedProceduralSegment: readStoryLockedProceduralSegment(
              components,
              managerEntity
            ),
          });
          const newRowData = ecs.components[ObstacleRowComponentName].get(
            newRowEntity
          ) as ObstacleRowComponentData;
          newRowEntity = appendGapShiftRunwayRows({
            ecs,
            sceneEntity,
            managerEntity,
            prevRowBeforeNew: prevRow,
            newRowEntity,
            newRowData,
            rowIndexForDiag: 0,
            macroForRow: macroForRow,
            spawnDiagTemplateName: newTemplateName,
            templateCtx: selected.ctx,
            leftX,
            rowLength: LAYOUT_CONSTANTS.COLUMNS,
            obstacleDimension,
            runwayDupRowsBasisRows: proceduralStreamSalt,
            runwayDupMin: signatureRunwayDupMinFromTemplateCtx(selected.ctx),
          });
          bumpTotalRowsGenerated(ecs, managerEntity);
          bumpPathRunIdAfterCompletedMacroCycle(ecs, components, managerEntity, selected.ctxEntity);
          maybeLogObstacleRowGeneration(ecs, components, managerEntity, {
            templateName: newTemplateName,
            macroPhase: macroForRow,
            templateCtx: selected.ctx as Record<string, unknown>,
            rowIndex: 0,
          });
          maybeSpawnPlatformShaftHazardsForRow({
            ecs,
            sceneEntity,
            templateName: newTemplateName,
            ctx: selected.ctx,
            rowIndex: 0,
            rowEntity: newRowEntity,
            leftX,
            obstacleDimension,
          });
          // Reset timer after re-seeding
          ecs.updateComponent<ObstaclesManagerComponentData>(
            managerEntity,
            ObstaclesManagerComponentName,
            (m) => {
              m.templateInfo = {
                currentTemplateName: newTemplateName,
                currentTempalteTotalRow: newRowCount,
                currentRowIndex: 1,
                lastRowEntity: newRowEntity,
                templateContextEntity: selected.ctxEntity,
              }
            }
          );
        } else if (updatedManager.templateInfo) {
          const prevRow = templateInfo.lastRowEntity ? ecs.components[ObstacleRowComponentName].get(templateInfo.lastRowEntity) as ObstacleRowComponentData : null

          const macroForRow = readPacingMacroPhase(components, managerEntity);
          const proceduralStreamSalt = updatedManager?.totalRowsGenerated ?? 0;
          let newRowEntity = template.getRow(ctx, {
            rowIndex: lastRowIndex,
            ecs,
            sceneEntity,
            prevRow: prevRow,
            prevRowEntity: templateInfo.lastRowEntity,
            initialY: maxY,
            rowLength: LAYOUT_CONSTANTS.COLUMNS,
            leftX,
            obstacleDimension,
            pacingMacroPhase: macroForRow,
            spawnDiagTemplateName: templateInfo.currentTemplateName,
            proceduralStreamSalt,
            storyLockedProceduralSegment: readStoryLockedProceduralSegment(
              components,
              managerEntity
            ),
          });
          const newRowData = ecs.components[ObstacleRowComponentName].get(
            newRowEntity
          ) as ObstacleRowComponentData;
          newRowEntity = appendGapShiftRunwayRows({
            ecs,
            sceneEntity,
            managerEntity,
            prevRowBeforeNew: prevRow,
            newRowEntity,
            newRowData,
            rowIndexForDiag: lastRowIndex,
            macroForRow: macroForRow,
            spawnDiagTemplateName: templateInfo.currentTemplateName,
            templateCtx: ctx,
            leftX,
            rowLength: LAYOUT_CONSTANTS.COLUMNS,
            obstacleDimension,
            runwayDupRowsBasisRows: proceduralStreamSalt,
            runwayDupMin: signatureRunwayDupMinFromTemplateCtx(ctx),
          });

          bumpTotalRowsGenerated(ecs, managerEntity);
          bumpPathRunIdAfterCompletedMacroCycle(ecs, components, managerEntity, ctxEntity);
          maybeLogObstacleRowGeneration(ecs, components, managerEntity, {
            templateName: templateInfo.currentTemplateName,
            macroPhase: macroForRow,
            templateCtx: ctx as Record<string, unknown>,
            rowIndex: lastRowIndex,
          });
          maybeSpawnPlatformShaftHazardsForRow({
            ecs,
            sceneEntity,
            templateName: templateInfo.currentTemplateName,
            ctx,
            rowIndex: lastRowIndex,
            rowEntity: newRowEntity,
            leftX,
            obstacleDimension,
          });
          ecs.updateComponent<ObstaclesManagerComponentData>(
            managerEntity,
            ObstaclesManagerComponentName,
            (m) => {
              if (updatedManager.templateInfo) {
                m.templateInfo = {
                  ...updatedManager.templateInfo,
                  currentRowIndex: (updatedManager.templateInfo.currentRowIndex || 0) + 1,
                  lastRowEntity: newRowEntity,
                  templateContextEntity: ctxEntity,
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
