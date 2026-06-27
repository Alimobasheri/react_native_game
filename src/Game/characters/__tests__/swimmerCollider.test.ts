import { getSwimmerColliderExtents } from '../swimmerCollider';
import { swimmerVisualTuning } from '@/config/swimmerVisualTuning';

describe('getSwimmerColliderExtents', () => {
  const columnWidth = 45;

  it('uses fair navigation bounds decoupled from visual mesh', () => {
    const nav = getSwimmerColliderExtents(columnWidth, false);
    const expectedWidth =
      columnWidth * swimmerVisualTuning.COLLIDER_WIDTH_COLUMN_RATIO;
    const expectedHeight =
      expectedWidth * swimmerVisualTuning.COLLIDER_HEIGHT_TO_WIDTH_RATIO;
    expect(nav.halfWidth * 2).toBeCloseTo(expectedWidth, 4);
    expect(nav.halfHeight * 2).toBeCloseTo(expectedHeight, 4);
  });

  it('uses a taller fair height only while pinned', () => {
    const nav = getSwimmerColliderExtents(columnWidth, false);
    const pinned = getSwimmerColliderExtents(columnWidth, true);
    expect(pinned.halfHeight).toBeGreaterThan(nav.halfHeight);
  });
});
