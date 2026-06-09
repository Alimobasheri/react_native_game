import { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import { createObstacleRowComponent } from '@/Game/ecs-components/ObstacleRowComponent';
import { SceneComponentData, SceneComponentName } from '@/containers/ReactNativeSkiaGameEngine/internal/components/scene';
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
   * Spawns a single obstacle block at the given column + y.
   * Provided by the system module (it knows physics/render wiring).
   */
  spawnBlock: (params: {
    ecs: ECS;
    sceneEntity: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }) => Entity | null;
  /** Must match `MappedTemplates` key (`smily`, …) for player-band dev logs. */
  diagTemplateName: string;
}): RowPathTemplate {
  const { levelJson, spawnBlock, diagTemplateName } = args;

  return {
    createCtx: () => {
      'worklet';
      return {} as JsonTemplateCtx;
    },
    init: (ctx: TemplateCtx) => {
      'worklet';
      // Parse inside the worklet to keep it "shareable" for Reanimated.
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
      } = params;

      const level = ctx.level;
      const columns = level?.columns ?? params.rowLength;
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

      const obstacleEntities: Entity[] = [];
      for (let i = 0; i < blocks.length; i++) {
        const col = blocks[i];
        const x = leftX + col * obstacleDimension.width + obstacleDimension.width / 2;
        const entity = spawnBlock({
          ecs,
          sceneEntity,
          x,
          y,
          width: obstacleDimension.width,
          height: obstacleDimension.height,
        });
        if (entity !== null) obstacleEntities.push(entity);
      }

      const obstacleRowComp = createObstacleRowComponent({
        y,
        gaps,
        obstacles: obstacleEntities,
        prevRowEntity,
        ...buildSpawnDiagSnapshot(
          diagTemplateName,
          (params.pacingMacroPhase ?? 'flow') as MacroPhase,
          _ctx as Record<string, unknown>,
          params.rowIndex
        ),
      });

      const obstacleRowEntity = ecs.createEntity();
      ecs.addComponent(obstacleRowEntity, obstacleRowComp);
      ecs.updateComponent(sceneEntity, SceneComponentName, (scene: SceneComponentData) => {
        if (!scene.objects.entities.includes(obstacleRowEntity)) {
          scene.objects.entities.push(obstacleRowEntity);
        }
      });

      return obstacleRowEntity;
    },
  };
}

