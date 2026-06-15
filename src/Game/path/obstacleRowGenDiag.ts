/**
 * Obstacle row generation diagnostics — all entry points are worklets (UI thread).
 */

import type { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';
import type { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import {
  ObstaclesManagerComponentName,
  type ObstaclesManagerComponentData,
} from '@/Game/ecs-components/ObstaclesManager';
import {
  ObstacleRowComponentName,
  type ObstacleRowComponentData,
} from '@/Game/ecs-components/ObstacleRowComponent';
import type { MacroPhase } from '@/Game/path/macroPacing';
import { RELEASE_REST_ZONE_ROWS } from '@/Game/path/releaseGenerators';
import { runOnJS } from 'react-native-reanimated';

const JSON_LEVEL_TEMPLATES = new Set([
  'smily',
  'jellyfish',
  'micky',
  'kitty',
  'deadpool',
  'megaman',
]);

/** Branch key for baseMulti / directed multipath phases (arrow avoids nested-declaration worklet issues). */
const buildBaseMultiBranchKey = (macro: MacroPhase, c: Record<string, unknown>): string => {
  'worklet';
  if (macro === 'tension') {
    const st = (c.tensionStage as string) ?? 'init';
    if (st === 'funnel') return 'baseMulti|tension|funnel';
    if (st === 'paradox') return 'baseMulti|tension|paradoxSplit';
    return 'baseMulti|tension|freeMultipath';
  }
  if (macro === 'climax') {
    const st = (c.climaxStage as string) ?? 'init';
    if (st === 'pinball') return 'baseMulti|climax|pinball';
    if (st === 'falseWall') return 'baseMulti|climax|falseWall';
    return 'baseMulti|climax|freeMultipath';
  }
  if (macro === 'release') {
    const em = (c.releaseRestZoneRowsEmitted as number) ?? 0;
    if (em > 0 && em <= RELEASE_REST_ZONE_ROWS) {
      return 'baseMulti|release|catharticRestZone';
    }
    return 'baseMulti|release|multipathFallback';
  }
  return `baseMulti|${macro}|multipathProc`;
};

export type ObstacleRowGenLogArgs = {
  templateName: string;
  /** Macro phase used for this row (read before totalRows bump). */
  macroPhase: MacroPhase;
  /** Template ctx after getRow (mutated in place for this spawn). */
  templateCtx: Record<string, unknown>;
  /**
   * Index passed into `getRow` for this template (0..N within the active template), **not** a world/screen row
   * and **not** where the player stands.
   */
  rowIndex: number;
};

/**
 * Stable-ish key for deduping logs: only changes when template, macro branch, or major generator changes.
 *
 * This is **not** the swimmer’s on-screen grid row. It is only used so `maybeLogObstacleRowGeneration`
 * prints at most once per generator branch (e.g. dozens of chicane rows → one `directed|flow|chicane` line).
 */
export function buildObstacleRowGenerationLogKey(
  templateName: string,
  macro: MacroPhase,
  c: Record<string, unknown>,
  rowIndex: number
): string {
  'worklet';
  if (JSON_LEVEL_TEMPLATES.has(templateName)) {
    return `${templateName}|jsonLevel`;
  }
  if (templateName === 'rest') {
    return 'rest|wideSeamRows';
  }
  if (templateName === 'baseMulti') {
    return buildBaseMultiBranchKey(macro, c);
  }
  if (templateName === 'base') {
    if (macro === 'flow') {
      if (c.flowMode === 'chicane') return 'base|flow|chicane';
      return 'base|flow|chute';
    }
    return `base|${macro}|singlePathProcedural`;
  }
  if (templateName === 'directed') {
    if (macro === 'flow') {
      /** `directed` uses multipath proc for FLOW (`baseMultiPathGetRow`); chute/chicane ctx is only for `base`. */
      return 'directed|flow|multipathProc';
    }
    if (macro === 'tension' || macro === 'climax' || macro === 'release') {
      return buildBaseMultiBranchKey(macro, c).replace(/^baseMulti/, 'directed');
    }
    return `directed|${macro}|singlePathProcedural`;
  }
  return `${templateName}|rowIndex=${rowIndex}`;
}

/** Snapshot stored on each obstacle row at spawn for player-band logging. */
export function buildSpawnDiagSnapshot(
  templateName: string,
  macro: MacroPhase,
  templateCtx: Record<string, unknown>,
  rowIndex: number
): Pick<ObstacleRowComponentData, 'spawnDiagTemplateName' | 'spawnDiagBranchKey'> {
  'worklet';
  return {
    spawnDiagTemplateName: templateName,
    spawnDiagBranchKey: buildObstacleRowGenerationLogKey(templateName, macro, templateCtx, rowIndex),
  };
}

function logObstacleRowGenToJS(line: string): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(line);
  }
}

