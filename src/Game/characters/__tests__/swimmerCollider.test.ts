import { getSwimmerColliderExtents } from '../swimmerCollider';
import { swimmerVisualTuning } from '@/config/swimmerVisualTuning';

describe('getSwimmerColliderExtents', () => {
  const columnWidth = 45;
  const baseWidth = columnWidth * swimmerVisualTuning.VISUAL_WIDTH_COLUMN_RATIO;
  const baseHeight =
    baseWidth * swimmerVisualTuning.VISUAL_HEIGHT_TO_WIDTH_RATIO;

  it('matches the scaled visual body for navigation', () => {
    const nav = getSwimmerColliderExtents({
      baseWidth,
      baseHeight,
      meshScaleX: 0.92,
      meshScaleY: 1.08,
      columnWidth,
      ceilingContact: false,
    });
    expect(nav.halfWidth * 2).toBeCloseTo(baseWidth * 0.92, 4);
    expect(nav.halfHeight * 2).toBeCloseTo(baseHeight * 1.08, 4);
  });

  it('uses full base body size when mesh scale is unset', () => {
    const nav = getSwimmerColliderExtents({
      baseWidth,
      baseHeight,
      columnWidth,
      ceilingContact: false,
    });
    expect(nav.halfWidth * 2).toBeCloseTo(baseWidth, 4);
    expect(nav.halfHeight * 2).toBeCloseTo(baseHeight, 4);
  });

  it('uses fair pinned floor when the body is visually squished', () => {
    const squishedNav = getSwimmerColliderExtents({
      baseWidth,
      baseHeight,
      meshScaleX: 0.8,
      meshScaleY: 0.65,
      columnWidth,
      ceilingContact: false,
    });
    const pinned = getSwimmerColliderExtents({
      baseWidth,
      baseHeight,
      meshScaleX: 0.8,
      meshScaleY: 0.65,
      columnWidth,
      ceilingContact: true,
    });
    const pinnedFairHeight =
      columnWidth *
      swimmerVisualTuning.PINNED_COLLIDER_WIDTH_COLUMN_RATIO *
      swimmerVisualTuning.PINNED_COLLIDER_HEIGHT_TO_WIDTH_RATIO;
    expect(pinned.halfHeight * 2).toBeCloseTo(pinnedFairHeight, 4);
    expect(pinned.halfHeight).toBeGreaterThan(squishedNav.halfHeight);
  });
});
