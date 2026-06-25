import { swimmerVisualTuning } from '@/config/swimmerVisualTuning';

export type SwimmerColliderExtents = {
  halfWidth: number;
  halfHeight: number;
};

/**
 * Gameplay collider extents — always upright, never tied to visual squash.
 *
 * Navigation: narrow width for one-column gaps, full fair height for ceiling contact.
 * Ceiling/pinned: same fair height (never shrink when visually squished).
 */
export const getSwimmerColliderExtents = (
  columnWidth: number,
  ceilingContact: boolean
): SwimmerColliderExtents => {
  'worklet';
  const width =
    columnWidth *
    (ceilingContact
      ? swimmerVisualTuning.PINNED_COLLIDER_WIDTH_COLUMN_RATIO
      : swimmerVisualTuning.COLLIDER_WIDTH_COLUMN_RATIO);
  const heightToWidth = ceilingContact
    ? swimmerVisualTuning.PINNED_COLLIDER_HEIGHT_TO_WIDTH_RATIO
    : swimmerVisualTuning.COLLIDER_HEIGHT_TO_WIDTH_RATIO;
  const height = width * heightToWidth;
  return {
    halfWidth: width / 2,
    halfHeight: height / 2,
  };
};
