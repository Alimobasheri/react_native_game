import { getSwimmerColliderExtents } from '../swimmerCollider';
import { swimmerVisualTuning } from '@/config/swimmerVisualTuning';

describe('getSwimmerColliderExtents', () => {
  const columnWidth = 45;

  it('uses a compact height for navigation', () => {
    const nav = getSwimmerColliderExtents(columnWidth, false);
    const expectedHeight =
      columnWidth *
      swimmerVisualTuning.COLLIDER_WIDTH_COLUMN_RATIO *
      swimmerVisualTuning.COLLIDER_HEIGHT_TO_WIDTH_RATIO;
    expect(nav.halfHeight * 2).toBeCloseTo(expectedHeight, 4);
    expect(nav.halfHeight).toBeLessThan(columnWidth * 0.55);
  });

  it('uses a taller fair height only while pinned', () => {
    const nav = getSwimmerColliderExtents(columnWidth, false);
    const pinned = getSwimmerColliderExtents(columnWidth, true);
    expect(pinned.halfHeight).toBeGreaterThan(nav.halfHeight);
  });
});
