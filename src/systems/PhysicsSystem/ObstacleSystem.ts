import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  firstDataFromStore,
  firstEntityFromStore,
  findSceneEntityByKey,
} from '@/containers/ReactNativeSkiaGameEngine/services-ecs/query';
import {
  ShapeTypes,
  createRenderComponent,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
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
import { getGameSession, isStartReady } from '@/Game/session/gameSessionQuery';
import { buildObstacleRowRenderLayers } from '@/Game/render/buildObstacleRowRenderLayers';
import {
  getColumnCenterX,
  getObstacleWidth,
  LAYOUT_CONSTANTS,
  FALSE_WALL_MIN_PHASE_ROWS_SINGLE_SEGMENT,
} from '@/Layout';
import {
  gapShiftRunwayDupRowsFromTotalRows,
  pathSegmentClimaxFalseWallTotalRows,
  pathSegmentClimaxPinballSegmentRows,
  pathSegmentFlowChuteRowsBeforeChicane,
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
} from '@/Game/ecs-systems/obstacleSystem';
import {
  getOrCreateTemplateContextEntity,
  TemplateContextComponentData,
  TemplateContextComponentName,
} from '@/Game/ecs-components/TemplateContextComponent';
import { createJsonLevelRowPathTemplate } from '@/Game/templates/obstacles/jsonLevelRowPathTemplate';
import { mixU32, intMod, randomU32 } from '@/Game/path/deterministicMix';
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
  CHICANE_DEFAULT_BLOCK_N,
  type ChicaneState,
  createChicaneStateFromEntryCenter,
  extractTripleGapCenter,
  flowChicaneNextRow,
  flowChuteNextRow,
} from '@/Game/path/flowGenerators';
import {
  tensionFunnelRow,
  tensionGapCenterFromPrevGaps,
  tensionParadoxSplitRow,
} from '@/Game/path/tensionGenerators';
import {
  climaxFalseWallRow,
  createClimaxPinballRollState,
  climaxPinballStep,
  type ClimaxPinballState,
} from '@/Game/path/climaxGenerators';
import {
  buildSpawnDiagSnapshot,
  maybeLogObstacleRowGeneration,
  maybeLogPlayerActiveObstacleRowTemplate,
} from '@/Game/path/obstacleRowGenDiag';
import { smilyLevelJson } from '@/Game/templates/obstacles/smily';
import { jellyfishLevelJson } from '@/Game/templates/obstacles/jellyfish';
import { mickyLevelJson } from '@/Game/templates/obstacles/micky';
import { kittyLevelJson } from '@/Game/templates/obstacles/kitty';
import { deadpoolLevelJson } from '@/Game/templates/obstacles/deadpool';
import { megamanLevelJson } from '@/Game/templates/obstacles/megaman';

const OBSTACLE_BLOCK_IMAGES = ['block2', 'block3'] as const;

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

