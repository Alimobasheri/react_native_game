import type { ComponentStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/component';
import type { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import type { ObstacleRowComponentData } from '@/Game/ecs-components/ObstacleRowComponent';
import type { GridAnchor } from '@/Game/grid/types';
import type { WaterTransitionBand } from '@/Game/grid/waterTransitionBand';

/** Fractional beat index for worldY relative to a reference row on the grid. */
export const beatRowAtWorldY = (
  worldY: number,
  refRowY: number,
  refBeatRow: number,
  rowPitch: number
): number => {
  'worklet';
  const pitch = Math.max(0.001, rowPitch);
  return refBeatRow + (worldY - refRowY) / pitch;
};

export type AnchorRowRef = {
  entity: Entity;
  beatRow: number;
  y: number;
};

/**
 * Top of band on screen (smallest Y) — rowEnd side; last to reach water on scroll-down.
 */
export const leadingAnchorRow = (
  anchor: GridAnchor,
  rowStore: ComponentStore<ObstacleRowComponentData>
): AnchorRowRef | null => {
  'worklet';
  let best: AnchorRowRef | null = null;
  for (let i = 0; i < anchor.rowEntityIds.length; i++) {
    const ent = anchor.rowEntityIds[i];
    const row = rowStore.get(ent);
    if (!row || row.beatRowIndex == null) {
      continue;
    }
    if (!best || row.y < best.y) {
      best = { entity: ent, beatRow: row.beatRowIndex, y: row.y };
    }
  }
  return best;
};

/**
 * Bottom of band on screen (largest Y) — rowStart side; first row to reach water on scroll-down.
 */
export const trailingAnchorRow = (
  anchor: GridAnchor,
  rowStore: ComponentStore<ObstacleRowComponentData>
): AnchorRowRef | null => {
  'worklet';
  let best: AnchorRowRef | null = null;
  for (let i = 0; i < anchor.rowEntityIds.length; i++) {
    const ent = anchor.rowEntityIds[i];
    const row = rowStore.get(ent);
    if (!row || row.beatRowIndex == null) {
      continue;
    }
    if (!best || row.y > best.y) {
      best = { entity: ent, beatRow: row.beatRowIndex, y: row.y };
    }
  }
  return best;
};

const clamp01 = (t: number): number => {
  'worklet';
  return Math.max(0, Math.min(1, t));
};

/**
 * Beat progress at water transition — keys off trailing (water-first) band row.
 * Progress increases monotonically as rows scroll down (y increases).
 */
export const hazardBeatRowAtTransition = (
  anchor: GridAnchor,
  rowStore: ComponentStore<ObstacleRowComponentData>,
  band: WaterTransitionBand,
  blockHeight: number
): number => {
  'worklet';
  const trailing = trailingAnchorRow(anchor, rowStore);
  if (!trailing) {
    return -1;
  }
  const rowTop = trailing.y - blockHeight / 2;
  const span = Math.max(0.001, band.transitionEndY - band.transitionStartY);
  const progress = clamp01((rowTop - band.transitionStartY) / span);
  return trailing.beatRow + progress;
};
