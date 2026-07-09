import { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import { ObstacleRowComponentData } from '@/Game/ecs-components/ObstacleRowComponent';
import { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import {
  RowPathTemplate,
  TemplateCtx,
  TemplateInitArgs,
} from '@/Game/ecs-systems/obstacleSystem';
import { buildSpawnDiagSnapshot } from '@/Game/path/obstacleRowGenDiag';
import type { MacroPhase } from '@/Game/path/macroPacing';
import { getNextObstacleRowY } from '@/assets/swimmerBlocks';
import { composeShaftRecipe, type ShaftRecipeId } from '@/Game/path/platformShaft/composeShaftRecipe';
import type { RecipeOutput } from '@/Game/path/platformShaft/types';

export type PlatformShaftSpawnRowArgs = {
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
};

export type PlatformShaftTemplateCtx = TemplateCtx & {
  /** Composed segment — hazards consumed by mergeRowHazardPass on ObstacleRow band leads. */
  beat?: RecipeOutput;
  platformShaftRecipe?: string;
  platformShaftSeed?: number;
  platformShaftDifficulty?: number;
  columns?: number;
  /** Hazard ids already spawned this segment. */
  spawnedHazardIds?: string[];
  /** Monotonic segment id — disambiguates beatRowIndex on loop overlap. */
  shaftSegmentEpoch?: number;
};

export function createPlatformShaftRowPathTemplate(args: {
  spawnRow: (params: PlatformShaftSpawnRowArgs) => Entity;
  diagTemplateName: string;
}): RowPathTemplate {
  const { spawnRow, diagTemplateName } = args;

  return {
    createCtx: () => {
      'worklet';
      return {} as PlatformShaftTemplateCtx;
    },
    init: (ctx: TemplateCtx, _initArgs: TemplateInitArgs) => {
      'worklet';
      const xctx = ctx as PlatformShaftTemplateCtx;
      const recipe = (xctx.platformShaftRecipe ?? 'composePressIntroShaft') as ShaftRecipeId;
      const seed = xctx.platformShaftSeed ?? 42;
      const difficulty01 = xctx.platformShaftDifficulty ?? 0.4;
      const columns = xctx.columns ?? 6;
      xctx.beat = composeShaftRecipe(recipe, {
        seed,
        difficulty01,
        columns,
        startGlobalRow: 0,
      });
      xctx.spawnedHazardIds = [];
    },
    getRowCount: (ctx: TemplateCtx) => {
      'worklet';
      const beat = (ctx as PlatformShaftTemplateCtx).beat;
      return beat?.rows?.length ?? 0;
    },
    getRow: (_ctx, params) => {
      'worklet';
      const ctx = _ctx as PlatformShaftTemplateCtx;
      const {
        rowIndex,
        ecs,
        sceneEntity,
        prevRow,
        prevRowEntity,
        initialY,
        leftX,
        obstacleDimension,
        rowLength,
      } = params;

      const beat = ctx.beat;
      const columns = ctx.columns ?? rowLength;
      const rowDef = beat?.rows?.[rowIndex];
      /** Rest corridor geometry only — press motion + steel render on HazardBandLead row. */
      const gaps = rowDef?.gaps?.slice() ?? [];

      const y = !prevRow
        ? initialY
        : getNextObstacleRowY(prevRow.y, obstacleDimension.height);

      return spawnRow({
        ecs,
        sceneEntity,
        y,
        gaps,
        rowLength: columns,
        leftX,
        obstacleDimension,
        prevRowEntity,
        beatRowIndex: rowIndex,
        shaftSegmentEpoch: ctx.shaftSegmentEpoch,
        spawnDiag: buildSpawnDiagSnapshot(
          diagTemplateName,
          (rowDef?.macroPhase ?? params.pacingMacroPhase ?? 'flow') as MacroPhase,
          _ctx as Record<string, unknown>,
          params.rowIndex
        ),
      });
    },
  };
}
