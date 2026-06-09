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
  getObstacleWidth,
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
import { RowPathTemplate, TemplateCtx, TemplateInitArgs, type GetRowArgs } from '@/Game/ecs-systems/obstacleSystem';
import {
  getOrCreateTemplateContextEntity,
  TemplateContextComponentData,
  TemplateContextComponentName,
} from '@/Game/ecs-components/TemplateContextComponent';
import { createJsonLevelRowPathTemplate } from '@/Game/templates/obstacles/jsonLevelRowPathTemplate';
import { mixU32, intMod, mixPathRowStreamSalt } from '@/Game/path/deterministicMix';
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
  pacingPhaseAtTotalRows,
  pacingPhaseToMacroPhase,
} from '@/Game/path/pacingDirector';
import {
  RELEASE_REST_ZONE_ROWS,
  releaseCatharticRestZoneGaps,
} from '@/Game/path/releaseGenerators';
import type { MacroPhase } from '@/Game/path/macroPacing';
import {
  CHICANE_DEFAULT_BLOCK_N,
  FLOW_CHUTE_ROWS_BEFORE_CHICANE,
  type ChicaneState,
  createChicaneStateFromEntryCenter,
  extractTripleGapCenter,
  flowChicaneNextRow,
  flowChuteNextRow,
} from '@/Game/path/flowGenerators';
import {
  TENSION_FUNNEL_DURATION_ROWS,
  tensionFunnelRow,
  tensionGapCenterFromPrevGaps,
  tensionParadoxSplitRow,
} from '@/Game/path/tensionGenerators';
import {
  CLIMAX_FALSE_WALL_ROWS,
  CLIMAX_PINBALL_SEGMENT_ROWS,
  climaxFalseWallRow,
  climaxPinballInitialAnchor,
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

function rowSpawnDiagFromParams(
  ctx: TemplateCtx,
  params: GetRowArgs
): Pick<ObstacleRowComponentData, 'spawnDiagTemplateName' | 'spawnDiagBranchKey'> | Record<string, never> {
  'worklet';
  const name = params.spawnDiagTemplateName;
  if (!name) {
    return {};
  }
  const macro = params.pacingMacroPhase ?? 'flow';
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
    image: pickBlockImageStable(x, y),
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

/** Must match `pacingDirector` cycle length (FLOW+TENSION+CLIMAX+RELEASE). */
const PACING_MACRO_CYCLE_ROW_COUNT = 55;

/**
 * After each full macro cycle, bump `pathRunId` so multipath / proc rows don't repeat the same
 * deterministic stream forever while template ctx (chute, funnel, …) stays on one run.
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
  if (tr < PACING_MACRO_CYCLE_ROW_COUNT || tr % PACING_MACRO_CYCLE_ROW_COUNT !== 0) {
    return;
  }
  ecs.updateComponent<TemplateContextComponentData>(
    templateCtxEntity,
    TemplateContextComponentName,
    (data) => {
      const c = data.ctx as Record<string, unknown>;
      const cur = (c.pathRunId as number) ?? 0;
      c.pathRunId = cur + 1;
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
    tctx.chicaneState = undefined;
    gaps = generateGapsDeterministic(
      !prevRow ? [] : prevRow.gaps,
      rowLength,
      rowIndex,
      pathRunId,
      macroPhase,
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
      const chuteRow = flowChuteNextRow(lastSw, rowLength);
      gaps = gapsFromRow(chuteRow);
      const n = ((tctx.flowChuteRowCount as number) ?? 0) + 1;
      tctx.flowChuteRowCount = n;
      if (n >= FLOW_CHUTE_ROWS_BEFORE_CHICANE) {
        tctx.flowMode = 'chicane';
        tctx.chicaneState = createChicaneStateFromEntryCenter(
          extractTripleGapCenter(chuteRow, rowLength) ?? Math.floor(rowLength / 2),
          rowLength
        );
      }
    }
  }
  gaps = finalizeGapsForObstacleRow(prevRow?.gaps, gaps, rowLength);
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
    prevRowEntity,
    ...rowSpawnDiagFromParams(_ctx, params),
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
  const macroPhase = params.pacingMacroPhase ?? 'flow';
  const stream = params.proceduralStreamSalt ?? 0;
  const xctx = _ctx as Record<string, unknown>;

  if (macroPhase !== 'tension') {
    xctx.tensionStage = undefined;
    xctx.tensionFunnelStep = undefined;
    xctx.tensionCenter = undefined;
    xctx.tensionParadoxEmitted = undefined;
  }
  if (macroPhase !== 'climax') {
    xctx.climaxStage = undefined;
    xctx.climaxPinballRows = undefined;
    xctx.climaxPinballState = undefined;
    xctx.climaxFalseSubRow = undefined;
  }
  if (macroPhase !== 'release') {
    xctx.releaseRestZoneRowsEmitted = undefined;
  }

  let gaps: number[];

  if (macroPhase === 'tension') {
    if (!xctx.tensionStage) {
      xctx.tensionStage = 'funnel';
      xctx.tensionFunnelStep = 0;
      xctx.tensionCenter = tensionGapCenterFromPrevGaps(
        !prevRow ? [] : prevRow.gaps,
        rowLength
      );
      xctx.tensionParadoxEmitted = 0;
    }

    if (xctx.tensionStage === 'funnel') {
      const step = (xctx.tensionFunnelStep as number) ?? 0;
      const center = (xctx.tensionCenter as number) ?? Math.floor(rowLength / 2);
      const row = tensionFunnelRow(step, center, rowLength);
      gaps = gapsFromRow(row);
      xctx.tensionFunnelStep = step + 1;
      if ((xctx.tensionFunnelStep as number) >= TENSION_FUNNEL_DURATION_ROWS) {
        xctx.tensionStage = 'paradox';
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
      xctx.tensionStage = 'free';
    } else {
      gaps = generateMultiPathGapsDeterministic(
        !prevRow ? [] : prevRow.gaps,
        rowLength,
        rowIndex,
        pathRunId,
        macroPhase,
        stream
      );
    }

  } else if (macroPhase === 'climax') {
    if (!xctx.climaxStage) {
      xctx.climaxStage = 'pinball';
      xctx.climaxPinballRows = 0;
      xctx.climaxPinballState = {
        stepMod: 0,
        anchorLeft: climaxPinballInitialAnchor(!prevRow ? [] : prevRow.gaps, rowLength),
      };
    }

    if (xctx.climaxStage === 'pinball') {
      const rows = (xctx.climaxPinballRows as number) ?? 0;
      if (rows < CLIMAX_PINBALL_SEGMENT_ROWS) {
        const st = xctx.climaxPinballState as ClimaxPinballState;
        const { row, state } = climaxPinballStep(st, rowLength);
        xctx.climaxPinballState = state;
        xctx.climaxPinballRows = rows + 1;
        gaps = gapsFromRow(row);
        if (rows + 1 >= CLIMAX_PINBALL_SEGMENT_ROWS) {
          xctx.climaxStage = 'falseWall';
          xctx.climaxFalseSubRow = 0;
        }
      } else {
        gaps = generateMultiPathGapsDeterministic(
          !prevRow ? [] : prevRow.gaps,
          rowLength,
          rowIndex,
          pathRunId,
          macroPhase,
          stream
        );
      }
    } else if (xctx.climaxStage === 'falseWall') {
      const sub = (xctx.climaxFalseSubRow as number) ?? 0;
      const squeezeRight = (mixPathRowStreamSalt(pathRunId, rowIndex, stream, 902) & 1) === 1;
      const row = climaxFalseWallRow(sub, rowLength, squeezeRight);
      gaps = gapsFromRow(row);
      xctx.climaxFalseSubRow = sub + 1;
      if (sub + 1 >= CLIMAX_FALSE_WALL_ROWS) {
        xctx.climaxStage = 'free';
      }
    } else {
      gaps = generateMultiPathGapsDeterministic(
        !prevRow ? [] : prevRow.gaps,
        rowLength,
        rowIndex,
        pathRunId,
        macroPhase,
        stream
      );
    }

  } else if (macroPhase === 'release') {
    const emitted = (xctx.releaseRestZoneRowsEmitted as number) ?? 0;
    if (emitted < RELEASE_REST_ZONE_ROWS) {
      gaps = releaseCatharticRestZoneGaps(rowLength);
      xctx.releaseRestZoneRowsEmitted = emitted + 1;
    } else {
      gaps = generateMultiPathGapsDeterministic(
        !prevRow ? [] : prevRow.gaps,
        rowLength,
        rowIndex,
        pathRunId,
        macroPhase,
        stream
      );
    }
  } else {
    gaps = generateMultiPathGapsDeterministic(
      !prevRow ? [] : prevRow.gaps,
      rowLength,
      rowIndex,
      pathRunId,
      macroPhase,
      stream
    );
  }
  gaps = finalizeGapsForObstacleRow(prevRow?.gaps, gaps, rowLength);
  const y = !prevRow ? initialY : prevRow.y - obstacleDimension.height;
  const obstacleDatas = generateObstacles({
    rowIndex,
    gaps,
    y,
    rowLength,
    leftX,
    obstacleDimension,
  });
  const obstacleEntities: Entity[] = [];
  for (let i = 0; i < obstacleDatas.length; i++) {
    const entity = spawnObstacleEntity({
      ecs,
      sceneEntity,
      x: obstacleDatas[i].initialPosition.x,
      y: obstacleDatas[i].initialPosition.y,
      width: obstacleDatas[i].width,
      height: obstacleDatas[i].height,
    });
    if (entity !== null) obstacleEntities.push(entity);
  }
  const obstacleRowComp = createObstacleRowComponent({
    y,
    gaps,
    obstacles: obstacleEntities,
    prevRowEntity,
    ...rowSpawnDiagFromParams(_ctx, params),
  });
  const obstacleRowEntity = ecs.createEntity();
  ecs.addComponent(obstacleRowEntity, obstacleRowComp);
  ecs.updateComponent(sceneEntity, SceneComponentName, (scene: SceneComponentData) => {
    if (!scene.objects.entities.includes(obstacleRowEntity)) {
      scene.objects.entities.push(obstacleRowEntity);
    }
  });
  return obstacleRowEntity;
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


const restGetRow: RowPathTemplate['getRow'] = (_ctx, params) => {
  'worklet';
  const { ecs, prevRow, initialY, obstacleDimension, prevRowEntity, rowLength, sceneEntity } = params;
  const y = !prevRow ? initialY : prevRow.y - obstacleDimension.height;
  const interior: number[] = [];
  for (let c = 1; c < rowLength - 1; c++) {
    interior.push(c);
  }
  const prevGaps = !prevRow ? [] : prevRow.gaps ?? [];
  let gaps = unionMinimalSeam(prevGaps, interior.slice(), rowLength);
  gaps = finalizeGapsForObstacleRow(prevGaps, gaps, rowLength);
  const obstaclesIndexes = restGenerateObstacles({ ...params, y, gaps: [] });
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
    y,
    gaps,
    obstacles: obstacleEntities,
    prevRowEntity,
    ...rowSpawnDiagFromParams(_ctx, params),
  });
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

const spawnObstacleBlockFromTemplate = (params: {
  ecs: ECS;
  sceneEntity: number;
  x: number;
  y: number;
  width: number;
  height: number;
}): Entity | null => {
  'worklet';
  return spawnObstacleEntity(params);
};

const SmilyRowPathTemplate: RowPathTemplate = createJsonLevelRowPathTemplate({
  levelJson: smilyLevelJson,
  spawnBlock: spawnObstacleBlockFromTemplate,
  diagTemplateName: 'smily',
});

const JellyfishRowPathTemplate: RowPathTemplate = createJsonLevelRowPathTemplate({
  levelJson: jellyfishLevelJson,
  spawnBlock: spawnObstacleBlockFromTemplate,
  diagTemplateName: 'jellyfish',
});

const MickyRowPathTemplate: RowPathTemplate = createJsonLevelRowPathTemplate({
  levelJson: mickyLevelJson,
  spawnBlock: spawnObstacleBlockFromTemplate,
  diagTemplateName: 'micky',
});

const KittyRowPathTemplate: RowPathTemplate = createJsonLevelRowPathTemplate({
  levelJson: kittyLevelJson,
  spawnBlock: spawnObstacleBlockFromTemplate,
  diagTemplateName: 'kitty',
});

const DeadpoolRowPathTemplate: RowPathTemplate = createJsonLevelRowPathTemplate({
  levelJson: deadpoolLevelJson,
  spawnBlock: spawnObstacleBlockFromTemplate,
  diagTemplateName: 'deadpool',
});

const MegamanRowPathTemplate: RowPathTemplate = createJsonLevelRowPathTemplate({
  levelJson: megamanLevelJson,
  spawnBlock: spawnObstacleBlockFromTemplate,
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

  const existing = components[TemplateContextComponentName]?.get(
    ctxEntity
  ) as TemplateContextComponentData | undefined;

  const nextRunId = (existing?.runId ?? 0) + 1;
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
    // Heal broken prevRowEntity links after rows scroll off (removal does not patch pointers).
    const healRowEntities = ecs.getEntitiesWithComponents([ObstacleRowComponentName]);
    for (let hi = 0; hi < healRowEntities.length; hi++) {
      const rowEntity = healRowEntities[hi];
      const rowData = components[ObstacleRowComponentName].get(rowEntity) as
        | ObstacleRowComponentData
        | undefined;
      if (!rowData?.prevRowEntity) {
        continue;
      }
      const prevLive = components[ObstacleRowComponentName].get(rowData.prevRowEntity) as
        | ObstacleRowComponentData
        | undefined;
      if (prevLive) {
        continue;
      }
      let bestEnt: Entity | null = null;
      let bestDy = Number.POSITIVE_INFINITY;
      const y0 = rowData.y;
      for (let hj = 0; hj < healRowEntities.length; hj++) {
        const other = healRowEntities[hj];
        if (other === rowEntity) {
          continue;
        }
        const od = components[ObstacleRowComponentName].get(other) as ObstacleRowComponentData | undefined;
        if (!od) {
          continue;
        }
        const dy = od.y - y0;
        if (dy > 0 && dy < bestDy) {
          bestDy = dy;
          bestEnt = other;
        }
      }
      ecs.updateComponent<ObstacleRowComponentData>(rowEntity, ObstacleRowComponentName, (r) => {
        r.prevRowEntity = bestEnt;
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
    const shouldSeedInitialObstacles = obstacleRowEntities.length === 0;

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