/**
 * Logs at most once per distinct branch key when a row is spawned — **not** every spawn, and **not** tied to
 * player position. `totalSpawns` is `ObstaclesManager.totalRowsGenerated` after that spawn (monotonic counter).
 * Runs on the UI worklet runtime.
 */
export function maybeLogObstacleRowGeneration(
  ecs: ECS,
  components: Record<string, { get: (e: Entity) => unknown }>,
  managerEntity: Entity,
  args: ObstacleRowGenLogArgs
): void {
  'worklet';
  const key = buildObstacleRowGenerationLogKey(
    args.templateName,
    args.macroPhase,
    args.templateCtx,
    args.rowIndex
  );
  const cur = components[ObstaclesManagerComponentName]?.get(managerEntity) as
    | ObstaclesManagerComponentData
    | undefined;
  if (cur?.lastObstacleRowGenLogKey === key) {
    return;
  }
  const totalSpawns = cur?.totalRowsGenerated ?? 0;
  const line = `[ObstacleRowGen] branch=${key} | totalSpawns=${totalSpawns} | templateRowIndex=${args.rowIndex} | note=oncePerBranchKey_notPlayerRow`;
  ecs.updateComponent<ObstaclesManagerComponentData>(
    managerEntity,
    ObstaclesManagerComponentName,
    (m) => {
      m.lastObstacleRowGenLogKey = key;
    }
  );
  runOnJS(logObstacleRowGenToJS)(line);
}

function logPlayerBandToJS(line: string): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(line);
  }
}

/**
 * When `Water.centerRowEntity` changes, log the template/branch stamped on **that** row —
 * the band the player is crossing — not the template that just spawned at the top.
 */
export function maybeLogPlayerActiveObstacleRowTemplate(
  ecs: ECS,
  components: Record<string, { get: (e: Entity) => unknown }>,
  managerEntity: Entity,
  centerRowEntity: Entity | undefined
): void {
  'worklet';
  if (typeof __DEV__ === 'undefined' || !__DEV__) {
    return;
  }
  const cur = components[ObstaclesManagerComponentName]?.get(managerEntity) as
    | ObstaclesManagerComponentData
    | undefined;
  const prev = cur?.lastPlayerDiagCenterRowEntity;
  if (prev === centerRowEntity) {
    return;
  }
  ecs.updateComponent<ObstaclesManagerComponentData>(
    managerEntity,
    ObstaclesManagerComponentName,
    (m) => {
      m.lastPlayerDiagCenterRowEntity = centerRowEntity ?? null;
    }
  );
  if (typeof centerRowEntity !== 'number') {
    runOnJS(logPlayerBandToJS)('[ObstacleRowGen] playerBand=noActiveRow');
    return;
  }
  const row = components[ObstacleRowComponentName]?.get(centerRowEntity) as
    | ObstacleRowComponentData
    | undefined;
  const tName = row?.spawnDiagTemplateName ?? '?';
  const branch = row?.spawnDiagBranchKey ?? 'unknown';
  runOnJS(logPlayerBandToJS)(
    `[ObstacleRowGen] playerBand template=${tName} branch=${branch} centerRowEntity=${centerRowEntity} note=diagOnWaterCenterRow_notNecessarilyBlockerRow`
  );
}
