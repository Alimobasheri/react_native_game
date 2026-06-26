import { swimmerVisualTuning } from '@/config/swimmerVisualTuning';

export type SwimmerColliderExtents = {
  halfWidth: number;
  halfHeight: number;
};

export type SwimmerColliderInput = {
  /** Render mesh base width (`meshBaseWidth`). */
  baseWidth: number;
  /** Render mesh base height (`meshBaseHeight`). */
  baseHeight: number;
  /** Current procedural mesh scale X from locomotion. */
  meshScaleX?: number;
  /** Current procedural mesh scale Y from locomotion. */
  meshScaleY?: number;
  /** Grid column width — used for pinned ceiling-contact bounds. */
  columnWidth: number;
  /** When true, use fair pinned bounds instead of the live body silhouette. */
  ceilingContact: boolean;
};

/**
 * Gameplay collider extents.
 *
 * Navigation: matches the rendered body rectangle (base mesh × current scale).
 * Pinned: taller fair ceiling-contact box — never tied to visual squash.
 */
export const getSwimmerColliderExtents = (
  input: SwimmerColliderInput
): SwimmerColliderExtents => {
  'worklet';
  if (input.ceilingContact) {
    const pinnedWidth =
      input.columnWidth *
      swimmerVisualTuning.PINNED_COLLIDER_WIDTH_COLUMN_RATIO;
    const pinnedHeight =
      pinnedWidth * swimmerVisualTuning.PINNED_COLLIDER_HEIGHT_TO_WIDTH_RATIO;
    const scaleX = input.meshScaleX ?? 1;
    const scaleY = input.meshScaleY ?? 1;
    const bodyWidth = input.baseWidth * scaleX;
    const bodyHeight = input.baseHeight * scaleY;
    return {
      halfWidth: Math.max(bodyWidth, pinnedWidth) / 2,
      halfHeight: Math.max(bodyHeight, pinnedHeight) / 2,
    };
  }

  const scaleX = input.meshScaleX ?? 1;
  const scaleY = input.meshScaleY ?? 1;
  const width = input.baseWidth * scaleX;
  const height = input.baseHeight * scaleY;
  return {
    halfWidth: width / 2,
    halfHeight: height / 2,
  };
};
