import {
  computeFoamContactLocalY,
  getFlatWaterBodyTopY,
} from '@/Game/water/flatWaterSurface';

describe('flatWaterSurface', () => {
  it('getFlatWaterBodyTopY returns container waterSurfaceY (not shader wave)', () => {
    expect(
      getFlatWaterBodyTopY({
        centerX: 200,
        centerY: 400,
        width: 300,
        height: 800,
        waterSurfaceY: 520,
        waterRiseSpeed: 200,
      })
    ).toBe(520);
  });

  it('computeFoamContactLocalY is row-local with below-surface offset', () => {
    expect(computeFoamContactLocalY(520, 500, 7)).toBe(27);
  });
});
