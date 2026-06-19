import { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import { ObstacleRowComponentData } from '@/Game/ecs-components/ObstacleRowComponent';
import { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import { RowPathTemplate, TemplateCtx } from '@/Game/ecs-systems/obstacleSystem';
import { buildSpawnDiagSnapshot } from '@/Game/path/obstacleRowGenDiag';
import type { MacroPhase } from '@/Game/path/macroPacing';

export type JsonLevelRow = {
  /** Blocked columns (stone blocks). */
  blocks: number[];
  /** Optional open columns (no blocks). If omitted, it will be derived from `blocks`. */
  gaps?: number[];
};

export type JsonLevel = {
  columns: number;
  rows: JsonLevelRow[];
};

type JsonTemplateCtx = TemplateCtx & {
  level?: JsonLevel;
};

const normalizeUniqueInts = (values: number[], min: number, max: number) => {
  'worklet';
  const clamped = values
    .map((v) => Math.round(v))
    .filter((v) => Number.isFinite(v))
    .map((v) => Math.max(min, Math.min(max, v)));
  return Array.from(new Set(clamped)).sort((a, b) => a - b);
};

export function createJsonLevelRowPathTemplate(args: {
  /**
   * JSON string to avoid capturing large objects inside worklets.
   * Must parse to `JsonLevel`.
   */
  levelJson: string;
  /**
   * Spawns a full obstacle row (ObstacleRow + grouped RenderComponent).
   * Provided by the system module (it knows render wiring).
   */
  spawnRow: (params: {
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
  }) => Entity;
  /** Must match `MappedTemplates` key (`smily`, …) for player-band dev logs. */
  diagTemplateName: string;
}): RowPathTemplate {
  const { levelJson, spawnRow, diagTemplateName } = args;

  return {
    createCtx: () => {
      'worklet';
      return {} as JsonTemplateCtx;
    },
    init: (ctx: TemplateCtx) => {
      'worklet';
      (ctx as JsonTemplateCtx).level = JSON.parse(levelJson) as JsonLevel;
    },
    getRowCount: (ctx: TemplateCtx) => {
      'worklet';
      const level = (ctx as JsonTemplateCtx).level;
      return level?.rows?.length ?? 0;
    },
    getRow: (_ctx, params) => {
      'worklet';
      const ctx = _ctx as JsonTemplateCtx;
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

      const level = ctx.level;
      const columns = level?.columns ?? rowLength;
      const rowDef = level?.rows?.[rowIndex];

      const y = !prevRow ? initialY : prevRow.y - obstacleDimension.height;

      const blocks = normalizeUniqueInts(
        rowDef?.blocks ?? [],
        0,
        Math.max(0, columns - 1)
      );
      const gaps = rowDef?.gaps
        ? normalizeUniqueInts(rowDef.gaps, 0, Math.max(0, columns - 1))
        : (() => {
          const blockSet = new Set(blocks);
          const g: number[] = [];
          for (let c = 0; c < columns; c++) if (!blockSet.has(c)) g.push(c);
          return g;
        })();

      return spawnRow({
        ecs,
        sceneEntity,
        y,
        gaps,
        rowLength: columns,
        leftX,
        obstacleDimension,
        prevRowEntity,
        spawnDiag: buildSpawnDiagSnapshot(
          diagTemplateName,
          (params.pacingMacroPhase ?? 'flow') as MacroPhase,
          _ctx as Record<string, unknown>,
          params.rowIndex
        ),
      });
    },
  };
}