function pickBlockImageStable(x: number, y: number): string {
  'worklet';
  const idx = intMod(
    mixU32(Math.round(x * 1000), Math.round(y * 1000), 713),
    OBSTACLE_BLOCK_IMAGES.length
  );
  return OBSTACLE_BLOCK_IMAGES[idx];
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
    spawnDiag,
  } = args;

  const containerWidth = rowLength * obstacleDimension.width;
  const rowCenterX = leftX + containerWidth / 2;

  const renderLayers = buildObstacleRowRenderLayers({
    gaps,
    rowLength,
    leftX,
    blockWidth: obstacleDimension.width,
    blockHeight: obstacleDimension.height,
    rowCenterX,
    rowY: y,
    pickImage: pickBlockImageStable,
  });

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
    ...spawnDiag,
  });

  const renderComponent = createRenderComponent({
    shape: {
      type: ShapeTypes.Rectangle,
      width: containerWidth,
      height: obstacleDimension.height,
    },
    position: { x: rowCenterX, y },
    renderLayers,
    visible: true,
    zIndex: 2,
  });

  ecs.addComponent(rowEntity, obstacleRowComp);
  ecs.addComponent(rowEntity, renderComponent);

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
  const cycle = getPacingCycleState(tr);
  if (tr <= 0 || cycle.rowInCycle !== 0 || cycle.cycleStartTotalRows !== tr) {
    return;
  }
  ecs.updateComponent<TemplateContextComponentData>(
    templateCtxEntity,
    TemplateContextComponentName,
    (data) => {
      const c = data.ctx as Record<string, unknown>;
      c.pathRunId = randomU32();
    }
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
  return pacingPhaseToMacroPhase(pacingPhaseAtTotalRows(tr));
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
  columnWidth: number;
  /** Same basis as `proceduralStreamSalt` for this spawn — rows generated before the new band row. */
  runwayDupRowsBasisRows: number;
}): Entity {
  'worklet';
  const dupCount = gapShiftRunwayDupRowsFromTotalRows(
    args.runwayDupRowsBasisRows,
    mixU32(args.runwayDupRowsBasisRows >>> 0, args.rowIndexForDiag, 0x72756e77)
  );
  if (dupCount <= 0) return args.newRowEntity;
  if (!args.prevRowBeforeNew) return args.newRowEntity;
  if (gapsEqual(args.prevRowBeforeNew.gaps, args.newRowData.gaps)) {
    return args.newRowEntity;
  }

  const obstacleDimension = {
    width: args.columnWidth,
    height: args.columnWidth,
  };
  const gapsToRepeat = args.newRowData.gaps.slice();
  let lastEntity = args.newRowEntity;
  let lastY = args.newRowData.y;

  for (let d = 0; d < dupCount; d++) {
    const y = lastY - obstacleDimension.height;
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
    tctx.flowMode = undefined;
    tctx.flowChuteRowCount = undefined;
    tctx.flowChuteRowsTarget = undefined;
    tctx.chicaneState = undefined;
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

    if (tctx.flowMode === 'chicane' && tctx.chicaneState) {
      const st = tctx.chicaneState as ChicaneState;
      const { row, state } = flowChicaneNextRow(
        lastSw,
        st,
        rowLength,
        CHICANE_DEFAULT_BLOCK_N
      );
      tctx.chicaneState = state;
      gaps = gapsFromRow(row);
    } else {
      if (tctx.flowChuteRowsTarget === undefined) {
        const pacingSnap = getPacingCycleState(stream);
        tctx.flowChuteRowsTarget = pathSegmentFlowChuteRowsBeforeChicane(
          stream,
          mixU32(pathRunId >>> 0, stream >>> 0, 0x666c6f77),
          pacingSnap.flowRows
        );
      }
      const chuteRow = flowChuteNextRow(lastSw, rowLength);
      gaps = gapsFromRow(chuteRow);
      const n = ((tctx.flowChuteRowCount as number) ?? 0) + 1;
      tctx.flowChuteRowCount = n;
      const chuteCap = (tctx.flowChuteRowsTarget as number) ?? 20;
      if (n >= chuteCap) {
        tctx.flowMode = 'chicane';
        tctx.chicaneState = createChicaneStateFromEntryCenter(
          extractTripleGapCenter(chuteRow, rowLength) ?? Math.floor(rowLength / 2),
          rowLength
        );
      }
    }
  }
  gaps = finalizeGapsForObstacleRow(prevRow?.gaps, gaps, rowLength);
  const y = !prevRow ? initialY : prevRow.y - obstacleDimension.height;
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
  const pacingSnap = getPacingCycleState(stream);

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
  }
  if (macroPhase !== 'release') {
    xctx.releaseRestZoneRowsEmitted = undefined;
    xctx.releaseRestZoneTargetRows = undefined;
  }

  let gaps: number[];

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
          } else {
            xctx.climaxStage = 'falseWall';
            xctx.climaxFalseSubRow = 0;
            xctx.climaxFalseWallTotalRows = pathSegmentClimaxFalseWallTotalRows(
              stream,
              mixU32(pathRunId >>> 0, stream >>> 0, 0x666c7733),
              pacingSnap.climaxRows,
              pinCap
            );
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
  const y = !prevRow ? initialY : prevRow.y - obstacleDimension.height;
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
  const y = !prevRow ? initialY : prevRow.y - obstacleDimension.height;
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

const MappedTemplates: Record<string, RowPathTemplate> = {
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

  const nextRunId = randomU32();
  const ctx: TemplateCtx = template.createCtx ? template.createCtx() : {};
  (ctx as Record<string, unknown>).pathRunId = nextRunId;

  if (template.init) {
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

    const sceneEntity = findSceneEntityByKey(components, managerData.sceneKey);

    const deltaY = isStartReadyPhase ? 0 : waterData.raisingSpeed * deltaSeconds;

    if (typeof sceneEntity !== 'number') return;

    const maxY = containerTop + containerData.height * 0.3; // 30% from top

    const leftX = containerData.centerX -
      containerData.width / 2
    const columnWidth = getObstacleWidth(containerData.width);
    const rowStore = components[ObstacleRowComponentName];
    if (!rowStore) {
      return;
    }
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
    const trForPacing = managerData.totalRowsGenerated ?? 0;
    const inReleaseRestZone =
      pacingPhaseToMacroPhase(pacingPhaseAtTotalRows(trForPacing)) === 'release';

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

    // Seed initial obstacles when none exist (either during initial phase or when starting with water at center)
    const shouldSeedInitialObstacles = rowStore.count() === 0;

    if (shouldSeedInitialObstacles) {
      let lastRowEntity: Entity | null = null
      const initArgs: TemplateInitArgs = {
        ecs,
        sceneEntity,
        rowLength: LAYOUT_CONSTANTS.COLUMNS,
        leftX,
        obstacleDimension: {
          width: columnWidth,
          height: columnWidth,
        },
        initialY: maxY,
      };

      const initialTemplateName = lock ?? 'directed';

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

      const rowsInDisplay = Math.ceil((maxY - columnWidth) / columnWidth) + 1

      for (let i = 0; i < rowsInDisplay; i++) {
        const prevRow = lastRowEntity ? ecs.components[ObstacleRowComponentName].get(lastRowEntity) as ObstacleRowComponentData : null

        // If we've reached the end of the active template, switch to the next template
        // and continue filling the seed rows.
        if (activeRowIndex > activeRowCount - 1) {
          const newTemplateName = lock ?? 'directed';
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
          obstacleDimension: {
            width: columnWidth,
            height: columnWidth,
          },
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
          columnWidth,
          runwayDupRowsBasisRows: proceduralStreamSalt,
        });
        bumpTotalRowsGenerated(ecs, managerEntity);
        bumpPathRunIdAfterCompletedMacroCycle(ecs, components, managerEntity, activeCtxEntity);
        maybeLogObstacleRowGeneration(ecs, components, managerEntity, {
          templateName: activeTemplateName,
          macroPhase: macroForRow,
          templateCtx: activeCtx as Record<string, unknown>,
          rowIndex: spawnedRowIndex,
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
    } else if (!isInInitialPhase && !isStartReadyPhase) {
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
          const newTemplateName = lock ?? 'directed';
          const initArgs: TemplateInitArgs = {
            ecs,
            sceneEntity,
            rowLength: LAYOUT_CONSTANTS.COLUMNS,
            leftX,
            obstacleDimension: {
              width: columnWidth,
              height: columnWidth,
            },
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
            obstacleDimension: {
              width: columnWidth,
              height: columnWidth,
            },
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
            columnWidth,
            runwayDupRowsBasisRows: proceduralStreamSalt,
          });
          bumpTotalRowsGenerated(ecs, managerEntity);
          bumpPathRunIdAfterCompletedMacroCycle(ecs, components, managerEntity, selected.ctxEntity);
          maybeLogObstacleRowGeneration(ecs, components, managerEntity, {
            templateName: newTemplateName,
            macroPhase: macroForRow,
            templateCtx: selected.ctx as Record<string, unknown>,
            rowIndex: 0,
          });
          // Reset timer after re-seeding
          ecs.updateComponent<ObstaclesManagerComponentData>(
            managerEntity,
            ObstaclesManagerComponentName,
            (m) => {
              m.templateInfo = {
                currentTemplateName: newTemplateName,
                currentTempalteTotalRow: newRowCount,
                currentRowIndex: 0,
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
            obstacleDimension: {
              width: columnWidth,
              height: columnWidth,
            },
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
            columnWidth,
            runwayDupRowsBasisRows: proceduralStreamSalt,
          });

          bumpTotalRowsGenerated(ecs, managerEntity);
          bumpPathRunIdAfterCompletedMacroCycle(ecs, components, managerEntity, ctxEntity);
          maybeLogObstacleRowGeneration(ecs, components, managerEntity, {
            templateName: templateInfo.currentTemplateName,
            macroPhase: macroForRow,
            templateCtx: ctx as Record<string, unknown>,
            rowIndex: lastRowIndex,
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
