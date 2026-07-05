import { waterTransitionBandFromSurface } from '@/Game/grid/waterTransitionBand';

describe('waterTransitionBand', () => {
  it('transitionTargetY is 0.84 block heights above water surface', () => {
    const band = waterTransitionBandFromSurface(500, 60);
    expect(band.transitionTargetY).toBeCloseTo(500 - 60 * 0.84, 5);
    expect(band.lockAheadY).toBeCloseTo(500 - 60 * 0.42, 5);
  });

  it('transition band span is ordered start < target < end', () => {
    const band = waterTransitionBandFromSurface(400, 50);
    expect(band.transitionStartY).toBeLessThan(band.transitionTargetY);
    expect(band.transitionTargetY).toBeLessThan(band.transitionEndY);
  });
});
