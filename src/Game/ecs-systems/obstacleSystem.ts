import { ECS } from "@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs"
import { Entity } from "@/containers/ReactNativeSkiaGameEngine/services-ecs/entity"
import { ObstacleRowComponentData } from "../ecs-components/ObstacleRowComponent"
import { ObstacleComponentData } from "../ecs-components/ObstacleComponent"
import type { MacroPhase } from "@/Game/path/macroPacing"

/**
 * Storybook / debug: keep `baseMulti` / `directed` procedural generation on one branch
 * (funnel, pinball, …) instead of advancing through the full tension → climax → release graph.
 */
export type StoryLockedProceduralSegment =
  | "funnel"
  | "paradoxSplit"
  | "tensionMultipath"
  | "pinball"
  | "falseWall"
  | "climaxMultipath"
  | "releaseRestZone"
  | "releaseMultipath"
  | "flowMultipath"

export interface GetRowArgs {
  rowIndex: number,
  ecs: ECS,
  sceneEntity: Entity,
  prevRow: ObstacleRowComponentData | null,
  prevRowEntity: Entity | null,
  initialY: number,
  rowLength: number,
  leftX: number,
  obstacleDimension: {
    width: number,
    height: number
  },
  /**
   * From `PacingDirector` / `pacingPhaseToMacroPhase` — procedural templates use this
   * each row; JSON/rest templates may ignore.
   */
  pacingMacroPhase?: MacroPhase,
  /**
   * Set by `ObstacleSystem` on every spawn: which template key produced this row, for
   * player-band diagnostics (`spawnDiagBranchKey` is derived from this + ctx + phase).
   */
  spawnDiagTemplateName?: string,
  /**
   * Rows already spawned before this one (read from `ObstaclesManager.totalRowsGenerated` before bump).
   * Mixed into procedural gap noise so the same macro phase / `pathRunId` does not replay identical multipath.
   * Also drives the gap difficulty ramp and procedural **segment row counts** (funnel, pinball, …);
   * tune in `src/config/gapDifficultyRamp.ts`.
   */
  proceduralStreamSalt?: number,
  /** When set, overrides pacing macro phase and loops one procedural branch (see type doc). */
  storyLockedProceduralSegment?: StoryLockedProceduralSegment,
}

export type TemplateCtx = Record<string, unknown> & {
  /** Random per-run seed set by ObstacleSystem / selectTemplate; mixed into row gap noise. */
  pathRunId?: number;
};

export interface TemplateInitArgs {
  ecs: ECS;
  sceneEntity: Entity;
  rowLength: number;
  leftX: number;
  obstacleDimension: {
    width: number;
    height: number;
  };
  initialY: number;
}

export interface RowPathTemplate {
  createCtx?: () => TemplateCtx;
  init?: (ctx: TemplateCtx, args: TemplateInitArgs) => void;
  getRowCount: (ctx: TemplateCtx) => number,
  getRow: (ctx: TemplateCtx, args: GetRowArgs) => Entity,
}